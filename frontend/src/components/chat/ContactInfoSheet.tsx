'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, FileText, Pencil, Phone, Trash2, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { AddToContactSheet } from './AddToContactSheet';
import { api } from '@/lib/api';
import { extractUrls } from '@/lib/link-utils';
import { formatPhoneDisplay } from '@/lib/presence';
import { useContactStore } from '@/store/contact-store';
import type { Chat } from '@/types';

interface MediaItem {
  id: string;
  type: string;
  content?: string;
  createdAt: string;
  sender?: string;
  mediaFiles?: { url: string; fileName: string }[];
}

interface ContactInfoSheetProps {
  chat: Chat | undefined;
  chatId: string;
  open: boolean;
  onClose: () => void;
  onContactRemoved?: () => void;
  onContactUpdated?: () => void;
}

type Tab = 'media' | 'docs' | 'links';

export function ContactInfoSheet({
  chat,
  chatId,
  open,
  onClose,
  onContactRemoved,
  onContactUpdated,
}: ContactInfoSheetProps) {
  const { getByUserId, updateContact, removeContact } = useContactStore();
  const [tab, setTab] = useState<Tab>('media');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const contact = chat?.participantId ? getByUserId(chat.participantId) : undefined;
  const isPrivate = chat?.type === 'PRIVATE';

  useEffect(() => {
    if (!open || !chatId) return;
    setLoading(true);
    api
      .get<MediaItem[]>(`/chats/${chatId}/media?type=${tab}`)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, chatId, tab]);

  const handleRemove = async () => {
    if (!chat?.participantId || !confirm(`Remove ${chat.title} from your contacts?`)) return;
    await removeContact(chat.participantId);
    onContactRemoved?.();
    onClose();
  };

  const tabs: { id: Tab; label: string }[] = [
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
            aria-label="Close contact info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-[var(--list-bg)] shadow-xl"
          >
            <header className="safe-top flex items-center gap-3 bg-[var(--header)] px-3 py-3 text-[var(--header-text)]">
              <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/10">
                <X className="h-6 w-6" />
              </button>
              <h2 className="text-[19px] font-normal">{chat.type === 'GROUP' ? 'Group info' : 'Contact info'}</h2>
            </header>

            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col items-center bg-[var(--header)] px-6 pb-8 pt-6 text-[var(--header-text)]">
                <Avatar
                  src={chat.avatarUrl}
                  name={chat.title}
                  size="xl"
                  className="h-52 w-52 [&_img]:h-52 [&_img]:w-52 [&>div]:h-52 [&>div]:w-52 [&>div]:text-4xl"
                />
                <h3 className="mt-4 text-[22px] font-normal">{chat.title}</h3>
                {chat.isOnline && <p className="mt-1 text-sm text-white/80">online</p>}
                {isPrivate && (chat.participantPhone || contact?.phone) && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-white/85">
                    <Phone className="h-4 w-4" />
                    {formatPhoneDisplay(chat.participantPhone || contact?.phone)}
                  </p>
                )}
                {contact?.notes && (
                  <p className="mt-2 max-w-xs text-center text-sm text-white/70">{contact.notes}</p>
                )}
                {chat.description && <p className="mt-2 text-center text-sm text-white/70">{chat.description}</p>}

                {isPrivate && chat.isContact && chat.participantId && (
                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEdit(true)}
                      className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm hover:bg-white/25"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit contact
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemove()}
                      className="flex items-center gap-2 rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-100 hover:bg-red-500/30"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {chat.type === 'GROUP' && chat.members && chat.members.length > 0 && (
                <div className="mt-2 bg-[var(--list-bg)]">
                  <p className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-[var(--accent-dark)]">
                    {chat.members.length} participants
                  </p>
                  {chat.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 px-6 py-3">
                      <Avatar src={member.avatarUrl} name={member.displayName} online={member.isOnline} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] text-[var(--text-primary)]">{member.displayName || 'Member'}</p>
                        {member.role && member.role !== 'MEMBER' && (
                          <p className="text-xs text-[var(--text-secondary)]">{member.role.toLowerCase()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 bg-[var(--list-bg)]">
                <p className="px-6 pt-4 text-xs text-[var(--accent-dark)]">Media, links and docs</p>
                <div className="flex gap-1 px-4 py-2">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`rounded-full px-4 py-1.5 text-[13px] ${
                        tab === t.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--search-bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                  </div>
                ) : items.length === 0 ? (
                  <p className="px-6 py-6 text-[15px] text-[var(--text-secondary)]">None</p>
                ) : tab === 'media' ? (
                  <div className="grid grid-cols-3 gap-0.5 px-2 pb-4">
                    {items.map((item) => {
                      const url = item.mediaFiles?.[0]?.url;
                      if (!url) return null;
                      return (
                        <a key={item.id} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square overflow-hidden bg-black/5">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </a>
                      );
                    })}
                  </div>
                ) : tab === 'docs' ? (
                  <div className="space-y-1 px-2 pb-4">
                    {items.map((item) => (
                      <a
                        key={item.id}
                        href={item.mediaFiles?.[0]?.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-black/[0.04]"
                      >
                        <FileText className="h-8 w-8 shrink-0 text-[var(--accent-dark)]" />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] text-[var(--text-primary)]">
                            {item.mediaFiles?.[0]?.fileName || item.content}
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)]">{item.sender}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 px-2 pb-4">
                    {items.flatMap((item) =>
                      extractUrls(item.content).map((url) => (
                        <a
                          key={`${item.id}-${url}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-black/[0.04]"
                        >
                          <ExternalLink className="h-5 w-5 shrink-0 text-[var(--accent-dark)]" />
                          <div className="min-w-0">
                            <p className="truncate text-[14px] text-[var(--text-primary)]">{url}</p>
                            <p className="text-[11px] text-[var(--text-secondary)]">{item.sender}</p>
                          </div>
                        </a>
                      )),
                    )}
                    {items.every((i) => !extractUrls(i.content).length) && (
                      <p className="px-4 py-4 text-[var(--text-secondary)]">No links shared yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {contact && chat.participantId && (
            <AddToContactSheet
              open={showEdit}
              phone={contact.phone}
              initialName={contact.savedName}
              initialNotes={contact.notes || ''}
              isEdit
              onClose={() => setShowEdit(false)}
              onSave={async ({ savedName, notes }) => {
                await updateContact(chat.participantId!, { savedName, notes });
                onContactUpdated?.();
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
