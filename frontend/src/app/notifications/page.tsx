'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { api } from '@/lib/api';
import type { Notification } from '@/types';
import { formatMessageTime } from '@/lib/utils';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    api.get<{ items: Notification[] }>('/notifications').then((r) => setNotifications(r.items)).catch(() => {});
  }, []);

  return (
    <AuthGuard>
      <div className="flex h-full flex-col md:pl-20">
        <header className="border-b border-[var(--border-glass)] px-4 py-4 safe-top">
          <h1 className="text-2xl font-bold text-gradient">Notifications</h1>
        </header>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="py-16 text-center text-[var(--text-secondary)]">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`border-b border-[var(--border-glass)] px-4 py-3 ${!n.readAt ? 'bg-accent/5' : ''}`}
              >
                <h3 className="font-medium">{n.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{n.body}</p>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {formatMessageTime(n.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
