'use client';

import { cn } from '@/lib/utils';
import '@/app/auth/auth.css';

interface AuthShellProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthShell({ children, footer, className }: AuthShellProps) {
  return (
    <div className={cn('auth-root auth-nebula-bg nebula-surface flex min-h-[100dvh] flex-col', className)}>
      <div className="nebula-content relative flex flex-1 flex-col items-center justify-center px-6 py-10">
        {children}
      </div>
      {footer ?? (
        <p className="nebula-content relative pb-8 text-center text-xs text-white/40">
          from <span className="text-white/70">LinkChat</span>
        </p>
      )}
    </div>
  );
}
