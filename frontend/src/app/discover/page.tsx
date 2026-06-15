'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { Compass, Users, Sparkles } from 'lucide-react';

const discoverItems = [
  { title: 'Trending Channels', desc: 'Popular communities to join', icon: Users },
  { title: 'Mini Apps', desc: 'Interactive apps inside chat (Phase 3)', icon: Sparkles },
  { title: 'Nearby', desc: 'Discover people and services near you', icon: Compass },
];

export default function DiscoverPage() {
  return (
    <AuthGuard>
      <div className="flex h-full flex-col bg-[var(--list-bg)]">
        <header className="safe-top bg-[var(--list-bg)] px-4 pb-3 pt-4">
          <h1 className="text-[22px] font-semibold text-[var(--accent-dark)]">Discover</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {discoverItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-center gap-4 rounded-lg bg-[var(--list-bg)] p-4 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-dark)]/10">
                  <Icon className="h-6 w-6 text-[var(--accent-dark)]" />
                </div>
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AuthGuard>
  );
}
