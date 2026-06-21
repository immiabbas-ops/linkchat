import type { Chat } from '@/types';

/** Pinned chats first, then most recently active. */
export function sortChats(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => {
    const aPin = a.isPinned ? 1 : 0;
    const bPin = b.isPinned ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;

    const aTime = a.lastMessage?.createdAt || a.updatedAt || '';
    const bTime = b.lastMessage?.createdAt || b.updatedAt || '';
    return bTime.localeCompare(aTime);
  });
}
