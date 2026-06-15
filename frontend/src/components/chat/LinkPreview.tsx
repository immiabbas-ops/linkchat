'use client';

import { linkPreviewLabel } from '@/lib/link-utils';

interface LinkPreviewProps {
  url: string;
  isOwn?: boolean;
}

export function LinkPreview({ url, isOwn }: LinkPreviewProps) {
  const { host, path } = linkPreviewLabel(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`mt-1 block rounded-lg border px-2 py-1.5 text-left ${
        isOwn ? 'border-white/20 bg-black/10' : 'border-[var(--border-glass)] bg-black/[0.03]'
      }`}
    >
      <p className="truncate text-[13px] font-medium">{host}</p>
      {path && <p className="truncate text-[11px] opacity-70">{path}</p>}
    </a>
  );
}
