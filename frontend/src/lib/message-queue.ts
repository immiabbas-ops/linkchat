import type { Message } from '@/types';

export interface QueuedSend {
  id: string;
  chatId: string;
  content: string;
  options?: Partial<Message>;
  replyToId?: string;
  createdAt: number;
}

const STORAGE_KEY = 'linkchat_outbound_queue';

function readQueue(): QueuedSend[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedSend[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedSend[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function enqueueOutbound(item: QueuedSend) {
  const queue = readQueue().filter((q) => q.id !== item.id);
  queue.push(item);
  writeQueue(queue);
}

export function dequeueOutbound(id: string) {
  writeQueue(readQueue().filter((q) => q.id !== id));
}

export function getOutboundQueue(): QueuedSend[] {
  return readQueue();
}

export function getOutboundForChat(chatId: string): QueuedSend[] {
  return readQueue().filter((q) => q.chatId === chatId);
}
