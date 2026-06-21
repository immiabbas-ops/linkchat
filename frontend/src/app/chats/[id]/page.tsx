'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { ChatList } from '@/components/chat/ChatList';

export default function ChatDetailPage({ params }: { params: { id: string } }) {
  return (
    <AuthGuard>
      <div className="flex h-full">
        <div className="relative z-0 hidden h-full overflow-hidden border-r border-[var(--border-glass)] lg:block lg:w-80 lg:shrink-0">
          <ChatList embedded />
        </div>
        <div className="relative z-10 min-w-0 flex-1">
          <ChatRoom chatId={params.id} />
        </div>
      </div>
    </AuthGuard>
  );
}
