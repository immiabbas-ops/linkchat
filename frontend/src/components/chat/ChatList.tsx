'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Search, MessageSquarePlus, Pin, X, MoreVertical, Archive } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { useChatStore } from '@/store/chat-store';
import { MIN_PHONE_SEARCH_DIGITS, useContactStore } from '@/store/contact-store';
import { formatMessageTime, cn } from '@/lib/utils';
import { formatPhoneDisplay, getPresenceLabel } from '@/lib/presence';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useConnectorStore } from '@/store/connector-store';
import { LinkedConnectorRow } from '@/components/chat/LinkedConnectorRow';
import { NewGroupSheet } from '@/components/chat/NewGroupSheet';
import type { Chat } from '@/types';

type NewChatTab = 'number' | 'contacts';

function ChatListItem({
  chat,
  typing,
  recording,
  currentUserId,
}: {
  chat: Chat;
  typing: { userId: string; displayName?: string }[];
  recording: { userId: string; displayName?: string }[];
  currentUserId?: string;
}) {
  const presence = getPresenceLabel(typing, recording, currentUserId);
  const unread = chat.unreadCount || 0;

  const preview = presence
    ? presence
    : chat.lastMessage?.type === 'IMAGE'
      ? '📷 Photo'
      : chat.lastMessage?.type === 'VOICE'
        ? '🎤 Voice message'
        : chat.lastMessage?.type === 'LOCATION'
          ? '📍 Location'
          : chat.lastMessage?.type === 'DOCUMENT'
            ? '📄 Document'
            : chat.lastMessage?.content || 'No messages yet';

  return (
    <Link href={`/chats/${chat.id}`}>
      <motion.div
        whileTap={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
        className="flex items-center gap-3 px-4 py-3"
      >
        <Avatar src={chat.avatarUrl} name={chat.title} online={chat.isOnline} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {chat.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />}
              {chat.source === 'TELEGRAM' && (
                <span className="shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700">
                  TG
                </span>
              )}
              <h3
                className={cn(
                  'truncate text-[17px] text-[var(--text-primary)]',
                  unread > 0 ? 'font-semibold md:font-normal' : 'font-normal',
                )}
              >
                {chat.title}
              </h3>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {chat.lastMessage && (
                <span
                  className={cn(
                    'text-[12px]',
                    unread > 0
                      ? 'font-medium text-[var(--accent-dark)] md:font-normal md:text-[var(--text-secondary)]'
                      : 'text-[var(--text-secondary)]',
                  )}
                >
                  {formatMessageTime(chat.lastMessage.createdAt)}
                </span>
              )}
              {unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-semibold text-white md:hidden">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </div>
          </div>
          <p
            className={cn(
              'mt-0.5 truncate text-[14px]',
              presence
                ? 'font-medium text-[var(--accent-dark)]'
                : unread > 0
                  ? 'font-medium text-[var(--text-primary)] md:font-normal md:text-[var(--text-secondary)]'
                  : 'text-[var(--text-secondary)]',
            )}
          >
            {preview}
          </p>
        </div>
      </motion.div>
    </Link>
  );
}

const menuItems = [
  { label: 'New chat', action: 'new-chat' as const },
  { label: 'New group', action: 'new-group' as const },
  { label: 'Contacts', href: '/chats/contacts' },
  { label: 'Link more apps', href: '/hub?service=linkchats' },
  { label: 'Linked devices', href: '/settings/devices' },
  { label: 'Profile', href: '/settings/profile' },
  { label: 'Settings', href: '/settings' },
];

export function ChatList() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { chats, fetchChats, isLoadingChats, typingUsers, recordingUsers, upsertChat } = useChatStore();
  const { connectors, fetchConnectors } = useConnectorStore();
  const { contacts, fetchContacts } = useContactStore();
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newChatTab, setNewChatTab] = useState<NewChatTab>('number');
  const [contactQuery, setContactQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [users, setUsers] = useState<
    { id: string; profile?: { displayName?: string; phone?: string } }[]
  >([]);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (!showNewChat) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showNewChat]);

  useEffect(() => {
    fetchChats();
    fetchConnectors();
    void fetchContacts();
  }, [fetchChats, fetchConnectors, fetchContacts]);

  const filteredConnectors = connectors.filter((c) => {
    if (c.type === 'TELEGRAM' && c.config?.live) return false;
    const q = search.toLowerCase();
    return c.label.toLowerCase().includes(q) || c.identifier.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (!showNewChat) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNewChat(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showNewChat]);

  useEffect(() => {
    if (!showMenu) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [showMenu]);

  const filtered = chats.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
  const activeChats = filtered.filter((c) => !c.isArchived);
  const archivedChats = filtered.filter((c) => c.isArchived);

  const unarchiveChat = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await api.post(`/chats/${chatId}/unarchive`);
    fetchChats();
  };

  const searchUsers = async (digits: string) => {
    setSearchError('');
    setIsSearching(true);
    try {
      const result = await api.get<
        { id: string; profile?: { displayName?: string; phone?: string } }[]
      >(`/users/search?q=${encodeURIComponent(digits)}`);
      setUsers(result);
      if (result.length === 0) {
        setSearchError('No user found with this mobile number');
      }
    } catch {
      setUsers([]);
      setSearchError('Search failed. Try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const onPhoneQueryChange = (q: string) => {
    setPhoneQuery(q);
    setSearchError('');
    setUsers([]);

    const digits = q.replace(/\D/g, '');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (digits.length < MIN_PHONE_SEARCH_DIGITS) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      void searchUsers(digits);
    }, 350);
  };

  const startChat = async (participantId: string) => {
    const chat = await api.post<Chat>('/chats/private', { participantId });
    upsertChat(chat);
    setShowNewChat(false);
    setPhoneQuery('');
    setUsers([]);
    setSearchError('');
    router.push(`/chats/${chat.id}`);
  };

  const handleMenuAction = (action: string) => {
    setShowMenu(false);
    if (action === 'new-chat') setShowNewChat(true);
    if (action === 'new-group') setShowNewGroup(true);
  };

  const createGroup = async (name: string, participantIds: string[]) => {
    const chat = await api.post<Chat>('/chats/group', { name, participantIds });
    upsertChat(chat);
    await fetchChats();
    router.push(`/chats/${chat.id}`);
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.savedName.toLowerCase().includes(contactQuery.toLowerCase()) ||
      c.phone.includes(contactQuery.replace(/\D/g, '')),
  );

  return (
    <div className="relative flex h-full flex-col bg-[var(--list-bg)]">
      <header className="safe-top bg-[var(--list-bg)]">
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <h1 className="text-[22px] font-semibold text-[var(--accent-dark)]">LinkChat</h1>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu((v) => !v);
              }}
              className="rounded-full p-2 text-[var(--text-primary)] hover:bg-black/[0.05]"
              aria-label="Menu"
            >
              <MoreVertical className="h-6 w-6" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-xl bg-[var(--list-bg)] py-2 shadow-lg ring-1 ring-black/10">
                {menuItems.map((item) =>
                  item.href ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setShowMenu(false)}
                      className="block px-5 py-3 text-[15px] text-[var(--text-primary)] hover:bg-black/[0.04]"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleMenuAction(item.action!)}
                      className="block w-full px-5 py-3 text-left text-[15px] text-[var(--text-primary)] hover:bg-black/[0.04]"
                    >
                      {item.label}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-3 rounded-full bg-[var(--search-bg)] px-4 py-2.5">
            <Search className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="shrink-0 text-[var(--text-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {isLoadingChats ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-dark)] border-t-transparent" />
          </div>
        ) : activeChats.length === 0 && archivedChats.length === 0 && filteredConnectors.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <p className="text-[var(--text-secondary)]">No chats yet</p>
            <button
              type="button"
              onClick={() => setShowNewChat(true)}
              className="mt-4 text-sm font-medium text-[var(--accent-dark)]"
            >
              Start a conversation
            </button>
            <Link
              href="/hub?service=linkchats"
              className="mt-3 text-sm font-medium text-[var(--accent-dark)]"
            >
              Connect Telegram, Email & more
            </Link>
          </div>
        ) : (
          <>
            {filteredConnectors.length > 0 && (
              <div className="border-b border-black/[0.06] pb-1">
                <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Linked apps
                </p>
                {filteredConnectors.map((connector) => (
                  <LinkedConnectorRow key={connector.id} connector={connector} />
                ))}
              </div>
            )}
            {activeChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                typing={typingUsers[chat.id] || []}
                recording={recordingUsers[chat.id] || []}
                currentUserId={user?.id}
              />
            ))}
            {archivedChats.length > 0 && (
              <div className="border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowArchived((v) => !v)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-[var(--text-secondary)] hover:bg-black/[0.03]"
                >
                  <Archive className="h-5 w-5" />
                  <span className="text-[14px]">Archived ({archivedChats.length})</span>
                </button>
                {showArchived &&
                  archivedChats.map((chat) => (
                    <div key={chat.id} className="relative">
                      <ChatListItem
                        chat={chat}
                        typing={typingUsers[chat.id] || []}
                        recording={recordingUsers[chat.id] || []}
                        currentUserId={user?.id}
                      />
                      <button
                        type="button"
                        onClick={(e) => void unarchiveChat(chat.id, e)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-[var(--search-bg)] px-3 py-1 text-[11px] text-[var(--accent-dark)]"
                      >
                        Unarchive
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowNewChat(true)}
        className="wa-fab fixed bottom-[88px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl md:bottom-6"
        aria-label="New chat"
      >
        <MessageSquarePlus className="h-6 w-6" />
      </button>

      {portalReady &&
        showNewChat &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 sm:items-center sm:p-4"
            onClick={() => setShowNewChat(false)}
            role="presentation"
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[min(92dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-[var(--list-bg)] shadow-2xl sm:rounded-2xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-5 py-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">New chat</h3>
                <button
                  type="button"
                  onClick={() => setShowNewChat(false)}
                  className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-black/[0.05]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 safe-bottom">
                <div className="mb-4 flex gap-1 rounded-xl bg-[var(--search-bg)] p-1">
                  {(['number', 'contacts'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setNewChatTab(tab)}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                        newChatTab === tab
                          ? 'bg-[var(--list-bg)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {tab === 'number' ? 'By number' : 'Contacts'}
                    </button>
                  ))}
                </div>

                {newChatTab === 'number' ? (
                  <>
                <label htmlFor="new-chat-phone" className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Search by mobile number
                </label>
                <input
                  id="new-chat-phone"
                  value={phoneQuery}
                  onChange={(e) => onPhoneQueryChange(e.target.value)}
                  placeholder="Enter full mobile number"
                  inputMode="tel"
                  autoFocus
                  className="mb-1 w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                />
                <p className="mb-3 text-xs text-[var(--text-secondary)]">
                  Enter the complete number ({MIN_PHONE_SEARCH_DIGITS}+ digits). Partial numbers are not searched.
                </p>
                {isSearching && (
                  <p className="mb-3 text-sm text-[var(--text-secondary)]">Searching…</p>
                )}
                {searchError && (
                  <p className="mb-3 text-sm text-[var(--text-secondary)]">{searchError}</p>
                )}
                <div className="min-h-[120px] flex-1 space-y-1">
                  {users.map((u) => {
                    const phone = formatPhoneDisplay(u.profile?.phone);
                    return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => startChat(u.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-black/[0.04]"
                    >
                      <Avatar name={phone} size="md" />
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--text-primary)]">{phone}</p>
                        <p className="text-xs text-[var(--text-secondary)]">Tap to open chat</p>
                      </div>
                    </button>
                    );
                  })}
                </div>
                  </>
                ) : (
                  <>
                    <input
                      value={contactQuery}
                      onChange={(e) => setContactQuery(e.target.value)}
                      placeholder="Search saved contacts"
                      className="mb-3 w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 text-[15px] focus:outline-none"
                    />
                    <div className="min-h-[120px] flex-1 space-y-1">
                      {filteredContacts.length === 0 ? (
                        <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
                          {contacts.length === 0 ? 'No saved contacts yet' : 'No matches'}
                        </p>
                      ) : (
                        filteredContacts.map((c) => (
                          <button
                            key={c.contactUserId}
                            type="button"
                            onClick={() => startChat(c.contactUserId)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-black/[0.04]"
                          >
                            <Avatar name={c.savedName} size="md" />
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--text-primary)]">{c.savedName}</p>
                              <p className="text-xs text-[var(--text-secondary)]">{formatPhoneDisplay(c.phone)}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>,
          document.body,
        )}

      <NewGroupSheet open={showNewGroup} onClose={() => setShowNewGroup(false)} onCreate={createGroup} />
    </div>
  );
}
