'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, QrCode, Search, UserPlus } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { AddPeopleSheet } from '@/components/contacts/AddPeopleSheet';
import { QrContactCard } from '@/components/contacts/QrContactCard';
import { useContactStore } from '@/store/contact-store';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';
import { formatPhoneDisplay } from '@/lib/presence';
import { formatUsername } from '@/lib/username';
import type { Chat } from '@/types';

export default function ContactsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { contacts, fetchContacts, isLoading } = useContactStore();
  const { upsertChat } = useChatStore();
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showMyQr, setShowMyQr] = useState(false);

  useEffect(() => {
    void fetchContacts();
  }, [fetchContacts]);

  const filtered = contacts.filter(
    (c) =>
      c.savedName.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query.replace(/\D/g, '')),
  );

  const handleChatReady = (chat: Chat) => {
    upsertChat(chat);
    router.push(`/chats/${chat.id}`);
  };

  const openChat = async (contactUserId: string) => {
    const chat = await api.post<Chat>('/chats/private', { participantId: contactUserId });
    handleChatReady(chat);
  };

  return (
    <div className="flex h-full flex-col bg-[var(--list-bg)]">
      <header className="safe-top border-b border-black/[0.06] bg-[var(--list-bg)] px-4 pb-3 pt-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/chats" className="rounded-full p-2 hover:bg-black/[0.05]">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-[22px] font-semibold text-[var(--accent-dark)]">Contacts</h1>
              <p className="text-xs text-[var(--text-secondary)]">Add by username or scan QR</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            Add
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-full bg-[var(--search-bg)] px-4 py-2.5">
          <Search className="h-5 w-5 text-[var(--text-secondary)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts"
            className="min-w-0 flex-1 bg-transparent text-[15px] focus:outline-none"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setShowMyQr((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--search-bg)] px-3 py-1.5 text-xs font-medium text-[var(--accent-dark)] ring-1 ring-[var(--border-glass)]"
          >
            <QrCode className="h-3.5 w-3.5" />
            {showMyQr ? 'Hide my QR' : 'My QR code'}
          </button>
          {user?.profile?.username && (
            <span className="inline-flex items-center rounded-full bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent-dark)]">
              {formatUsername(user.profile.username)}
            </span>
          )}
        </div>

        {showMyQr && (
          <div className="mt-4">
            <QrContactCard
              compact
              displayName={user?.profile?.displayName}
              username={user?.profile?.username}
              avatarUrl={user?.profile?.avatarUrl}
            />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-dark)] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[var(--text-secondary)]">
              {contacts.length === 0 ? 'No saved contacts yet' : 'No matches'}
            </p>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="mt-4 text-sm font-medium text-[var(--accent-dark)]"
            >
              Add someone by username or QR
            </button>
          </div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void openChat(c.contactUserId)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.04]"
            >
              <Avatar name={c.savedName} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] text-[var(--text-primary)]">{c.savedName}</p>
                <p className="truncate text-[14px] text-[var(--text-secondary)]">{formatPhoneDisplay(c.phone)}</p>
                {c.notes && <p className="truncate text-xs text-[var(--text-secondary)]">{c.notes}</p>}
              </div>
              <MessageCircle className="h-5 w-5 shrink-0 text-[var(--accent-dark)]" />
            </button>
          ))
        )}
      </div>

      <AddPeopleSheet open={showAdd} onClose={() => setShowAdd(false)} onChatReady={handleChatReady} />
    </div>
  );
}
