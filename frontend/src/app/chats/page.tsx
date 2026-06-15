'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { ChatList } from '@/components/chat/ChatList';

export default function ChatsPage() {
  return (
    <AuthGuard>
      <ChatList />
    </AuthGuard>
  );
}
