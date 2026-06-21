import type { Message } from '@/types';

export function sortMessagesByCreatedAt(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function getClientMessageId(message: Message): string | undefined {
  const id = message.metadata?.clientMessageId;
  return typeof id === 'string' ? id : undefined;
}

export function createClientMessageId(): string {
  return `cmsg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
