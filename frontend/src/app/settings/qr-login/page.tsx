'use client';

import Link from 'next/link';
import { ArrowLeft, QrCode } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function QrLoginPage() {
  return (
    <AuthGuard>
      <div className="flex h-full flex-col md:pl-20">
        <header className="flex items-center gap-3 border-b border-[var(--border-glass)] px-4 py-4 safe-top">
          <Link href="/settings"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold">QR Login</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
          <div className="flex h-48 w-48 items-center justify-center rounded-2xl glass mb-4">
            <QrCode className="h-24 w-24 text-[var(--text-secondary)]" />
          </div>
          <p className="text-[var(--text-secondary)]">
            Desktop sync via QR login — Phase 3
          </p>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Scan this code from your mobile app to sync sessions
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
