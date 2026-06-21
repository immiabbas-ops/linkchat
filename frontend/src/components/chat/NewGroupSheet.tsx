'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Phone, Search, UserPlus, Users, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useContactStore } from '@/store/contact-store';
import type { Contact } from '@/types';

export interface NewGroupPayload {
  name: string;
  participantIds: string[];
  participantPhones: string[];
  description?: string;
}

interface NewGroupSheetProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: NewGroupPayload) => Promise<void>;
}

type Step = 'participants' | 'details';

interface PhoneChip {
  id: string;
  phone: string;
}

export function NewGroupSheet({ open, onClose, onCreate }: NewGroupSheetProps) {
  const { contacts, fetchContacts } = useContactStore();
  const [step, setStep] = useState<Step>('participants');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phoneChips, setPhoneChips] = useState<PhoneChip[]>([]);
  const [phoneInput, setPhoneInput] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) void fetchContacts();
  }, [open, fetchContacts]);

  useEffect(() => {
    if (!open) {
      setStep('participants');
      setName('');
      setDescription('');
      setQuery('');
      setSelected(new Set());
      setPhoneChips([]);
      setPhoneInput('');
      setShowPhoneInput(false);
      setError('');
    }
  }, [open]);

  const filtered = contacts.filter(
    (c) =>
      c.savedName.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query.replace(/\D/g, '')),
  );

  const selectedContacts = contacts.filter((c) => selected.has(c.contactUserId));
  const totalCount = selected.size + phoneChips.length;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addPhone = () => {
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length < 7) {
      setError('Enter a valid phone number');
      return;
    }
    if (phoneChips.some((p) => p.phone === digits)) {
      setError('Number already added');
      return;
    }
    setPhoneChips((prev) => [...prev, { id: `phone-${digits}`, phone: digits }]);
    setPhoneInput('');
    setShowPhoneInput(false);
    setError('');
  };

  const removePhone = (id: string) => {
    setPhoneChips((prev) => prev.filter((p) => p.id !== id));
  };

  const goToDetails = () => {
    if (totalCount === 0) {
      setError('Add at least one participant');
      return;
    }
    setError('');
    setStep('details');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter a group subject');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        participantIds: Array.from(selected),
        participantPhones: phoneChips.map((p) => p.phone),
      });
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
            <div className="flex items-center gap-2 border-b border-[var(--border-glass)] px-3 py-3">
              {step === 'details' ? (
                <button
                  type="button"
                  onClick={() => setStep('participants')}
                  className="rounded-full p-2 hover:bg-black/[0.05]"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              ) : (
                <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-black/[0.05]">
                  <X className="h-5 w-5" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {step === 'participants' ? 'Add participants' : 'New group'}
                </h3>
                {step === 'participants' && totalCount > 0 && (
                  <p className="text-xs text-[var(--text-secondary)]">{totalCount} selected</p>
                )}
              </div>
              {step === 'participants' && (
                <button
                  type="button"
                  onClick={goToDetails}
                  disabled={totalCount === 0}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--accent)] disabled:opacity-40"
                >
                  Next
                </button>
              )}
            </div>

            {step === 'participants' ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-3 px-4 py-3">
                  {(selectedContacts.length > 0 || phoneChips.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {selectedContacts.map((c: Contact) => (
                        <button
                          key={c.contactUserId}
                          type="button"
                          onClick={() => toggle(c.contactUserId)}
                          className="flex items-center gap-1.5 rounded-full bg-[var(--accent)]/12 px-2 py-1 text-sm"
                        >
                          <Avatar name={c.savedName} size="sm" />
                          <span className="max-w-[100px] truncate">{c.savedName}</span>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ))}
                      {phoneChips.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => removePhone(p.id)}
                          className="flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-sm text-emerald-800"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          +{p.phone}
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 rounded-xl bg-[var(--search-bg)] px-3 py-2">
                    <Search className="h-4 w-4 text-[var(--text-secondary)]" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search name or number"
                      className="min-w-0 flex-1 bg-transparent text-[15px] focus:outline-none"
                    />
                  </div>

                  {showPhoneInput ? (
                    <div className="flex gap-2">
                      <input
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="Phone number with country code"
                        className="min-w-0 flex-1 rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={addPhone}
                        className="rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPhoneInput(true)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-black/[0.04]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15">
                        <UserPlus className="h-5 w-5 text-[var(--accent)]" />
                      </div>
                      <span className="text-[15px] text-[var(--accent-dark)]">Add participant by phone</span>
                    </button>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]">
                      {contacts.length === 0 ? 'Save contacts first or add by phone number' : 'No contacts match'}
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
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                            selected.has(c.contactUserId)
                              ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                              : 'border-[var(--text-secondary)]/40'
                          }`}
                        >
                          {selected.has(c.contactUserId) && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {error && <p className="px-5 pb-2 text-sm text-[var(--danger)]">{error}</p>}
              </div>
            ) : (
              <form onSubmit={(e) => void submit(e)} className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-col items-center gap-4 px-5 py-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent)]/15">
                    <Users className="h-10 w-10 text-[var(--accent)]" />
                  </div>
                  <div className="flex -space-x-2">
                    {selectedContacts.slice(0, 4).map((c) => (
                      <Avatar key={c.contactUserId} name={c.savedName} size="sm" className="ring-2 ring-[var(--list-bg)]" />
                    ))}
                    {totalCount > 4 && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--search-bg)] text-xs font-medium ring-2 ring-[var(--list-bg)]">
                        +{totalCount - 4}
                      </div>
                    )}
                  </div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Group subject"
                    className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 text-center text-[17px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                    autoFocus
                  />
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Group description (optional)"
                    className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                  />
                  <p className="text-center text-xs text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      🔒 Messages in this group are end-to-end encrypted
                    </span>
                  </p>
                </div>

                {error && <p className="px-5 pb-2 text-sm text-[var(--danger)]">{error}</p>}

                <div className="safe-bottom mt-auto border-t border-[var(--border-glass)] px-5 py-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[var(--accent)] py-3 font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? 'Creating…' : `Create group · ${totalCount + 1} members`}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
