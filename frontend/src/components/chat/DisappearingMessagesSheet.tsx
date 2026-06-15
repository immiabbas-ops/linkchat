'use client';

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  DISAPPEARING_OPTIONS,
  getDisappearingTimer,
  setDisappearingTimer,
  type DisappearingSeconds,
} from '@/lib/chat-preferences';

interface DisappearingMessagesSheetProps {
  chatId: string;
  open: boolean;
  onClose: () => void;
}

export function DisappearingMessagesSheet({ chatId, open, onClose }: DisappearingMessagesSheetProps) {
  const current = getDisappearingTimer(chatId);

  const select = (value: DisappearingSeconds) => {
    setDisappearingTimer(chatId, value);
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
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Disappearing messages</h3>
              <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-black/[0.05]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              New messages in this chat will hide from your view after the selected time.
            </p>
            <div className="space-y-1">
              {DISAPPEARING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => select(opt.value)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-[15px] ${
                    current === opt.value
                      ? 'bg-[var(--accent)]/10 font-medium text-[var(--accent-dark)]'
                      : 'text-[var(--text-primary)] hover:bg-black/[0.04]'
                  }`}
                >
                  {opt.label}
                  {current === opt.value && <span className="text-[var(--accent)]">✓</span>}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
