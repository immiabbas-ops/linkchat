'use client';

import { socketService } from '@/lib/socket';
import { useChatStore } from '@/store/chat-store';

export async function connectSocket(token: string) {
  if (typeof window === 'undefined') return;
  await socketService.connect(token);
  useChatStore.getState().initSocketListeners();
  useChatStore.getState().fetchChats();
}

export async function disconnectSocket() {
  if (typeof window === 'undefined') return;
  socketService.disconnect();
}
