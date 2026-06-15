import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { MessageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from?: {
      id: number;
      is_bot?: boolean;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    text?: string;
  };
};

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private pollers = new Map<string, { running: boolean }>();

  constructor(
    private prisma: PrismaService,
    private messages: MessagesService,
    private moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    try {
      const connectors = await this.prisma.chatConnector.findMany({
        where: { type: 'TELEGRAM', enabled: true },
      });

      for (const connector of connectors) {
        const token = this.getBotToken(connector.config);
        if (token) {
          this.startPolling(connector.id, token);
        }
      }
    } catch (error) {
      this.logger.warn(`Could not start Telegram polling on boot: ${String(error)}`);
    }
  }

  onModuleDestroy() {
    for (const poller of this.pollers.values()) {
      poller.running = false;
    }
    this.pollers.clear();
  }

  getBotToken(config: unknown): string | null {
    if (!config || typeof config !== 'object') return null;
    const token = (config as { botToken?: string }).botToken;
    return typeof token === 'string' && token.trim() ? token.trim() : null;
  }

  async validateBotToken(botToken: string) {
    const res = await this.apiCall(botToken, 'getMe');
    if (!res.ok) {
      throw new Error(res.description || 'Invalid bot token');
    }
    return res.result as { id: number; username?: string; first_name: string };
  }

  startPolling(connectorId: string, botToken: string) {
    if (this.pollers.has(connectorId)) return;

    const state = { running: true };
    this.pollers.set(connectorId, state);
    this.logger.log(`Telegram polling started for connector ${connectorId}`);
    void this.pollLoop(connectorId, botToken, state);
  }

  stopPolling(connectorId: string) {
    const poller = this.pollers.get(connectorId);
    if (poller) {
      poller.running = false;
      this.pollers.delete(connectorId);
    }
  }

  private async pollLoop(connectorId: string, botToken: string, state: { running: boolean }) {
    let offset = 0;

    while (state.running) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=25`,
        );
        const data = (await res.json()) as {
          ok: boolean;
          result?: TelegramUpdate[];
          description?: string;
        };

        if (!data.ok) {
          this.logger.warn(`Telegram polling error (${connectorId}): ${data.description}`);
          await this.sleep(5000);
          continue;
        }

        for (const update of data.result || []) {
          offset = update.update_id + 1;
          await this.handleUpdate(connectorId, botToken, update);
        }
      } catch (error) {
        this.logger.warn(`Telegram poll failed (${connectorId}): ${String(error)}`);
        await this.sleep(5000);
      }
    }
  }

  async handleUpdate(connectorId: string, botToken: string, update: TelegramUpdate) {
    const message = update.message;
    if (!message?.text || !message.from || message.from.is_bot) return;

    const connector = await this.prisma.chatConnector.findUnique({
      where: { id: connectorId },
    });
    if (!connector?.enabled) return;

    const externalTelegramChatId = String(message.chat.id);
    const text = message.text.trim();
    if (!text) return;

    if (text === '/start') {
      await this.sendTelegramMessage(
        botToken,
        externalTelegramChatId,
        'You are connected to LinkChat. Send any message here and the owner will see it in their LinkChat inbox.',
      );
      return;
    }

    const bridge = await this.findOrCreateBridge(connector, {
      telegramChatId: externalTelegramChatId,
      telegramUserId: String(message.from.id),
      username: message.from.username,
      firstName: message.from.first_name,
      lastName: message.from.last_name,
    });

    const formatted = await this.messages.sendMessage(bridge.externalUserId, {
      chatId: bridge.linkchatChatId,
      content: text,
      type: MessageType.TEXT,
      metadata: {
        fromTelegram: true,
        telegramMessageId: message.message_id,
        connectorId,
      },
    });

    const { ChatGateway } = await import('../gateway/chat.gateway');
    const gateway = this.moduleRef.get(ChatGateway, { strict: false });
    if (gateway) {
      await gateway.publishMessage(bridge.linkchatChatId, formatted);
    }
  }

  async sendOutbound(chatId: string, content: string, ownerUserId: string) {
    if (!content?.trim()) return;

    const bridge = await this.prisma.telegramBridge.findFirst({
      where: { linkchatChatId: chatId, ownerUserId },
      include: { connector: true },
    });
    if (!bridge) return;

    const botToken = this.getBotToken(bridge.connector.config);
    if (!botToken) return;

    await this.sendTelegramMessage(botToken, bridge.externalTelegramChatId, content.trim());
  }

  async findBridgeByChatId(chatId: string) {
    return this.prisma.telegramBridge.findUnique({ where: { linkchatChatId: chatId } });
  }

  private async findOrCreateBridge(
    connector: { id: string; userId: string },
    contact: {
      telegramChatId: string;
      telegramUserId: string;
      username?: string;
      firstName?: string;
      lastName?: string;
    },
  ) {
    const existing = await this.prisma.telegramBridge.findUnique({
      where: {
        connectorId_externalTelegramChatId: {
          connectorId: connector.id,
          externalTelegramChatId: contact.telegramChatId,
        },
      },
    });
    if (existing) return existing;

    const displayName =
      [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
      (contact.username ? `@${contact.username}` : 'Telegram contact');

    const email = `telegram_${contact.telegramUserId}@bridge.linkchat.local`;

    let externalUser = await this.prisma.user.findUnique({ where: { email } });
    if (!externalUser) {
      externalUser = await this.prisma.user.create({
        data: {
          email,
          emailVerified: true,
          profile: {
            create: {
              displayName,
              bio: contact.username ? `@${contact.username} on Telegram` : 'Telegram contact',
            },
          },
        },
      });
    } else {
      await this.prisma.profile.updateMany({
        where: { userId: externalUser.id },
        data: { displayName },
      });
    }

    const chat = await this.prisma.chat.create({
      data: {
        type: 'PRIVATE',
        name: displayName,
        createdById: connector.userId,
        members: {
          create: [{ userId: connector.userId }, { userId: externalUser.id }],
        },
      },
    });

    return this.prisma.telegramBridge.create({
      data: {
        connectorId: connector.id,
        ownerUserId: connector.userId,
        linkchatChatId: chat.id,
        externalTelegramChatId: contact.telegramChatId,
        externalUserId: externalUser.id,
      },
    });
  }

  private async sendTelegramMessage(botToken: string, chatId: string, text: string) {
    await this.apiCall(botToken, 'sendMessage', {
      chat_id: chatId,
      text,
    });
  }

  private async apiCall(botToken: string, method: string, body?: Record<string, unknown>) {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<{ ok: boolean; result?: unknown; description?: string }>;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
