'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AddPeopleSheet } from '@/components/contacts/AddPeopleSheet';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import { normalizeUsername } from '@/lib/username';
import { LinkLogo } from '@/components/brand/LinkLogo';
import type { Chat } from '@/types';

export default function AddByUsernamePage() {
  const params = useParams();
  const router = useRouter();
  const { upsertChat } = useChatStore();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [open, setOpen] = useState(false);
  const raw = typeof params.username === 'string' ? params.username : '';
  const username = normalizeUsername(decodeURIComponent(raw));
  const returnPath = `/add/${encodeURIComponent(username)}`;

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) setOpen(true);
  }, [isLoading, isAuthenticated]);

  const handleChatReady = (chat: Chat) => {
    upsertChat(chat);
    router.replace(`/chats/${chat.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--list-bg)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--list-bg)] px-6 text-center">
        <LinkLogo size="lg" />
        <h1 className="mt-8 text-2xl font-semibold text-[var(--text-primary)]">Join LinkChat</h1>
        <p className="mt-3 max-w-sm text-[var(--text-secondary)]">
          Someone shared their contact with you. Create a free account to add{' '}
          <span className="font-semibold text-[var(--accent)]">@{username}</span> and start chatting.
        </p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Use your phone number — demo code is <strong>0000</strong>
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <Link
            href={`/auth/register?next=${encodeURIComponent(returnPath)}`}
            className="rounded-xl bg-[var(--accent)] py-3 font-semibold text-white"
          >
            Create account
          </Link>
          <Link
            href={`/auth/login?next=${encodeURIComponent(returnPath)}`}
            className="rounded-xl border border-[var(--border-glass)] py-3 font-medium text-[var(--text-primary)]"
          >
            I already have LinkChat
          </Link>
        </div>
        <p className="mt-6 text-xs text-[var(--text-secondary)]">
          Always open <strong>https://link-chats.com</strong> — not an IP link
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-[var(--list-bg)] p-6 text-center">
      <p className="text-sm text-[var(--text-secondary)]">Opening contact…</p>
      <AddPeopleSheet
        open={open}
        onClose={() => router.replace('/chats')}
        onChatReady={handleChatReady}
        initialTab="username"
        initialUsername={username}
      />
    </div>
  );
}
