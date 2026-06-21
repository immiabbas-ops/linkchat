import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from '../auth/dto/auth.dto';
import {
  generateUniqueUsername,
  isValidUsername,
  normalizeUsername,
} from './username.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  normalizePhone(phone: string) {
    return phone.replace(/\D/g, '');
  }

  private async usernameTaken(username: string, excludeUserId?: string) {
    const existing = await this.prisma.profile.findFirst({
      where: {
        username,
        ...(excludeUserId ? { NOT: { userId: excludeUserId } } : {}),
      },
    });
    return !!existing;
  }

  async ensureUsername(userId: string, displayName: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) return null;
    if (profile.username) return profile;

    const username = await generateUniqueUsername(displayName, (name) => this.usernameTaken(name));
    return this.prisma.profile.update({
      where: { userId },
      data: { username },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, settings: true },
    });
    if (!user?.profile) return user;

    if (!user.profile.username) {
      const updated = await this.ensureUsername(userId, user.profile.displayName);
      if (updated) {
        return {
          ...user,
          profile: updated,
        };
      }
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { displayName, bio, avatarUrl, locale, theme, phone, username } = dto;

    if (phone !== undefined) {
      const normalized = this.normalizePhone(phone);
      if (normalized.length < 7) {
        throw new BadRequestException('Enter a valid mobile number');
      }

      const existing = await this.prisma.profile.findFirst({
        where: { phone: normalized, NOT: { userId } },
      });
      if (existing) throw new BadRequestException('This mobile number is already registered');
    }

    if (username !== undefined) {
      const normalized = normalizeUsername(username);
      if (!isValidUsername(normalized)) {
        throw new BadRequestException(
          'Username must be 3–30 characters, start with a letter, and use only letters, numbers, or underscores',
        );
      }
      if (await this.usernameTaken(normalized, userId)) {
        throw new BadRequestException('This username is already taken');
      }
    }

    await this.prisma.profile.update({
      where: { userId },
      data: {
        displayName,
        bio,
        avatarUrl,
        locale,
        theme,
        ...(phone !== undefined ? { phone: this.normalizePhone(phone) } : {}),
        ...(username !== undefined ? { username: normalizeUsername(username) } : {}),
      },
    });

    if (theme || locale) {
      await this.prisma.userSettings.update({
        where: { userId },
        data: { theme, locale },
      });
    }

    return this.getMe(userId);
  }

  async searchUsers(query: string, excludeId?: string) {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const usernameQuery = normalizeUsername(trimmed.replace(/^@/, ''));
    if (/^[a-z][a-z0-9_]{2,29}$/i.test(usernameQuery)) {
      const byUsername = await this.prisma.user.findFirst({
        where: {
          id: excludeId ? { not: excludeId } : undefined,
          profile: { username: usernameQuery.toLowerCase() },
        },
        include: { profile: true },
      });
      if (byUsername) return [byUsername];
    }

    const digits = this.normalizePhone(trimmed);
    if (digits.length < 10) return [];

    const user = await this.prisma.user.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        profile: { phone: digits },
      },
      include: { profile: true },
    });

    return user ? [user] : [];
  }

  async getByUsername(username: string, excludeId?: string) {
    const normalized = normalizeUsername(username);
    if (!isValidUsername(normalized)) {
      throw new BadRequestException('Invalid username');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        profile: { username: normalized },
      },
      include: { profile: true },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateSettings(userId: string, data: Record<string, unknown>) {
    return this.prisma.userSettings.update({
      where: { userId },
      data: data as any,
    });
  }
}
