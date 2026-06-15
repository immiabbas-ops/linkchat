'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';

interface SettingsSubpageProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSubpage({ title, children }: SettingsSubpageProps) {
  return (
    <AuthGuard>
      <div className="flex h-full flex-col bg-[var(--list-bg)] md:pl-[72px]">
        <header className="wa-header flex items-center gap-3 px-2 py-3 safe-top">
          <Link href="/settings" className="rounded-full p-2 hover:bg-white/10">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-[19px] font-normal">{title}</h1>
        </header>
        <div className="flex-1 overflow-y-auto scrollbar-hide">{children}</div>
      </div>
    </AuthGuard>
  );
}
