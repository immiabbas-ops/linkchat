'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { ChatList } from '@/components/chat/ChatList';

export default function ChatDetailPage({ params }: { params: { id: string } }) {
  return (
    <AuthGuard>
      <div className="flex h-full">
        <div className="hidden w-80 border-r border-[var(--border-glass)] lg:block">
          <ChatList />
        </div>
        <div className="flex-1">
          <ChatRoom chatId={params.id} />
        </div>
      </div>
    </AuthGuard>
  );
}
