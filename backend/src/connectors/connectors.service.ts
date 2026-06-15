import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConnectorType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateConnectorDto } from './dto/connector.dto';

@Injectable()
export class ConnectorsService {
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  async getUserConnectors(userId: string) {
    const connectors = await this.prisma.chatConnector.findMany({
      where: { userId, enabled: true },
      orderBy: { createdAt: 'asc' },
    });

    return connectors.map((c) => this.sanitizeConnector(c));
  }

  async createConnector(userId: string, dto: CreateConnectorDto) {
    if (dto.type === ConnectorType.TELEGRAM) {
      return this.createTelegramConnector(userId, dto);
    }

    if (!dto.identifier?.trim()) {
      throw new BadRequestException('Identifier is required');
    }

    const identifier = this.normalizeIdentifier(dto.type, dto.identifier);

    const connector = await this.prisma.chatConnector.create({
      data: {
        userId,
        type: dto.type,
        label: dto.label.trim(),
        identifier,
      },
    });

    return this.sanitizeConnector(connector);
  }

  async deleteConnector(userId: string, id: string) {
    const connector = await this.prisma.chatConnector.findFirst({
      where: { id, userId },
    });

    if (!connector) {
      throw new NotFoundException('Connector not found');
    }

    if (connector.type === ConnectorType.TELEGRAM) {
      this.telegram.stopPolling(connector.id);
    }

    await this.prisma.chatConnector.delete({ where: { id } });
    return { success: true };
  }

  private async createTelegramConnector(userId: string, dto: CreateConnectorDto) {
    const botToken = this.telegram.getBotToken(dto.config);
    if (!botToken) {
      throw new BadRequestException('Telegram bot token is required (from @BotFather)');
    }

    const bot = await this.telegram.validateBotToken(botToken).catch(() => {
      throw new BadRequestException('Invalid Telegram bot token');
    });

    if (!bot.username) {
      throw new BadRequestException('Bot must have a username. Set it in @BotFather.');
    }

    const connector = await this.prisma.chatConnector.create({
      data: {
        userId,
        type: ConnectorType.TELEGRAM,
        label: dto.label.trim() || bot.first_name,
        identifier: bot.username,
        config: { botToken },
      },
    });

    this.telegram.startPolling(connector.id, botToken);

    return this.sanitizeConnector(connector);
  }

  private sanitizeConnector(connector: {
    id: string;
    userId: string;
    type: ConnectorType;
    label: string;
    identifier: string;
    config: unknown;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const { config, ...rest } = connector;
    return {
      ...rest,
      config:
        connector.type === ConnectorType.TELEGRAM
          ? { live: true, botUsername: connector.identifier }
          : undefined,
    };
  }

  private normalizeIdentifier(type: ConnectorType, raw: string): string {
    const value = raw.trim();

    switch (type) {
      case ConnectorType.EMAIL: {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new BadRequestException('Enter a valid email address');
        }
        return value.toLowerCase();
      }
      case ConnectorType.DISCORD: {
        if (/^https?:\/\//i.test(value)) {
          return value;
        }
        const handle = value.replace(/^@/, '');
        if (!/^[a-z0-9._]{2,32}$/i.test(handle)) {
          throw new BadRequestException('Enter a Discord username or invite link');
        }
        return handle;
      }
      case ConnectorType.MATRIX: {
        if (!/^@[^:\s]+:[^\s]+$/.test(value)) {
          throw new BadRequestException('Enter a Matrix ID like @user:matrix.org');
        }
        return value;
      }
      default:
        throw new BadRequestException('Unsupported connector type');
    }
  }
}
