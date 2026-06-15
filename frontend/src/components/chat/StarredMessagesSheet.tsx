'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { api } from '@/lib/api';
import type { Message } from '@/types';
import { formatMessageTime } from '@/lib/utils';

interface StarredMessagesSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenChat: (chatId: string, messageId: string) => void;
}

export function StarredMessagesSheet({ open, onClose, onOpenChat }: StarredMessagesSheetProps) {
  const [items, setItems] = useState<(Message & { starredAt?: string })[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    api
      .get<(Message & { starredAt?: string })[]>('/messages/starred')
      .then(setItems)
      .catch(() => setItems([]));
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-x-0 bottom-0 z-[201] max-h-[75vh] overflow-y-auto rounded-t-2xl bg-[var(--bg-panel)] safe-bottom"
          >
            <div className="flex items-center gap-2 border-b border-[var(--border-glass)] px-4 py-3">
              <Star className="h-5 w-5 text-[var(--accent)]" />
              <h3 className="flex-1 text-[17px] font-medium text-[var(--text-primary)]">Starred messages</h3>
              <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-black/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[var(--text-secondary)]">No starred messages</p>
            ) : (
              items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onOpenChat(m.chatId, m.id)}
                  className="block w-full border-b border-[var(--border-glass)] px-4 py-3 text-left hover:bg-black/[0.03]"
                >
                  <p className="truncate text-[15px] text-[var(--text-primary)]">{m.content || `[${m.type}]`}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{formatMessageTime(m.createdAt)}</p>
                </button>
              ))
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
