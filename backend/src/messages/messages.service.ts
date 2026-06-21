import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MessageStatus, MessageType, ChatType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import {
  SendMessageDto,
  EditMessageDto,
  ReactMessageDto,
  ForwardMessageDto,
  DeleteMessageDto,
} from './dto/message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private media: MediaService,
  ) {}

  async getMessages(chatId: string, userId: string, cursor?: string, limit = 30) {
    await this.ensureMember(chatId, userId);

    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        deletedForAll: false,
        NOT: { deletedFor: { some: { userId } } },
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        sender: { include: { profile: true } },
        replyTo: { include: { sender: { include: { profile: true } } } },
        reactions: { include: { user: { include: { profile: true } } } },
        reads: true,
        mediaFiles: true,
        starredBy: { where: { userId } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const items = (hasMore ? messages.slice(0, limit) : messages).reverse();

    return {
      items: items.map((m) => this.formatMessage(m, userId)),
      nextCursor: hasMore ? messages[limit - 1]?.createdAt.toISOString() : null,
    };
  }

  async sendMessage(userId: string, dto: SendMessageDto) {
    await this.ensureMember(dto.chatId, userId);
    await this.ensureNotBlocked(dto.chatId, userId);

    if (dto.mediaFileId) {
      const media = await this.prisma.mediaFile.findFirst({
        where: { id: dto.mediaFileId, uploaderId: userId },
      });
      if (!media) throw new ForbiddenException('Invalid media file');
    }

    const message = await this.prisma.message.create({
      data: {
        chatId: dto.chatId,
        senderId: userId,
        content: dto.content,
        type: dto.type || MessageType.TEXT,
        replyToId: dto.replyToId,
        metadata: dto.metadata as any,
        status: MessageStatus.SENT,
        mediaFiles: dto.mediaFileId
          ? { connect: { id: dto.mediaFileId } }
          : undefined,
      },
      include: this.messageInclude(),
    });

    await this.prisma.chat.update({
      where: { id: dto.chatId },
      data: { updatedAt: new Date() },
    });

    if (dto.mediaFileId) {
      await this.prisma.mediaFile.updateMany({
        where: { id: dto.mediaFileId, messageId: null },
        data: { messageId: message.id },
      });
    }

    return this.formatMessage(message, userId);
  }

  async editMessage(messageId: string, userId: string, dto: EditMessageDto) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot edit this message');
    if (message.type !== MessageType.TEXT) throw new BadRequestException('Only text can be edited');

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content: dto.content, editedAt: new Date() },
      include: this.messageInclude(),
    });

    return this.formatMessage(updated, userId);
  }

  async deleteMessage(messageId: string, userId: string, dto: DeleteMessageDto) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    await this.ensureMember(message.chatId, userId);

    if (dto.scope === 'EVERYONE') {
      if (message.senderId !== userId) throw new ForbiddenException('Cannot delete for everyone');
      const hoursSinceSend = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSend > 48) {
        throw new BadRequestException('Can only delete for everyone within 48 hours');
      }
      await this.prisma.message.update({
        where: { id: messageId },
        data: { deletedForAll: true, deletedAt: new Date(), content: null },
      });
    } else {
      await this.prisma.deletedMessage.upsert({
        where: { messageId_userId: { messageId, userId } },
        create: { messageId, userId },
        update: {},
      });
    }

    return { deleted: true, scope: dto.scope || 'ME' };
  }

  async reactToMessage(messageId: string, userId: string, dto: ReactMessageDto) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    await this.ensureMember(message.chatId, userId);

    const existing = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji: dto.emoji } },
    });

    if (existing) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
      return { removed: true, emoji: dto.emoji };
    }

    await this.prisma.messageReaction.create({
      data: { messageId, userId, emoji: dto.emoji },
    });

    return { added: true, emoji: dto.emoji };
  }

  async forwardMessage(messageId: string, userId: string, dto: ForwardMessageDto) {
    const original = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { mediaFiles: true },
    });
    if (!original) throw new NotFoundException('Message not found');
    await this.ensureMember(original.chatId, userId);
    await this.ensureMember(dto.targetChatId, userId);

    const forwarded = await this.prisma.message.create({
      data: {
        chatId: dto.targetChatId,
        senderId: userId,
        type: original.type,
        content: original.content,
        forwardedFromId: messageId,
        metadata: original.metadata as any,
        mediaFiles: original.mediaFiles.length
          ? { connect: original.mediaFiles.map((f) => ({ id: f.id })) }
          : undefined,
      },
      include: this.messageInclude(),
    });

    return this.formatMessage(forwarded, userId);
  }

  async starMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    await this.ensureMember(message.chatId, userId);

    const existing = await this.prisma.starredMessage.findUnique({
      where: { messageId_userId: { messageId, userId } },
    });

    if (existing) {
      await this.prisma.starredMessage.delete({ where: { id: existing.id } });
      return { starred: false };
    }

    await this.prisma.starredMessage.create({ data: { messageId, userId } });
    return { starred: true };
  }

  async markAsRead(chatId: string, userId: string, messageId?: string) {
    await this.ensureMember(chatId, userId);

    let readThrough: Date | undefined;
    if (messageId) {
      const anchor = await this.prisma.message.findFirst({
        where: { id: messageId, chatId },
        select: { createdAt: true },
      });
      if (!anchor) throw new NotFoundException('Message not found');
      readThrough = anchor.createdAt;
    }

    const unreadMessages = await this.prisma.message.findMany({
      where: {
        chatId,
        senderId: { not: userId },
        NOT: { reads: { some: { userId } } },
        ...(readThrough ? { createdAt: { lte: readThrough } } : {}),
      },
      select: { id: true },
    });

    if (unreadMessages.length === 0) return { read: 0 };

    await this.prisma.messageRead.createMany({
      data: unreadMessages.map((m) => ({ messageId: m.id, userId })),
      skipDuplicates: true,
    });

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { type: true },
    });

    if (chat?.type === ChatType.PRIVATE) {
      await this.prisma.message.updateMany({
        where: { id: { in: unreadMessages.map((m) => m.id) } },
        data: { status: MessageStatus.READ },
      });
    }

    return { read: unreadMessages.length, messageIds: unreadMessages.map((m) => m.id) };
  }

  async markAsDelivered(chatId: string, userId: string, messageIds: string[]) {
    if (!messageIds.length) return { delivered: 0 };

    await this.ensureMember(chatId, userId);

    const eligible = await this.prisma.message.findMany({
      where: {
        id: { in: messageIds },
        chatId,
        senderId: { not: userId },
        status: MessageStatus.SENT,
      },
      select: { id: true },
    });

    if (eligible.length === 0) return { delivered: 0, messageIds: [] };

    const ids = eligible.map((m) => m.id);

    await this.prisma.message.updateMany({
      where: { id: { in: ids } },
      data: { status: MessageStatus.DELIVERED },
    });

    return { delivered: ids.length, messageIds: ids };
  }

  async searchMessages(userId: string, query: string, chatId?: string) {
    const memberChats = await this.prisma.chatMember.findMany({
      where: { userId, leftAt: null },
      select: { chatId: true },
    });

    const memberChatIds = new Set(memberChats.map((m) => m.chatId));
    const chatIds = chatId
      ? memberChatIds.has(chatId)
        ? [chatId]
        : []
      : memberChats.map((m) => m.chatId);

    if (chatIds.length === 0) return [];

    const messages = await this.prisma.message.findMany({
      where: {
        chatId: { in: chatIds },
        content: { contains: query, mode: 'insensitive' },
        deletedForAll: false,
      },
      include: {
        sender: { include: { profile: true } },
        chat: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return messages.map((m) => this.formatMessage(m, userId));
  }

  async getMessageInfo(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { include: { profile: true } },
        reads: { include: { user: { include: { profile: true } } } },
        reactions: { include: { user: { include: { profile: true } } } },
      },
    });
    if (!message) throw new NotFoundException('Message not found');
    await this.ensureMember(message.chatId, userId);

    return {
      id: message.id,
      chatId: message.chatId,
      content: message.content,
      type: message.type,
      status: message.status,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      sender: {
        id: message.sender.id,
        displayName: message.sender.profile?.displayName,
      },
      readBy: message.reads.map((r) => ({
        userId: r.userId,
        displayName: r.user.profile?.displayName,
        readAt: r.readAt,
      })),
      reactions: message.reactions.map((r) => ({
        emoji: r.emoji,
        userId: r.userId,
        displayName: r.user.profile?.displayName,
      })),
    };
  }

  async getStarredMessages(userId: string) {
    const starred = await this.prisma.starredMessage.findMany({
      where: { userId },
      include: {
        message: {
          include: {
            sender: { include: { profile: true } },
            chat: true,
            mediaFiles: true,
          },
        },
      },
      orderBy: { starredAt: 'desc' },
    });

    return starred.map((s) => ({
      ...this.formatMessage(s.message, userId),
      starredAt: s.starredAt,
    }));
  }

  private messageInclude() {
    return {
      sender: { include: { profile: true } },
      replyTo: { include: { sender: { include: { profile: true } } } },
      reactions: { include: { user: { include: { profile: true } } } },
      reads: true,
      mediaFiles: true,
      starredBy: true,
    };
  }

  private async ensureNotBlocked(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: { where: { leftAt: null } } },
    });
    if (!chat || chat.type !== ChatType.PRIVATE) return;

    const other = chat.members.find((m) => m.userId !== userId);
    if (!other) return;

    const blocked = await this.prisma.blockedUser.findFirst({
      where: {
        OR: [
          { userId, blockedUserId: other.userId },
          { userId: other.userId, blockedUserId: userId },
        ],
      },
    });
    if (blocked) throw new ForbiddenException('Cannot message this user');
  }

  private async ensureMember(chatId: string, userId: string) {
    const member = await this.prisma.chatMember.findFirst({
      where: { chatId, userId, leftAt: null },
    });
    if (!member) throw new ForbiddenException('Not a member of this chat');
  }

  formatMessage(message: any, userId: string) {
    return {
      id: message.id,
      chatId: message.chatId,
      type: message.type,
      content: message.content,
      status: message.status,
      editedAt: message.editedAt,
      createdAt: message.createdAt,
      metadata: message.metadata,
      sender: message.sender
        ? {
            id: message.sender.id,
            displayName: message.sender.profile?.displayName,
            avatarUrl: message.sender.profile?.avatarUrl,
          }
        : null,
      replyTo: message.replyTo
        ? {
            id: message.replyTo.id,
            content: message.replyTo.content,
            type: message.replyTo.type,
            sender: {
              displayName: message.replyTo.sender?.profile?.displayName,
            },
          }
        : null,
      reactions: message.reactions?.map((r: any) => ({
        emoji: r.emoji,
        userId: r.userId,
        displayName: r.user?.profile?.displayName,
      })),
      readBy: message.reads?.map((r: any) => ({ userId: r.userId, readAt: r.readAt })),
      mediaFiles: message.mediaFiles?.map((f: { url: string; thumbnailUrl?: string | null }) =>
        this.media.mapMediaFile(f),
      ),
      isStarred: message.starredBy?.length > 0,
      isOwn: message.senderId === userId,
    };
  }
}
