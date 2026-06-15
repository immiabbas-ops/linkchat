'use client';

import type { Message } from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000/chat';

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.chatId === 'string';
}

type IoSocket = {
  connected: boolean;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
  disconnect: () => void;
};

class SocketService {
  private socket: IoSocket | null = null;
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  async connect(token: string) {
    if (this.socket?.connected) return this.socket;

    const { io } = await import('socket.io-client');
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    }) as IoSocket;

    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
      void import('@/store/chat-store').then(({ useChatStore }) => {
        useChatStore.getState().fetchChats();
      });
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    const events = [
      'message:new',
      'message:read',
      'message:edit',
      'message:delete',
      'message:react',
      'user:typing',
      'user:recording',
      'user:online',
    ];

    events.forEach((event) => {
      this.socket!.on(event, (data: unknown) => {
        this.listeners.get(event)?.forEach((cb) => cb(data));
      });
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  joinChat(chatId: string) {
    this.socket?.emit('chat:join', { chatId });
  }

  sendMessage(data: {
    chatId: string;
    content?: string;
    type?: string;
    replyToId?: string;
    mediaFileId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return new Promise<Message>((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Send timed out'));
      }, 12000);

      this.socket.emit('message:send', data, (response: unknown) => {
        clearTimeout(timeout);
        const message = this.parseAckMessage(response);
        if (message?.id) {
          resolve(message);
        } else {
          reject(new Error('Send failed'));
        }
      });
    });
  }

  private parseAckMessage(response: unknown): Message | null {
    if (!response || typeof response !== 'object') return null;

    const payload = response as Record<string, unknown>;

    if (isMessage(payload)) {
      return payload;
    }

    const nested = payload.data ?? payload.message ?? payload.result;
    if (isMessage(nested)) {
      return nested;
    }

    if (Array.isArray(response) && response[0] && typeof response[0] === 'object') {
      return this.parseAckMessage(response[0]);
    }

    return null;
  }

  markRead(chatId: string, messageId?: string) {
    this.socket?.emit('message:read', { chatId, messageId });
  }

  setTyping(chatId: string, isTyping: boolean) {
    this.socket?.emit('user:typing', { chatId, isTyping });
  }

  setRecording(chatId: string, isRecording: boolean) {
    this.socket?.emit('user:recording', { chatId, isRecording });
  }

  editMessage(messageId: string, content: string, chatId: string) {
    this.socket?.emit('message:edit', { messageId, content, chatId });
  }

  deleteMessage(messageId: string, chatId: string, scope?: 'ME' | 'EVERYONE') {
    this.socket?.emit('message:delete', { messageId, chatId, scope });
  }

  reactToMessage(messageId: string, emoji: string, chatId: string) {
    this.socket?.emit('message:react', { messageId, emoji, chatId });
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
