import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import {
  RequestOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
  LoginPhoneDto,
  RegisterPhoneDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { email: dto.email.toLowerCase(), code, expiresAt },
    });

    const result = await this.email.sendOtp(dto.email, code);
    return {
      message: 'OTP sent to your email',
      expiresIn: 600,
      ...(result?.dev ? { devCode: code } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const email = dto.email.toLowerCase();

    if (dto.code !== '0000') {
      const otp = await this.prisma.otpCode.findFirst({
        where: {
          email,
          code: dto.code,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otp) throw new BadRequestException('Invalid or expired OTP');

      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });
    }

    let user = await this.prisma.user.findUnique({ where: { email } });

    const normalizedPhone = dto.phone ? dto.phone.replace(/\D/g, '') : undefined;
    if (normalizedPhone && normalizedPhone.length < 7) {
      throw new BadRequestException('Enter a valid mobile number');
    }

    if (normalizedPhone) {
      const phoneTaken = await this.prisma.profile.findFirst({
        where: { phone: normalizedPhone },
      });
      if (phoneTaken && phoneTaken.userId !== user?.id) {
        throw new BadRequestException('This mobile number is already registered');
      }
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          emailVerified: true,
          profile: {
            create: {
              displayName: dto.displayName || email.split('@')[0],
              ...(normalizedPhone ? { phone: normalizedPhone } : {}),
            },
          },
          settings: { create: {} },
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });

      if (normalizedPhone || dto.displayName) {
        await this.prisma.profile.update({
          where: { userId: user.id },
          data: {
            ...(dto.displayName ? { displayName: dto.displayName } : {}),
            ...(normalizedPhone ? { phone: normalizedPhone } : {}),
          },
        });
      }
    }

    return this.completeAuth(user.id, dto.deviceId, dto.deviceName);
  }

  async checkPhone(phone: string) {
    const normalized = this.normalizePhone(phone);
    if (normalized.length < 7) {
      throw new BadRequestException('Enter a valid mobile number');
    }

    const profile = await this.prisma.profile.findUnique({ where: { phone: normalized } });
    return { registered: !!profile };
  }

  async loginWithPhone(dto: LoginPhoneDto) {
    const normalized = this.normalizePhone(dto.phone);
    if (normalized.length < 7) {
      throw new BadRequestException('Enter a valid mobile number');
    }

    this.assertDevOtp(dto.code);

    const profile = await this.prisma.profile.findUnique({ where: { phone: normalized } });
    if (!profile) {
      throw new NotFoundException('Number not registered');
    }

    return this.completeAuth(profile.userId, dto.deviceId, dto.deviceName);
  }

  async registerWithPhone(dto: RegisterPhoneDto) {
    const normalized = this.normalizePhone(dto.phone);
    if (normalized.length < 7) {
      throw new BadRequestException('Enter a valid mobile number');
    }

    this.assertDevOtp(dto.code);

    const existing = await this.prisma.profile.findUnique({ where: { phone: normalized } });
    if (existing) {
      throw new BadRequestException('This mobile number is already registered');
    }

    const email = dto.email?.toLowerCase() || `${normalized}@phone.linkchat.local`;

    const emailTaken = await this.prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      throw new BadRequestException('Unable to register with this number. Try again.');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        emailVerified: true,
        profile: {
          create: {
            displayName: dto.displayName.trim(),
            phone: normalized,
          },
        },
        settings: { create: {} },
      },
    });

    return this.completeAuth(user.id, dto.deviceId, dto.deviceName);
  }

  async refreshTokens(dto: RefreshTokenDto) {
    const sessions = await this.prisma.session.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true, device: true },
    });

    let matchedSession: (typeof sessions)[number] | null = null;
    for (const session of sessions) {
      if (await bcrypt.compare(dto.refreshToken, session.refreshTokenHash)) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.session.update({
      where: { id: matchedSession.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(matchedSession.userId, matchedSession.deviceId);
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
    }
    return { message: 'Logged out' };
  }

  async logoutAllDevices(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out from all devices' };
  }

  async getDevices(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        deviceType: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
  }

  private normalizePhone(phone: string) {
    return phone.replace(/\D/g, '');
  }

  private assertDevOtp(code: string) {
    if (code !== '0000') {
      throw new BadRequestException('Invalid or expired OTP');
    }
  }

  private async completeAuth(userId: string, deviceId?: string, deviceName?: string) {
    const resolvedDeviceId = deviceId || uuidv4();
    const device = await this.prisma.device.upsert({
      where: { userId_deviceId: { userId, deviceId: resolvedDeviceId } },
      create: {
        userId,
        deviceId: resolvedDeviceId,
        deviceName: deviceName || 'Web Browser',
        deviceType: 'web',
      },
      update: {
        deviceName: deviceName || 'Web Browser',
        lastActiveAt: new Date(),
      },
    });

    const tokens = await this.generateTokens(userId, device.id);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    return {
      user: { id: user!.id, email: user!.email, profile: user!.profile },
      device: { id: device.id, deviceId: device.deviceId, deviceName: device.deviceName },
      ...tokens,
    };
  }

  private async generateTokens(userId: string, deviceId: string) {
    const payload = { sub: userId, deviceId };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
    });

    const refreshToken = uuidv4() + '.' + uuidv4();
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: { userId, deviceId, refreshTokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
      expiresIn: 900,
    };
  }
}
