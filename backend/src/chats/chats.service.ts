import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ContactsService } from '../contacts/contacts.service';
import { CreatePrivateChatDto, CreateGroupChatDto, UpdateChatDto } from './dto/chat.dto';

@Injectable()
export class ChatsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private contacts: ContactsService,
  ) {}

  async getUserChats(userId: string, cursor?: string, limit = 20) {
    const chats = await this.prisma.chat.findMany({
      where: {
        members: { some: { userId, leftAt: null } },
        ...(cursor ? { updatedAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: { include: { profile: true } },
          },
        },
        telegramBridge: true,
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          where: { deletedForAll: false },
          include: {
            sender: { include: { profile: true } },
            reads: true,
          },
        },
        pinnedBy: { where: { userId } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = chats.length > limit;
    const items = hasMore ? chats.slice(0, limit) : chats;

    const unreadRows =
      items.length > 0
        ? await this.prisma.message.groupBy({
            by: ['chatId'],
            where: {
              chatId: { in: items.map((c) => c.id) },
              senderId: { not: userId },
              deletedForAll: false,
              NOT: { reads: { some: { userId } } },
            },
            _count: { id: true },
          })
        : [];

    const unreadByChat = Object.fromEntries(
      unreadRows.map((row) => [row.chatId, row._count.id]),
    );

    const participantIds = new Set<string>();
    items.forEach((chat) => {
      chat.members.forEach((m) => {
        if (m.userId !== userId) participantIds.add(m.userId);
      });
    });

    const onlineStatus = await this.redis.getOnlineUsers([...participantIds]);
    const contactMap = await this.contacts.getContactMap(userId);

    const visibleItems = items.filter((chat) => {
      if (chat.type !== 'PRIVATE' || chat.telegramBridge) return true;
      const other = chat.members.find((m) => m.userId !== userId);
      return !!other && !!contactMap[other.userId];
    });

    return {
      items: visibleItems.map((chat) =>
        this.formatChat(chat, userId, onlineStatus, unreadByChat[chat.id] || 0, contactMap),
      ),
      nextCursor: hasMore ? items[items.length - 1].updatedAt.toISOString() : null,
    };
  }

  async getChat(chatId: string, userId: string) {
    await this.ensureMember(chatId, userId);
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          where: { leftAt: null },
          include: { user: { include: { profile: true } } },
        },
        telegramBridge: true,
      },
    });
    if (!chat) throw new NotFoundException('Chat not found');

    const otherIds = chat.members.filter((m) => m.userId !== userId).map((m) => m.userId);
    const onlineStatus = await this.redis.getOnlineUsers(otherIds);
    const contactMap = await this.contacts.getContactMap(userId);

    return this.formatChat(chat, userId, onlineStatus, 0, contactMap);
  }

  async createPrivateChat(userId: string, dto: CreatePrivateChatDto) {
    if (userId === dto.participantId) {
      throw new BadRequestException('Cannot chat with yourself');
    }

    const existing = await this.prisma.chat.findFirst({
      where: {
        type: 'PRIVATE',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: dto.participantId } } },
        ],
      },
    });

    if (existing) return this.getChat(existing.id, userId);

    const chat = await this.prisma.chat.create({
      data: {
        type: 'PRIVATE',
        createdById: userId,
        members: {
          create: [{ userId }, { userId: dto.participantId }],
        },
      },
    });

    return this.getChat(chat.id, userId);
  }

  async createGroupChat(userId: string, dto: CreateGroupChatDto) {
    const memberIds = [...new Set([userId, ...dto.participantIds])];
    const chat = await this.prisma.chat.create({
      data: {
        type: 'GROUP',
        name: dto.name,
        createdById: userId,
        members: {
          create: memberIds.map((id) => ({ userId: id, role: id === userId ? 'admin' : 'member' })),
        },
      },
    });
    return this.getChat(chat.id, userId);
  }

  async updateChat(chatId: string, userId: string, dto: UpdateChatDto) {
    await this.ensureMember(chatId, userId);
    await this.prisma.chat.update({ where: { id: chatId }, data: dto });
    return this.getChat(chatId, userId);
  }

  async pinChat(chatId: string, userId: string) {
    await this.ensureMember(chatId, userId);
    await this.prisma.pinnedChat.upsert({
      where: { chatId_userId: { chatId, userId } },
      create: { chatId, userId },
      update: { pinnedAt: new Date() },
    });
    return { pinned: true };
  }

  async unpinChat(chatId: string, userId: string) {
    await this.prisma.pinnedChat.deleteMany({ where: { chatId, userId } });
    return { pinned: false };
  }

  async muteChat(chatId: string, userId: string, hours = 8) {
    await this.ensureMember(chatId, userId);
    const mutedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    await this.prisma.chatMember.updateMany({
      where: { chatId, userId, leftAt: null },
      data: { mutedUntil },
    });
    return { muted: true, mutedUntil };
  }

  async unmuteChat(chatId: string, userId: string) {
    await this.prisma.chatMember.updateMany({
      where: { chatId, userId, leftAt: null },
      data: { mutedUntil: null },
    });
    return { muted: false };
  }

  async archiveChat(chatId: string, userId: string) {
    await this.ensureMember(chatId, userId);
    await this.prisma.chatMember.updateMany({
      where: { chatId, userId, leftAt: null },
      data: { archivedAt: new Date() },
    });
    return { archived: true };
  }

  async unarchiveChat(chatId: string, userId: string) {
    await this.prisma.chatMember.updateMany({
      where: { chatId, userId, leftAt: null },
      data: { archivedAt: null },
    });
    return { archived: false };
  }

  async pinMessage(chatId: string, userId: string, messageId: string) {
    await this.ensureMember(chatId, userId);
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, chatId, deletedForAll: false },
    });
    if (!message) throw new NotFoundException('Message not found');
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { pinnedMessageId: messageId },
    });
    return { pinnedMessageId: messageId };
  }

  async unpinMessage(chatId: string, userId: string) {
    await this.ensureMember(chatId, userId);
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { pinnedMessageId: null },
    });
    return { pinnedMessageId: null };
  }

  async getChatMedia(chatId: string, userId: string, type?: string) {
    await this.ensureMember(chatId, userId);
    const typeFilter =
      type === 'media'
        ? { type: { in: ['IMAGE', 'VIDEO'] as any[] } }
        : type === 'docs'
          ? { type: { in: ['DOCUMENT', 'FILE'] as any[] } }
          : type === 'links'
            ? { content: { contains: 'http' } }
            : {};

    const items = await this.prisma.message.findMany({
      where: {
        chatId,
        deletedForAll: false,
        ...typeFilter,
      },
      include: {
        sender: { include: { profile: true } },
        mediaFiles: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return items.map((m) => ({
      id: m.id,
      type: m.type,
      content: m.content,
      createdAt: m.createdAt,
      sender: m.sender.profile?.displayName,
      mediaFiles: m.mediaFiles,
    }));
  }

  async blockUser(userId: string, blockedUserId: string) {
    if (userId === blockedUserId) throw new BadRequestException('Cannot block yourself');
    await this.prisma.blockedUser.upsert({
      where: { userId_blockedUserId: { userId, blockedUserId } },
      create: { userId, blockedUserId },
      update: {},
    });
    return { blocked: true };
  }

  async unblockUser(userId: string, blockedUserId: string) {
    await this.prisma.blockedUser.deleteMany({ where: { userId, blockedUserId } });
    return { blocked: false };
  }

  async searchChats(userId: string, query: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        members: { some: { userId } },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          {
            members: {
              some: {
                user: {
                  profile: { displayName: { contains: query, mode: 'insensitive' } },
                },
              },
            },
          },
        ],
      },
      include: {
        members: { include: { user: { include: { profile: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      take: 20,
    });
    return chats;
  }

  private async ensureMember(chatId: string, userId: string) {
    const member = await this.prisma.chatMember.findFirst({
      where: { chatId, userId, leftAt: null },
    });
    if (!member) throw new ForbiddenException('Not a member of this chat');
  }

  private formatChat(
    chat: any,
    userId: string,
    onlineStatus: Record<string, boolean>,
    unreadCount = 0,
    contactMap: Record<string, { savedName: string; phone: string; notes?: string | null }> = {},
  ) {
    const otherMembers = chat.members?.filter((m: any) => m.userId !== userId) || [];
    const lastMessage = chat.messages?.[0] || null;
    const isPinned = chat.pinnedBy?.length > 0;

    const other = otherMembers.length === 1 ? otherMembers[0] : null;
    const contact = other ? contactMap[other.userId] : null;
    const participantPhone = other?.user.profile?.phone
      ? this.contacts.formatPhoneDisplay(other.user.profile.phone)
      : undefined;

    let title = chat.name;
    if (chat.type === 'PRIVATE' && other) {
      title = contact?.savedName || participantPhone || 'Unknown';
    }

    const isOnline =
      chat.type === 'PRIVATE' && otherMembers.length === 1
        ? onlineStatus[otherMembers[0].userId] || false
        : false;

    const member = chat.members?.find((m: any) => m.userId === userId);
    const isMuted = member?.mutedUntil ? new Date(member.mutedUntil) > new Date() : false;
    const isArchived = !!member?.archivedAt;

    return {
      id: chat.id,
      type: chat.type,
      title,
      avatarUrl: chat.avatarUrl || other?.user.profile?.avatarUrl,
      description: chat.description,
      isPinned,
      isMuted,
      isArchived,
      pinnedMessageId: chat.pinnedMessageId || null,
      isOnline,
      isContact: !!contact,
      participantId: other?.userId,
      participantPhone,
      contactName: contact?.savedName,
      source: chat.telegramBridge ? 'TELEGRAM' : undefined,
      members: chat.members?.map((m: any) => ({
        id: m.userId,
        displayName: m.user.profile?.displayName,
        avatarUrl: m.user.profile?.avatarUrl,
        role: m.role,
        isOnline: onlineStatus[m.userId] || false,
      })),
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            type: lastMessage.type,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId,
            status: lastMessage.status,
          }
        : null,
      unreadCount,
      updatedAt: chat.updatedAt,
    };
  }
}
