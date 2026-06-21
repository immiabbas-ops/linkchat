'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AtSign, Phone, QrCode, ScanLine, UserPlus, Users, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { QrContactCard } from '@/components/contacts/QrContactCard';
import { QrScannerOverlay } from '@/components/contacts/QrScanner';
import { api } from '@/lib/api';
import { formatPhoneDisplay } from '@/lib/presence';
import { formatUsername, isValidUsername, normalizeUsername } from '@/lib/username';
import { MIN_PHONE_SEARCH_DIGITS, useContactStore } from '@/store/contact-store';
import { useAuthStore } from '@/store/auth-store';
import type { Chat } from '@/types';

export type AddPeopleTab = 'username' | 'scan' | 'phone' | 'myqr' | 'contacts';

interface FoundUser {
  id: string;
  profile?: {
    displayName?: string;
    username?: string;
    phone?: string;
    avatarUrl?: string;
  };
}

interface AddPeopleSheetProps {
  open: boolean;
  onClose: () => void;
  onChatReady: (chat: Chat) => void;
  initialTab?: AddPeopleTab;
  initialUsername?: string;
}

const tabs: { id: AddPeopleTab; label: string; icon: typeof AtSign }[] = [
  { id: 'username', label: 'Username', icon: AtSign },
  { id: 'scan', label: 'Scan', icon: ScanLine },
  { id: 'phone', label: 'Phone', icon: Phone },
  { id: 'myqr', label: 'My QR', icon: QrCode },
  { id: 'contacts', label: 'Contacts', icon: Users },
];

