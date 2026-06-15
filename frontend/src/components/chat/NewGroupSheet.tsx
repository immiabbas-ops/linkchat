'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Search, Users, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useContactStore } from '@/store/contact-store';
import type { Contact } from '@/types';

interface NewGroupSheetProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, participantIds: string[]) => Promise<void>;
}

export function NewGroupSheet({ open, onClose, onCreate }: NewGroupSheetProps) {
  const { contacts, fetchContacts } = useContactStore();
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) void fetchContacts();
  }, [open, fetchContacts]);

  useEffect(() => {
    if (!open) {
      setName('');
      setQuery('');
      setSelected(new Set());
      setError('');
    }
  }, [open]);

  const filtered = contacts.filter(
    (c) =>
      c.savedName.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query.replace(/\D/g, '')),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter a group name');
      return;
    }
    if (selected.size === 0) {
      setError('Select at least one contact');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onCreate(name.trim(), Array.from(selected));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create group');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] bg-black/55"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-x-0 bottom-0 z-[211] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl bg-[var(--list-bg)] shadow-2xl sm:mx-auto sm:max-w-md sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-5 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[var(--accent)]" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">New group</h3>
              </div>
              <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-black/[0.05]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => void submit(e)} className="flex min-h-0 flex-1 flex-col">
              <div className="space-y-3 px-5 py-4">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Group name"
                  className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                />
                <div className="flex items-center gap-2 rounded-xl bg-[var(--search-bg)] px-3 py-2">
                  <Search className="h-4 w-4 text-[var(--text-secondary)]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search contacts"
                    className="min-w-0 flex-1 bg-transparent text-[15px] focus:outline-none"
                  />
                </div>
                {selected.size > 0 && (
                  <p className="text-xs text-[var(--text-secondary)]">{selected.size} selected</p>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                {filtered.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]">
                    {contacts.length === 0
                      ? 'Save contacts first to add them to a group'
                      : 'No contacts match your search'}
                  </p>
                ) : (
                  filtered.map((c: Contact) => (
                    <button
                      key={c.contactUserId}
                      type="button"
                      onClick={() => toggle(c.contactUserId)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-black/[0.04]"
                    >
                      <Avatar name={c.savedName} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--text-primary)]">{c.savedName}</p>
                        <p className="text-xs text-[var(--text-secondary)]">+{c.phone}</p>
                      </div>
                      {selected.has(c.contactUserId) && (
                        <Check className="h-5 w-5 text-[var(--accent)]" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {error && <p className="px-5 pb-2 text-sm text-[var(--danger)]">{error}</p>}

              <div className="safe-bottom border-t border-[var(--border-glass)] px-5 py-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-[var(--accent)] py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving ? 'Creating…' : 'Create group'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
