import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { SimActivationStatus, SmsProvider, MessageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { formatPhoneDisplay as formatPhoneInternational, normalizePhoneToE164Digits } from '../common/phone.util';
import {
  DeviceInboundSmsDto,
  SendSmsDto,
  UpdateSimSettingsDto,
  VerifySimActivationDto,
} from './dto/sim.dto';

@Injectable()
export class SimService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private messages: MessagesService,
    private moduleRef: ModuleRef,
  ) {}

  normalizePhone(phone: string) {
    return normalizePhoneToE164Digits(phone);
  }

  formatPhoneDisplay(phone: string) {
    return formatPhoneInternational(phone);
  }

  private resolveProvider(): SmsProvider {
    if (this.config.get('TWILIO_ACCOUNT_SID') && this.config.get('TWILIO_AUTH_TOKEN')) {
      return SmsProvider.TWILIO;
    }
    return SmsProvider.DEMO;
  }

  private assertDevOtp(code: string) {
    const demo = this.config.get('OTP_DEMO_CODE', '0000');
    if (code !== demo) {
      throw new BadRequestException('Invalid verification code');
    }
  }

  async getStatus(userId: string) {
    const activation = await this.prisma.simActivation.findUnique({
      where: { userId },
    });
    if (!activation) {
      return { activated: false, canActivate: true };
    }
    return {
      activated: activation.status === SimActivationStatus.ACTIVE,
      canActivate: activation.status !== SimActivationStatus.ACTIVE,
      activation: {
        phone: activation.phone,
        carrier: activation.carrier,
        status: activation.status,
        provider: activation.provider,
        receiveEnabled: activation.receiveEnabled,
        sendEnabled: activation.sendEnabled,
        activatedAt: activation.activatedAt,
      },
    };
  }

  async requestActivation(userId: string, phone: string, carrier?: string) {
    const normalized = this.normalizePhone(phone);
    if (normalized.length < 7) {
      throw new BadRequestException('Enter a valid SIM mobile number');
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (profile?.phone && this.normalizePhone(profile.phone) !== normalized) {
      throw new BadRequestException(
        'SIM number must match your profile phone, or update your profile phone first',
      );
    }

    const taken = await this.prisma.simActivation.findFirst({
      where: { phone: normalized, NOT: { userId } },
    });
    if (taken) {
      throw new BadRequestException('This SIM is already activated on another account');
    }

    await this.prisma.simActivation.upsert({
      where: { userId },
      create: {
        userId,
        phone: normalized,
        carrier,
        status: SimActivationStatus.PENDING,
        provider: this.resolveProvider(),
      },
      update: {
        phone: normalized,
        carrier,
        status: SimActivationStatus.PENDING,
        provider: this.resolveProvider(),
      },
    });

    if (!profile?.phone) {
      await this.prisma.profile.update({
        where: { userId },
        data: { phone: normalized },
      });
    }

    return {
      pending: true,
      phone: normalized,
      message: 'Verification code sent to your SIM number (demo: 0000)',
    };
  }

  async verifyActivation(userId: string, dto: VerifySimActivationDto) {
    const normalized = this.normalizePhone(dto.phone);
    this.assertDevOtp(dto.code);

    const activation = await this.prisma.simActivation.findUnique({ where: { userId } });
    if (!activation || activation.phone !== normalized) {
      throw new NotFoundException('No pending SIM activation for this number');
    }

    const updated = await this.prisma.simActivation.update({
      where: { userId },
      data: {
        status: SimActivationStatus.ACTIVE,
        verifiedAt: new Date(),
        activatedAt: new Date(),
        bridgeDeviceId: dto.deviceId || null,
        provider:
          dto.deviceId && this.resolveProvider() === SmsProvider.DEMO
            ? SmsProvider.DEVICE
            : this.resolveProvider(),
      },
    });

    return {
      activated: true,
      activation: {
        phone: updated.phone,
        carrier: updated.carrier,
        status: updated.status,
        provider: updated.provider,
        receiveEnabled: updated.receiveEnabled,
        sendEnabled: updated.sendEnabled,
        activatedAt: updated.activatedAt,
      },
    };
  }

  async updateSettings(userId: string, dto: UpdateSimSettingsDto) {
    const activation = await this.requireActive(userId);
    return this.prisma.simActivation.update({
      where: { id: activation.id },
      data: {
        receiveEnabled: dto.receiveEnabled ?? activation.receiveEnabled,
        sendEnabled: dto.sendEnabled ?? activation.sendEnabled,
      },
    });
  }

  async deactivate(userId: string) {
    const activation = await this.prisma.simActivation.findUnique({ where: { userId } });
    if (!activation) return { deactivated: true };

    await this.prisma.simActivation.update({
      where: { userId },
      data: { status: SimActivationStatus.DEACTIVATED },
    });
    return { deactivated: true };
  }

  async sendSms(userId: string, dto: SendSmsDto) {
    const activation = await this.requireActive(userId);
    if (!activation.sendEnabled) {
      throw new ForbiddenException('SMS sending is disabled for this SIM');
    }

    const peerPhone = this.normalizePhone(dto.to);
    if (peerPhone.length < 7) {
      throw new BadRequestException('Enter a valid recipient number');
    }

    const thread = await this.findOrCreateThread(activation, peerPhone);
    const message = await this.messages.sendMessage(userId, {
      chatId: thread.linkchatChatId,
      content: dto.body.trim(),
      type: MessageType.TEXT,
      metadata: { sms: true, direction: 'outbound', peerPhone },
    });

    await this.dispatchOutbound(activation, peerPhone, dto.body.trim(), message.id);

    const { ChatGateway } = await import('../gateway/chat.gateway');
    const gateway = this.moduleRef.get(ChatGateway, { strict: false });
    if (gateway) {
      await gateway.publishMessage(thread.linkchatChatId, message, userId);
    }

    return { message, chatId: thread.linkchatChatId };
  }

  async handleDeviceInbound(userId: string, dto: DeviceInboundSmsDto) {
    const activation = await this.requireActive(userId);
    if (!activation.receiveEnabled) {
      throw new ForbiddenException('SMS receiving is disabled');
    }

    const from = this.normalizePhone(dto.from);
    const thread = await this.findOrCreateThread(activation, from);
    const message = await this.messages.sendMessage(thread.externalUserId, {
      chatId: thread.linkchatChatId,
      content: dto.body.trim(),
      type: MessageType.TEXT,
      metadata: { sms: true, direction: 'inbound', peerPhone: from },
    });

    const { ChatGateway } = await import('../gateway/chat.gateway');
    const gateway = this.moduleRef.get(ChatGateway, { strict: false });
    if (gateway) {
      await gateway.publishMessage(thread.linkchatChatId, message);
    }

    return { message, chatId: thread.linkchatChatId };
  }

  private async requireActive(userId: string) {
    const activation = await this.prisma.simActivation.findUnique({ where: { userId } });
    if (!activation || activation.status !== SimActivationStatus.ACTIVE) {
      throw new BadRequestException('Activate your SIM first in Settings');
    }
    return activation;
  }

  private async findOrCreateThread(activation: { id: string; userId: string }, peerPhone: string) {
    const existing = await this.prisma.smsThread.findUnique({
      where: { simActivationId_peerPhone: { simActivationId: activation.id, peerPhone } },
    });
    if (existing) return existing;

    const email = `sms+${peerPhone}@gateway.linkchat.local`;
    let externalUser = await this.prisma.user.findUnique({ where: { email } });
    if (!externalUser) {
      externalUser = await this.prisma.user.create({
        data: {
          email,
          emailVerified: true,
          profile: {
            create: {
              displayName: this.formatPhoneDisplay(peerPhone),
              phone: peerPhone,
            },
          },
          settings: { create: {} },
        },
      });
    }

    const chat = await this.prisma.chat.create({
      data: {
        type: 'PRIVATE',
        members: {
          create: [{ userId: activation.userId }, { userId: externalUser.id }],
        },
      },
    });

    return this.prisma.smsThread.create({
      data: {
        simActivationId: activation.id,
        ownerUserId: activation.userId,
        linkchatChatId: chat.id,
        peerPhone,
        externalUserId: externalUser.id,
      },
    });
  }

  private async dispatchOutbound(
    activation: { provider: SmsProvider; phone: string },
    to: string,
    body: string,
    messageId: string,
  ) {
    if (activation.provider === SmsProvider.TWILIO) {
      await this.sendViaTwilio(to, body);
      return;
    }

    if (activation.provider === SmsProvider.DEVICE) {
      // Native companion app polls device outbox — message already stored in chat.
      return;
    }

    console.log(`[SIM demo] SMS from ${activation.phone} to ${to}: ${body.slice(0, 80)} (msg ${messageId})`);
  }

  private async sendViaTwilio(to: string, body: string) {
    const sid = this.config.get('TWILIO_ACCOUNT_SID');
    const token = this.config.get('TWILIO_AUTH_TOKEN');
    const from = this.config.get('TWILIO_PHONE_NUMBER');
    if (!sid || !token || !from) {
      throw new BadRequestException('Twilio is not configured on the server');
    }

    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const params = new URLSearchParams({ To: `+${to}`, From: from, Body: body });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(`SMS send failed: ${err.slice(0, 120)}`);
    }
  }
}