export function AddPeopleSheet({
  open,
  onClose,
  onChatReady,
  initialTab = 'username',
  initialUsername = '',
}: AddPeopleSheetProps) {
  const { user } = useAuthStore();
  const { contacts, fetchContacts } = useContactStore();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<AddPeopleTab>(initialTab);
  const [usernameQuery, setUsernameQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setFoundUser(null);
    setSearchError('');
    setUsernameQuery(initialUsername);
    setPhoneQuery('');
    if (initialUsername) void lookupUsername(initialUsername);
    void fetchContacts();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, initialTab, initialUsername, fetchContacts]);

  const startChat = async (participantId: string) => {
    setIsStarting(true);
    setSearchError('');
    try {
      const chat = await api.post<Chat>('/chats/private', { participantId });
      onChatReady(chat);
      onClose();
    } catch {
      setSearchError('Could not start chat. Try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const lookupUsername = async (raw: string) => {
    const username = normalizeUsername(raw);
    if (!isValidUsername(username)) {
      setFoundUser(null);
      setSearchError('Enter a valid username (e.g. johndoe)');
      return;
    }
    setIsSearching(true);
    setSearchError('');
    try {
      const result = await api.get<FoundUser>(`/users/by-username/${encodeURIComponent(username)}`);
      setFoundUser(result);
    } catch {
      setFoundUser(null);
      setSearchError('No user found with this username');
    } finally {
      setIsSearching(false);
    }
  };

  const lookupPhone = async (digits: string) => {
    setIsSearching(true);
    setSearchError('');
    try {
      const result = await api.get<FoundUser[]>(`/users/search?q=${encodeURIComponent(digits)}`);
      if (result[0]) setFoundUser(result[0]);
      else {
        setFoundUser(null);
        setSearchError('No user found with this mobile number');
      }
    } catch {
      setFoundUser(null);
      setSearchError('Search failed. Try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const onUsernameChange = (value: string) => {
    setUsernameQuery(value);
    setFoundUser(null);
    setSearchError('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const normalized = normalizeUsername(value);
    if (!isValidUsername(normalized)) return;
    searchTimeoutRef.current = setTimeout(() => void lookupUsername(normalized), 350);
  };

  const onPhoneChange = (value: string) => {
    setPhoneQuery(value);
    setFoundUser(null);
    setSearchError('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const digits = value.replace(/\D/g, '');
    if (digits.length < MIN_PHONE_SEARCH_DIGITS) return;
    searchTimeoutRef.current = setTimeout(() => void lookupPhone(digits), 350);
  };

  const handleQrScan = (username: string) => {
    setTab('username');
    setUsernameQuery(username);
    void lookupUsername(username);
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.savedName.toLowerCase().includes(contactQuery.toLowerCase()) ||
      c.phone.includes(contactQuery.replace(/\D/g, '')),
  );

  const renderUserResult = () => {
    if (!foundUser) return null;
    const name = foundUser.profile?.displayName || formatUsername(foundUser.profile?.username) || 'User';
    return (
      <button
        type="button"
        disabled={isStarting}
        onClick={() => void startChat(foundUser.id)}
        className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-[var(--search-bg)] px-4 py-4 text-left ring-1 ring-[var(--border-glass)] transition hover:bg-black/[0.03] disabled:opacity-60"
      >
        <Avatar src={foundUser.profile?.avatarUrl} name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-[var(--text-primary)]">{name}</p>
          {foundUser.profile?.username && (
            <p className="text-sm text-[var(--accent-dark)]">{formatUsername(foundUser.profile.username)}</p>
          )}
          {foundUser.profile?.phone && (
            <p className="text-xs text-[var(--text-secondary)]">{formatPhoneDisplay(foundUser.profile.phone)}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white">
          Chat
        </span>
      </button>
    );
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[220] flex items-end justify-center bg-black/55 sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[min(92dvh,700px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[var(--list-bg)] shadow-2xl sm:rounded-3xl"
          >
            <div className="border-b border-[var(--border-glass)] px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]/15">
                    <UserPlus className="h-5 w-5 text-[var(--accent-dark)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add people</h2>
                    <p className="text-xs text-[var(--text-secondary)]">Username, QR scan, or phone</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-black/[0.05]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-[var(--search-bg)] p-1 scrollbar-hide">
                {tabs.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTab(item.id);
                        setFoundUser(null);
                        setSearchError('');
                      }}
                      className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium whitespace-nowrap sm:text-sm ${
                        tab === item.id
                          ? 'bg-[var(--list-bg)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 safe-bottom">
              {tab === 'username' && (
                <>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Search by username</label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      value={usernameQuery}
                      onChange={(e) => onUsernameChange(e.target.value)}
                      placeholder="e.g. johndoe"
                      autoFocus
                      className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] py-3 pl-10 pr-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">Works with or without @</p>
                  {isSearching && <p className="mt-3 text-sm text-[var(--text-secondary)]">Searching…</p>}
                  {searchError && <p className="mt-3 text-sm text-[var(--danger)]">{searchError}</p>}
                  {renderUserResult()}
                </>
              )}

              {tab === 'scan' && <QrScannerOverlay onClose={() => setTab('username')} onScan={handleQrScan} />}

              {tab === 'phone' && (
                <>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Search by phone</label>
                  <input
                    value={phoneQuery}
                    onChange={(e) => onPhoneChange(e.target.value)}
                    placeholder="Full mobile number"
                    inputMode="tel"
                    className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  />
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    Enter the complete number ({MIN_PHONE_SEARCH_DIGITS}+ digits)
                  </p>
                  {isSearching && <p className="mt-3 text-sm text-[var(--text-secondary)]">Searching…</p>}
                  {searchError && <p className="mt-3 text-sm text-[var(--danger)]">{searchError}</p>}
                  {renderUserResult()}
                </>
              )}

              {tab === 'myqr' && (
                <QrContactCard
                  displayName={user?.profile?.displayName}
                  username={user?.profile?.username}
                  avatarUrl={user?.profile?.avatarUrl}
                />
              )}

              {tab === 'contacts' && (
                <>
                  <input
                    value={contactQuery}
                    onChange={(e) => setContactQuery(e.target.value)}
                    placeholder="Search saved contacts"
                    className="mb-3 w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 text-[15px] focus:outline-none"
                  />
                  <div className="space-y-1">
                    {filteredContacts.length === 0 ? (
                      <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
                        {contacts.length === 0 ? 'No saved contacts yet' : 'No matches'}
                      </p>
                    ) : (
                      filteredContacts.map((c) => (
                        <button
                          key={c.contactUserId}
                          type="button"
                          disabled={isStarting}
                          onClick={() => void startChat(c.contactUserId)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-black/[0.04] disabled:opacity-60"
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
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
