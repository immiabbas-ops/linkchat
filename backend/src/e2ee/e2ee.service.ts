import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KeyBundleItemDto } from './dto/e2ee.dto';

@Injectable()
export class E2eeService {
  constructor(private prisma: PrismaService) {}

  async registerDeviceKey(userId: string, deviceId: string, publicKey: string) {
    return this.prisma.userDeviceKey.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      create: { userId, deviceId, publicKey },
      update: { publicKey, updatedAt: new Date() },
    });
  }

  async getUserPublicKey(userId: string) {
    const key = await this.prisma.userDeviceKey.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!key) throw new NotFoundException('No encryption key for this user');
    return { userId, deviceId: key.deviceId, publicKey: key.publicKey };
  }

  async getChatKeyBundle(chatId: string, userId: string) {
    const member = await this.prisma.chatMember.findFirst({
      where: { chatId, userId, leftAt: null },
    });
    if (!member) throw new ForbiddenException('Not a member of this chat');

    const bundle = await this.prisma.chatKeyBundle.findFirst({
      where: { chatId, userId },
      orderBy: { keyVersion: 'desc' },
    });
    if (!bundle) return null;
    return bundle;
  }

  async uploadKeyBundles(chatId: string, userId: string, bundles: KeyBundleItemDto[]) {
    const member = await this.prisma.chatMember.findFirst({
      where: { chatId, userId, leftAt: null },
    });
    if (!member) throw new ForbiddenException('Not a member of this chat');
    if (member.role !== 'admin' && bundles.some((b) => b.userId !== userId)) {
      const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
      if (chat?.createdById !== userId) {
        throw new ForbiddenException('Only admins can distribute keys to other members');
      }
    }

    const version =
      ((
        await this.prisma.chatKeyBundle.findFirst({
          where: { chatId },
          orderBy: { keyVersion: 'desc' },
        })
      )?.keyVersion ?? 0) + 1;

    await this.prisma.chatKeyBundle.createMany({
      data: bundles.map((b) => ({
        chatId,
        userId: b.userId,
        keyVersion: version,
        wrappedKey: b.wrappedKey,
        ephemeralKey: b.ephemeralKey,
        iv: b.iv,
      })),
      skipDuplicates: true,
    });

    return { uploaded: bundles.length, keyVersion: version };
  }
}
