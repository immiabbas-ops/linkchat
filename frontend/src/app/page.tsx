'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { LandingPage } from '@/components/landing/LandingPage';
import '@/app/landing.css';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/chats');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="landing-root nebula-surface flex min-h-screen items-center justify-center">
        <div className="nebula-content flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading LinkChat...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="landing-root nebula-surface flex min-h-screen items-center justify-center">
        <div className="nebula-content h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return <LandingPage />;
}
