import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { ModuleRef } from '@nestjs/core';
import { Socket, Namespace } from 'socket.io';
import Redis from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from '../messages/messages.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  deviceId?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Namespace;

  private userSockets = new Map<string, Set<string>>();

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private messages: MessagesService,
    private redis: RedisService,
    private prisma: PrismaService,
    private moduleRef: ModuleRef,
  ) {
    this.setupRedisPubSub();
  }

  private setupRedisPubSub() {
    if (this.config.get('USE_EMBEDDED_REDIS') === 'true') return;

    const sub = this.redis.getSub() as Redis;
    sub.subscribe('socket:broadcast');
    sub.on('message', (_channel, message) => {
      try {
        const { event, room, data } = JSON.parse(message);
        if (room) {
          this.server.to(room).emit(event, data);
        } else {
          this.server.emit(event, data);
        }
      } catch (e) {
        console.error('Redis pub/sub error:', e);
      }
    });
  }

  private async broadcastViaRedis(event: string, room: string | null, data: unknown) {
    if (this.config.get('USE_EMBEDDED_REDIS') === 'true') return;

    await (this.redis.getPub() as Redis).publish(
      'socket:broadcast',
      JSON.stringify({ event, room, data }),
    );
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });

      client.userId = payload.sub;
      client.deviceId = payload.deviceId;
      const userId = client.userId!;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      await this.redis.setOnline(userId, client.id);
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
      });

      const memberships = await this.prisma.chatMember.findMany({
        where: { userId: client.userId, leftAt: null },
        select: { chatId: true },
      });

      for (const m of memberships) {
        client.join(`chat:${m.chatId}`);
      }

      client.join(`user:${client.userId}`);

      this.server.emit('user:online', { userId: client.userId, online: true });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.userId) return;

    const sockets = this.userSockets.get(client.userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(client.userId);
        try {
          await this.redis.setOffline(client.userId, client.id);
          await this.prisma.user.update({
            where: { id: client.userId },
            data: { lastSeenAt: new Date() },
          });
          this.server.emit('user:online', { userId: client.userId, online: false });
        } catch {
          // DB/Redis may be unavailable — don't crash the server on disconnect
        }
      }
    }
  }

  private joinUserToChat(userId: string, chatId: string) {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds) return;

    const sockets = this.server.sockets;
    for (const socketId of socketIds) {
      sockets.get(socketId)?.join(`chat:${chatId}`);
    }
  }

  private async deliverToChatMembers(
    chatId: string,
    event: string,
    data: unknown,
    excludeUserId?: string,
  ) {
    const members = await this.prisma.chatMember.findMany({
      where: { chatId, leftAt: null },
      select: { userId: true },
    });

    const room = `chat:${chatId}`;

    for (const member of members) {
      this.joinUserToChat(member.userId, chatId);
      if (member.userId !== excludeUserId) {
        this.server.to(`user:${member.userId}`).emit(event, data);
      }
    }

    this.server.to(room).emit(event, data);
    await this.broadcastViaRedis(event, room, data);
  }

  async publishMessage(chatId: string, message: unknown, excludeUserId?: string) {
    await this.deliverToChatMembers(chatId, 'message:new', message, excludeUserId);
  }

  @SubscribeMessage('chat:join')
  handleJoin(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { chatId: string }) {
    client.join(`chat:${data.chatId}`);
    return { joined: data.chatId };
  }

  @SubscribeMessage('message:send')
  async handleSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      chatId: string;
      content?: string;
      type?: string;
      replyToId?: string;
      mediaFileId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    if (!client.userId) return;

    const message = await this.messages.sendMessage(client.userId, {
      chatId: data.chatId,
      content: data.content,
      type: data.type as any,
      replyToId: data.replyToId,
      mediaFileId: data.mediaFileId,
      metadata: data.metadata,
    });

    client.join(`chat:${data.chatId}`);
    await this.deliverToChatMembers(data.chatId, 'message:new', message);
    client.emit('message:new', message);

    if (data.content?.trim() && !data.metadata?.fromTelegram) {
      void import('../telegram/telegram.service').then(async ({ TelegramService }) => {
        const telegram = this.moduleRef.get(TelegramService, { strict: false });
        await telegram?.sendOutbound(data.chatId, data.content!, client.userId!).catch(() => {});
      });
    }

    return message;
  }

  @SubscribeMessage('message:read')
  async handleRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; messageId?: string },
  ) {
    if (!client.userId) return;

    const result = await this.messages.markAsRead(data.chatId, client.userId, data.messageId);

    const payload = {
      chatId: data.chatId,
      userId: client.userId,
      messageIds: result.messageIds,
    };

    await this.broadcastViaRedis('message:read', `chat:${data.chatId}`, payload);
    this.server.to(`chat:${data.chatId}`).emit('message:read', payload);

    return result;
  }

  @SubscribeMessage('user:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ) {
    if (!client.userId) return;

    const profile = await this.prisma.profile.findUnique({ where: { userId: client.userId } });

    client.to(`chat:${data.chatId}`).emit('user:typing', {
      chatId: data.chatId,
      userId: client.userId,
      displayName: profile?.displayName,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('user:recording')
  async handleRecording(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; isRecording: boolean },
  ) {
    if (!client.userId) return;

    const profile = await this.prisma.profile.findUnique({ where: { userId: client.userId } });

    client.to(`chat:${data.chatId}`).emit('user:recording', {
      chatId: data.chatId,
      userId: client.userId,
      displayName: profile?.displayName,
      isRecording: data.isRecording,
    });
  }

  @SubscribeMessage('message:edit')
  async handleEdit(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; content: string },
  ) {
    if (!client.userId) return;

    const message = await this.messages.editMessage(data.messageId, client.userId, {
      content: data.content,
    });

    await this.broadcastViaRedis('message:edit', `chat:${message.chatId}`, message);
    this.server.to(`chat:${message.chatId}`).emit('message:edit', message);

    return message;
  }

  @SubscribeMessage('message:delete')
  async handleDelete(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; scope?: 'ME' | 'EVERYONE'; chatId: string },
  ) {
    if (!client.userId) return;

    const result = await this.messages.deleteMessage(data.messageId, client.userId, {
      scope: data.scope,
    });

    const payload = { messageId: data.messageId, scope: data.scope, userId: client.userId };

    if (data.scope === 'EVERYONE') {
      await this.broadcastViaRedis('message:delete', `chat:${data.chatId}`, payload);
      this.server.to(`chat:${data.chatId}`).emit('message:delete', payload);
    }

    return result;
  }

  @SubscribeMessage('message:react')
  async handleReact(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; emoji: string; chatId: string },
  ) {
    if (!client.userId) return;

    const result = await this.messages.reactToMessage(data.messageId, client.userId, {
      emoji: data.emoji,
    });

    const payload = { ...result, messageId: data.messageId, userId: client.userId };
    this.server.to(`chat:${data.chatId}`).emit('message:react', payload);

    return result;
  }
}
