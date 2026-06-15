import type { Message } from '@/types';

export function isOwnMessage(message: Message, currentUserId?: string | null) {
  // Always derive from sender when possible — socket payloads carry the sender's isOwn flag.
  if (currentUserId && message.sender?.id) {
    return message.sender.id === currentUserId;
  }
  if (typeof message.isOwn === 'boolean') {
    return message.isOwn;
  }
  return false;
}

export function withMessageOwnership(message: Message, currentUserId?: string | null): Message {
  return {
    ...message,
    isOwn: isOwnMessage(message, currentUserId),
  };
}
