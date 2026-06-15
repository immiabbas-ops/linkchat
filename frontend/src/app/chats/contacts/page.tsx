'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Search } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useContactStore } from '@/store/contact-store';
import { useChatStore } from '@/store/chat-store';
import { api } from '@/lib/api';
import { formatPhoneDisplay } from '@/lib/presence';
import type { Chat } from '@/types';

export default function ContactsPage() {
  const { contacts, fetchContacts, isLoading } = useContactStore();
  const { upsertChat } = useChatStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    void fetchContacts();
  }, [fetchContacts]);

  const filtered = contacts.filter(
    (c) =>
      c.savedName.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query.replace(/\D/g, '')),
  );

  const openChat = async (contactUserId: string) => {
    const chat = await api.post<Chat>('/chats/private', { participantId: contactUserId });
    upsertChat(chat);
    window.location.href = `/chats/${chat.id}`;
  };

  return (
    <div className="flex h-full flex-col bg-[var(--list-bg)]">
      <header className="safe-top border-b border-black/[0.06] bg-[var(--list-bg)] px-4 pb-3 pt-3">
        <div className="mb-3 flex items-center gap-3">
          <Link href="/chats" className="rounded-full p-2 hover:bg-black/[0.05]">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-[22px] font-semibold text-[var(--accent-dark)]">Contacts</h1>
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
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-dark)] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-[var(--text-secondary)]">
            {contacts.length === 0 ? 'No saved contacts yet. Add someone from a chat.' : 'No matches'}
          </p>
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
    </div>
  );
}
