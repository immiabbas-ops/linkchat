'use client';

import { ChevronDown } from 'lucide-react';

interface ScrollToBottomButtonProps {
  visible: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export function ScrollToBottomButton({ visible, unreadCount = 0, onClick }: ScrollToBottomButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-24 right-4 z-20 flex h-10 min-w-10 items-center justify-center gap-1 rounded-full bg-[var(--bg-panel)] px-3 shadow-lg ring-1 ring-[var(--border-glass)]"
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
