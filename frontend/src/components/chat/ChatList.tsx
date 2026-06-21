'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MessageSquarePlus, Pin, X, MoreVertical, Archive, Lock, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { useChatStore } from '@/store/chat-store';
import { AddPeopleSheet } from '@/components/contacts/AddPeopleSheet';
import { formatMessageTime, cn } from '@/lib/utils';
import { getPresenceLabel } from '@/lib/presence';
import { getChatDisplayTitle } from '@/lib/phone';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useConnectorStore } from '@/store/connector-store';
import { LinkedConnectorRow } from '@/components/chat/LinkedConnectorRow';
import { NewGroupSheet, type NewGroupPayload } from '@/components/chat/NewGroupSheet';
import { setupChatKeys, distributeChatKeys } from '@/lib/e2ee';
import { isE2eePayload } from '@/lib/e2ee';
import { NewSmsButton } from '@/components/sim/NewSmsButton';
import { useSimStore } from '@/store/sim-store';
import type { Chat } from '@/types';
import { sortChats } from '@/lib/chat-sort';
import { ConnectionBanner } from './ConnectionBanner';

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
      : chat.lastMessage?.type === 'VIDEO'
        ? '🎬 Video'
        : chat.lastMessage?.type === 'VOICE'
        ? '🎤 Voice message'
        : chat.lastMessage?.type === 'LOCATION'
          ? '📍 Location'
          : chat.lastMessage?.type === 'DOCUMENT'
            ? '📄 Document'
            : isE2eePayload(chat.lastMessage?.content)
              ? '🔒 Message'
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
              {chat.type === 'GROUP' && (
                <Users className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />
              )}
              {chat.isEncrypted && chat.source !== 'SMS' && chat.source !== 'TELEGRAM' && (
                <Lock className="h-3 w-3 shrink-0 text-[var(--text-secondary)]" />
              )}
              {chat.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />}
              {chat.source === 'TELEGRAM' && (
                <span className="shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700">
                  TG
                </span>
              )}
              {chat.source === 'SMS' && (
                <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                  SMS
                </span>
              )}
              <h3
                className={cn(
                  'truncate text-[17px] text-[var(--text-primary)]',
                  unread > 0 ? 'font-semibold md:font-normal' : 'font-normal',
                )}
              >
                {getChatDisplayTitle(chat)}
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
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-semibold text-white">
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

export function ChatList({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { chats, fetchChats, isLoadingChats, typingUsers, recordingUsers, upsertChat } = useChatStore();
  const { connectors, fetchConnectors } = useConnectorStore();
  const { activated: simActive, fetchStatus: fetchSimStatus } = useSimStore();
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChats();
    fetchConnectors();
    void fetchSimStatus();
  }, [fetchChats, fetchConnectors, fetchSimStatus]);

  const filteredConnectors = connectors.filter((c) => {
    if (c.type === 'TELEGRAM' && c.config?.live) return false;
    const q = search.toLowerCase();
    return c.label.toLowerCase().includes(q) || c.identifier.toLowerCase().includes(q);
  });

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
  const sorted = sortChats(filtered);
  const unreadFiltered = filterUnread ? sorted.filter((c) => (c.unreadCount || 0) > 0) : sorted;
  const activeChats = unreadFiltered.filter((c) => !c.isArchived);
  const archivedChats = unreadFiltered.filter((c) => c.isArchived);

  const unarchiveChat = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await api.post(`/chats/${chatId}/unarchive`);
    fetchChats();
  };

  const handleChatReady = (chat: Chat) => {
    upsertChat(chat);
    router.push(`/chats/${chat.id}`);
  };

  const handleMenuAction = (action: string) => {
    setShowMenu(false);
    if (action === 'new-chat') setShowNewChat(true);
    if (action === 'new-group') setShowNewGroup(true);
  };

  const createGroup = async (payload: NewGroupPayload) => {
    try {
      const body: {
        name: string;
        participantIds?: string[];
        participantPhones?: string[];
        description?: string;
      } = { name: payload.name };
      if (payload.participantIds.length) body.participantIds = payload.participantIds;
      if (payload.participantPhones.length) body.participantPhones = payload.participantPhones;
      if (payload.description) body.description = payload.description;

      const chat = await api.post<Chat>('/chats/group', body);
      upsertChat(chat);
      const userId = user?.id;
      if (userId && chat.isEncrypted && chat.members?.length) {
        const memberIds = chat.members.map((m) => m.id);
        await setupChatKeys(chat.id, memberIds, userId);
        await distributeChatKeys(
          chat.id,
          memberIds.filter((id) => id !== userId),
          userId,
        );
      }
      await fetchChats();
      router.push(`/chats/${chat.id}`);
    } catch (err) {
      console.error('Failed to create group', err);
      alert('Could not create group. Check participants and try again.');
    }
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--list-bg)]">
      <header className="safe-top bg-[var(--list-bg)]">
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <h1 className="text-[22px] font-semibold text-[var(--accent-dark)]">LinkChat</h1>
          <div className="flex items-center gap-2">
            {simActive && <NewSmsButton />}
            {!embedded && (
              <button
                type="button"
                onClick={() => setShowNewChat(true)}
                className="rounded-full p-2 text-[var(--accent-dark)] hover:bg-black/[0.05]"
                aria-label="New chat"
              >
                <MessageSquarePlus className="h-6 w-6" />
              </button>
            )}
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
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setFilterUnread((v) => !v)}
              className={cn(
                'rounded-full px-3 py-1 text-[13px] font-medium transition-colors',
                filterUnread
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--search-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              )}
            >
              Unread
            </button>
          </div>
        </div>
      </header>

      <ConnectionBanner />

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

      <AddPeopleSheet
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onChatReady={handleChatReady}
      />

      <NewGroupSheet open={showNewGroup} onClose={() => setShowNewGroup(false)} onCreate={createGroup} />
    </div>
  );
}
