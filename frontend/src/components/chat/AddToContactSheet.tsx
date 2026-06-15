'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { formatPhoneDisplay } from '@/lib/presence';

interface AddToContactSheetProps {
  open: boolean;
  phone?: string;
  initialName?: string;
  initialNotes?: string;
  isEdit?: boolean;
  onClose: () => void;
  onSave: (data: { savedName: string; notes: string }) => Promise<void>;
}

export function AddToContactSheet({
  open,
  phone,
  initialName = '',
  initialNotes = '',
  isEdit = false,
  onClose,
  onSave,
}: AddToContactSheetProps) {
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setNotes(initialNotes);
      setError('');
    }
  }, [open, initialName, initialNotes]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter a name for this contact');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ savedName: name.trim(), notes: notes.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save contact');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

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
            className="fixed inset-0 z-[210] bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-x-0 bottom-0 z-[211] max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-[var(--list-bg)] px-5 py-5 safe-bottom shadow-2xl sm:mx-auto sm:max-w-md sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {isEdit ? 'Edit contact' : 'Add to contacts'}
              </h3>
              <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-black/[0.05]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contact name"
                  autoFocus
                  className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 text-[15px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Mobile</label>
                <input
                  value={formatPhoneDisplay(phone)}
                  readOnly
                  className="w-full rounded-xl border border-[var(--border-glass)] bg-black/[0.03] px-4 py-3 text-[15px] text-[var(--text-secondary)]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  Notes <span className="font-normal text-[var(--text-secondary)]">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 text-[15px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                />
              </div>

              {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[var(--accent)] py-3 text-[15px] font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save contact'}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
