import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from '../auth/dto/auth.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  normalizePhone(phone: string) {
    return phone.replace(/\D/g, '');
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, settings: true },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { displayName, bio, avatarUrl, locale, theme, phone } = dto;

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

    await this.prisma.profile.update({
      where: { userId },
      data: {
        displayName,
        bio,
        avatarUrl,
        locale,
        theme,
        ...(phone !== undefined ? { phone: this.normalizePhone(phone) } : {}),
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
    const digits = this.normalizePhone(query);
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

  async updateSettings(userId: string, data: Record<string, unknown>) {
    return this.prisma.userSettings.update({
      where: { userId },
      data: data as any,
    });
  }
}
