'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface EditMessageSheetProps {
  open: boolean;
  initialContent: string;
  onClose: () => void;
  onSave: (content: string) => void;
}

export function EditMessageSheet({ open, initialContent, onClose, onSave }: EditMessageSheetProps) {
  const [text, setText] = useState(initialContent);

  useEffect(() => {
    if (open) setText(initialContent);
  }, [open, initialContent]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onClose();
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
            className="fixed inset-0 z-[210] bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-x-0 bottom-0 z-[211] rounded-t-2xl bg-[var(--list-bg)] px-5 py-5 safe-bottom shadow-2xl sm:mx-auto sm:max-w-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Edit message</h3>
              <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-black/[0.05]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                autoFocus
                className="w-full resize-none rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 text-[15px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-[var(--accent)] py-3 font-semibold text-white"
              >
                Save
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
