'use client';

import { useEffect, useState } from 'react';
import { Copy, QrCode, Share2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { buildContactQrUrl, generateContactQrDataUrl } from '@/lib/qr-contact';
import { formatUsername } from '@/lib/username';

interface QrContactCardProps {
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  compact?: boolean;
}

export function QrContactCard({ displayName, username, avatarUrl, compact = false }: QrContactCardProps) {
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!username) return;
    void generateContactQrDataUrl(username).then(setQrUrl);
  }, [username]);

  const shareUrl = username ? buildContactQrUrl(username) : '';

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!username) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-glass)] bg-[var(--search-bg)] px-6 py-10 text-center">
        <QrCode className="mx-auto mb-3 h-10 w-10 text-[var(--text-secondary)]" />
        <p className="text-sm font-medium text-[var(--text-primary)]">Set a username first</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Add a username in Profile to generate your QR code.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl bg-gradient-to-b from-[var(--bg-panel)] to-[var(--search-bg)] text-center ${
        compact ? 'px-4 py-5' : 'px-6 py-8'
      }`}
    >
      <div className="mb-4 flex flex-col items-center">
        <Avatar src={avatarUrl} name={displayName} size={compact ? 'lg' : 'xl'} />
        <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{displayName}</p>
        <p className="text-sm font-medium text-[var(--accent-dark)]">{formatUsername(username)}</p>
      </div>

      <div className="mx-auto inline-block rounded-2xl bg-white p-3 shadow-md">
        {qrUrl ? (
          <img src={qrUrl} alt="Your LinkChat QR code" className="h-52 w-52" />
        ) : (
          <div className="flex h-52 w-52 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-[var(--text-secondary)]">
        Scan to add you on LinkChat — like WhatsApp
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--search-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] ring-1 ring-[var(--border-glass)]"
        >
          <Copy className="h-4 w-4" />
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            type="button"
            onClick={() => void navigator.share({ title: 'Add me on LinkChat', url: shareUrl })}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        )}
      </div>
    </div>
  );
}
