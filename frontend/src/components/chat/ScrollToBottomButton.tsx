'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToBottomButtonProps {
  visible: boolean;
  unreadCount?: number;
  onClick: () => void;
  className?: string;
}

export function ScrollToBottomButton({
  visible,
  unreadCount = 0,
  onClick,
  className,
}: ScrollToBottomButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll to latest messages"
      className={cn(
        'pointer-events-auto flex h-10 min-w-10 items-center justify-center gap-1 rounded-full bg-[var(--bg-panel)] px-3 shadow-lg ring-1 ring-[var(--border-glass)] transition-opacity',
        className,
      )}
    >
      {unreadCount > 0 && (
        <span className="rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-semibold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      <ChevronDown className="h-5 w-5 text-[var(--text-secondary)]" />
    </button>
  );
}
