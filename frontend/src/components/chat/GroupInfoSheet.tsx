'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ExternalLink,
  FileText,
  LogOut,
  Pencil,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';
import { extractUrls } from '@/lib/link-utils';
import { useContactStore } from '@/store/contact-store';
import { useAuthStore } from '@/store/auth-store';
import type { Chat, Contact } from '@/types';

interface MediaItem {
  id: string;
  type: string;
  content?: string;
  createdAt: string;
  sender?: string;
  mediaFiles?: { url: string; fileName: string }[];
}

interface GroupInfoSheetProps {
  chat: Chat | undefined;
  chatId: string;
  open: boolean;
  onClose: () => void;
  onUpdated?: (chat: Chat) => void;
  onLeft?: () => void;
}

type Tab = 'members' | 'media' | 'docs' | 'links';

export function GroupInfoSheet({ chat, chatId, open, onClose, onUpdated, onLeft }: GroupInfoSheetProps) {
  const { user } = useAuthStore();
  const { contacts, fetchContacts } = useContactStore();
  const [tab, setTab] = useState<Tab>('members');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneChips, setPhoneChips] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = chat?.members?.find((m) => m.id === user?.id)?.role === 'admin';

  useEffect(() => {
    if (open) {
      setName(chat?.title || '');
      setDescription(chat?.description || '');
      void fetchContacts();
    }
  }, [open, chat?.title, chat?.description, fetchContacts]);

  useEffect(() => {
    if (!open || tab === 'members' || !chatId) return;
    setLoading(true);
    const mediaType = tab === 'media' ? 'media' : tab === 'docs' ? 'docs' : 'links';
    api
      .get<MediaItem[]>(`/chats/${chatId}/media?type=${mediaType}`)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, chatId, tab]);

  const filteredContacts = contacts.filter(
    (c) =>
      !chat?.members?.some((m) => m.id === c.contactUserId) &&
      (c.savedName.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query.replace(/\D/g, ''))),
  );

  const saveDetails = async () => {
    const updated = await api.patch<Chat>(`/chats/${chatId}`, {
      name: name.trim(),
      description: description.trim() || undefined,
    });
    onUpdated?.(updated);
    setEditing(false);
  };

  const addMembers = async () => {
    const phones = [...phoneChips];
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length >= 7 && !phones.includes(digits)) phones.push(digits);

    if (selected.size === 0 && phones.length === 0) {
      setError('Select contacts or add a phone number');
      return;
    }

    setAdding(true);
    setError('');
    try {
      const updated = await api.post<Chat>(`/chats/${chatId}/members`, {
        userIds: Array.from(selected),
        phones,
      });
      onUpdated?.(updated);
      setShowAddMembers(false);
      setSelected(new Set());
      setPhoneChips([]);
      setPhoneInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add members');
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Remove this member from the group?')) return;
    const updated = await api.post<Chat>(`/chats/${chatId}/members/${memberId}/remove`);
    onUpdated?.(updated);
  };

  const leaveGroup = async () => {
    if (!confirm('Leave this group?')) return;
    await api.post(`/chats/${chatId}/leave`);
    onLeft?.();
    onClose();
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'members', label: 'Members' },
    { id: 'media', label: 'Media' },
    { id: 'docs', label: 'Docs' },
    { id: 'links', label: 'Links' },
  ];

  return (
    <AnimatePresence>
      {open && chat && (
        <>
          <motion.button
            type="button"
            aria-label="Close group info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-[201] flex w-full max-w-md flex-col bg-[var(--list-bg)] shadow-2xl"
          >
            <header className="safe-top flex items-center gap-3 border-b border-[var(--border-glass)] px-4 py-3">
              <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-black/[0.05]">
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold">Group info</h2>
            </header>

            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col items-center gap-3 px-6 py-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent)]/15">
                  <Users className="h-12 w-12 text-[var(--accent)]" />
                </div>
                {editing ? (
                  <div className="w-full space-y-2">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-2.5 text-center text-lg focus:outline-none"
                    />
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Description"
                      className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-2 text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void saveDetails()}
                      className="w-full rounded-xl bg-[var(--accent)] py-2 text-sm font-semibold text-white"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">{chat.title}</h3>
                    {chat.description && (
                      <p className="text-center text-sm text-[var(--text-secondary)]">{chat.description}</p>
                    )}
                    <p className="text-sm text-[var(--text-secondary)]">
                      Group · {chat.members?.length || 0} participants
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-1 text-sm text-[var(--accent)]"
                      >
                        <Pencil className="h-4 w-4" /> Edit group info
                      </button>
                    )}
                  </>
                )}
                <p className="text-xs text-[var(--text-secondary)]">🔒 End-to-end encrypted</p>
              </div>

              <div className="flex border-b border-[var(--border-glass)]">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex-1 py-3 text-sm font-medium ${
                      tab === t.id ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'members' ? (
                <div className="px-3 py-3">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowAddMembers((v) => !v)}
                      className="mb-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-black/[0.04]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15">
                        <UserPlus className="h-5 w-5 text-[var(--accent)]" />
                      </div>
                      <span className="font-medium text-[var(--accent-dark)]">Add participants</span>
                    </button>
                  )}

                  {showAddMembers && (
                    <div className="mb-4 space-y-3 rounded-xl border border-[var(--border-glass)] p-3">
                      <div className="flex items-center gap-2 rounded-xl bg-[var(--search-bg)] px-3 py-2">
                        <Search className="h-4 w-4 text-[var(--text-secondary)]" />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search contacts"
                          className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="Or enter phone number"
                          className="min-w-0 flex-1 rounded-lg border border-[var(--border-glass)] px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      {phoneChips.map((p) => (
                        <span key={p} className="mr-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-1 text-xs">
                          +{p}
                          <button type="button" onClick={() => setPhoneChips((prev) => prev.filter((x) => x !== p))}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <div className="max-h-40 overflow-y-auto">
                        {filteredContacts.map((c: Contact) => (
                          <button
                            key={c.contactUserId}
                            type="button"
                            onClick={() =>
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(c.contactUserId)) next.delete(c.contactUserId);
                                else next.add(c.contactUserId);
                                return next;
                              })
                            }
                            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-black/[0.04]"
                          >
                            <Avatar name={c.savedName} size="sm" />
                            <span className="flex-1 text-left text-sm">{c.savedName}</span>
                            {selected.has(c.contactUserId) && <Check className="h-4 w-4 text-[var(--accent)]" />}
                          </button>
                        ))}
                      </div>
                      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
                      <button
                        type="button"
                        disabled={adding}
                        onClick={() => void addMembers()}
                        className="w-full rounded-lg bg-[var(--accent)] py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {adding ? 'Adding…' : 'Add to group'}
                      </button>
                    </div>
                  )}

                  {chat.members?.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-black/[0.03]">
                      <Avatar src={m.avatarUrl} name={m.displayName || 'Member'} size="md" online={m.isOnline} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--text-primary)]">
                          {m.displayName || 'Member'}
                          {m.id === user?.id && ' (You)'}
                        </p>
                        {m.role === 'admin' && (
                          <p className="text-xs text-[var(--accent)]">Group admin</p>
                        )}
                      </div>
                      {isAdmin && m.id !== user?.id && m.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => void removeMember(m.id)}
                          className="rounded-full p-2 text-[var(--danger)] hover:bg-red-500/10"
                          aria-label="Remove member"
                        >
                          <UserMinus className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => void leaveGroup()}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 py-3 text-[var(--danger)]"
                  >
                    <LogOut className="h-5 w-5" />
                    Exit group
                  </button>
                </div>
              ) : loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                </div>
              ) : tab === 'links' ? (
                <div className="space-y-1 px-4 py-3">
                  {items.flatMap((item) =>
                    extractUrls(item.content || '').map((url) => (
                      <a
                        key={`${item.id}-${url}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-black/[0.04]"
                      >
                        <ExternalLink className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                        <span className="truncate text-sm text-[var(--accent-dark)]">{url}</span>
                      </a>
                    )),
                  )}
                  {items.length === 0 && (
                    <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No links shared yet</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 p-2">
                  {items.map((item) =>
                    item.mediaFiles?.map((f) => (
                      <a
                        key={f.url}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square overflow-hidden rounded-lg bg-black/5"
                      >
                        {tab === 'docs' ? (
                          <div className="flex h-full flex-col items-center justify-center gap-1 p-2">
                            <FileText className="h-8 w-8 text-[var(--accent)]" />
                            <span className="line-clamp-2 text-center text-[10px]">{f.fileName}</span>
                          </div>
                        ) : (
                          <img src={f.url} alt="" className="h-full w-full object-cover" />
                        )}
                      </a>
                    )),
                  )}
                  {items.length === 0 && (
                    <p className="col-span-3 py-8 text-center text-sm text-[var(--text-secondary)]">Nothing here yet</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
