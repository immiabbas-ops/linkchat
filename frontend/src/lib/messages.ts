import type { Message } from '@/types';

export function isOwnMessage(message: Message, currentUserId?: string | null) {
  if (typeof message.isOwn === 'boolean') {
    return message.isOwn;
  }
  if (currentUserId && message.sender?.id) {
    return message.sender.id === currentUserId;
  }
  return false;
}

export function withMessageOwnership(message: Message, currentUserId?: string | null): Message {
  return {
    ...message,
    isOwn: isOwnMessage(message, currentUserId),
  };
}
