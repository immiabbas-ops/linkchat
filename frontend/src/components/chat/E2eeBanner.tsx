'use client';

import { Lock } from 'lucide-react';

export function E2eeBanner() {
  return (
    <div className="mx-auto max-w-md px-6 py-3 text-center">
      <div className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)]/8 px-4 py-2.5 text-[12.5px] leading-snug text-[var(--text-secondary)]">
        <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
        <span>
          Messages and calls are end-to-end encrypted. No one outside of this chat, not even LinkChat, can read or
          listen to them.
        </span>
      </div>
    </div>
  );
}
