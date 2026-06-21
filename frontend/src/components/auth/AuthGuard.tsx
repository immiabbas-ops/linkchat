'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { AppShell } from '@/components/layout/AppShell';

const AUTH_TIMEOUT_MS = 12000;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), AUTH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const next = pathname && pathname !== '/auth/login' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/auth/login${next}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (timedOut && isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[var(--text-primary)]">Taking too long to connect…</p>
        <p className="max-w-sm text-sm text-[var(--text-secondary)]">
          Use <strong>https://link-chats.com</strong> (not an IP address). Make sure you have internet and try again.
        </p>
        <button
          type="button"
          onClick={() => {
            setTimedOut(false);
            void checkAuth();
          }}
          className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
        <a href="/auth/login" className="text-sm text-[var(--accent)] underline">
          Go to login
        </a>
      </div>
    );
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
