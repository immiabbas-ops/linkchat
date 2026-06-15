import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getNotifications(userId: string, cursor?: string, limit = 20) {
    const items = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    return {
      items: hasMore ? items.slice(0, limit) : items,
      nextCursor: hasMore ? items[limit - 1].createdAt.toISOString() : null,
    };
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async create(userId: string, type: NotificationType, title: string, body: string, data?: object) {
    return this.prisma.notification.create({
      data: { userId, type, title, body, data: data as any },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }
}
