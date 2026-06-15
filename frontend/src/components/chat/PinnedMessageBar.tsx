'use client';

import { Pin, X } from 'lucide-react';
import type { Message } from '@/types';

interface PinnedMessageBarProps {
  message: Message | null;
  onUnpin: () => void;
  onJump: () => void;
}

export function PinnedMessageBar({ message, onUnpin, onJump }: PinnedMessageBarProps) {
  if (!message) return null;

  const preview =
    message.type === 'IMAGE'
      ? '📷 Photo'
      : message.type === 'VOICE'
        ? '🎤 Voice message'
        : message.content?.slice(0, 80) || 'Pinned message';

  return (
    <button
      type="button"
      onClick={onJump}
      className="flex w-full items-center gap-3 border-b border-[var(--border-glass)] bg-[var(--bg-panel)]/95 px-4 py-2 text-left"
    >
      <Pin className="h-4 w-4 shrink-0 text-[var(--accent)]" />
      <div className="min-w-0 flex-1 border-l-2 border-[var(--accent)] pl-3">
        <p className="text-xs font-medium text-[var(--accent)]">Pinned message</p>
        <p className="truncate text-sm text-[var(--text-primary)]">{preview}</p>
      </div>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onUnpin();
        }}
        onKeyDown={(e) => e.key === 'Enter' && onUnpin()}
        className="rounded-full p-1 hover:bg-black/5"
      >
        <X className="h-4 w-4 text-[var(--text-secondary)]" />
      </span>
    </button>
  );
}
