'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function NotificationSettingsPage() {
  return (
    <AuthGuard>
      <div className="flex h-full flex-col md:pl-20">
        <header className="flex items-center gap-3 border-b border-[var(--border-glass)] px-4 py-4 safe-top">
          <Link href="/settings"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold">Notifications</h1>
        </header>
        <div className="p-4 space-y-4">
          {['Message notifications', 'Service updates', 'Family alerts', 'Push notifications'].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-xl glass px-4 py-3">
              <span>{item}</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-accent" />
            </div>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
