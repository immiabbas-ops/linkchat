'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMessageTime } from '@/lib/utils';

interface MessageInfo {
  id: string;
  content?: string;
  type: string;
  status: string;
  createdAt: string;
  editedAt?: string;
  sender?: { displayName?: string };
  readBy?: { userId: string; displayName?: string; readAt: string }[];
  reactions?: { emoji: string; displayName?: string }[];
}

interface MessageInfoSheetProps {
  messageId: string | null;
  open: boolean;
  onClose: () => void;
}

export function MessageInfoSheet({ messageId, open, onClose }: MessageInfoSheetProps) {
  const [info, setInfo] = useState<MessageInfo | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !messageId) return;
    api
      .get<MessageInfo>(`/messages/${messageId}/info`)
      .then(setInfo)
      .catch(() => setInfo(null));
  }, [open, messageId]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-x-0 bottom-0 z-[201] max-h-[80vh] overflow-y-auto rounded-t-2xl bg-[var(--bg-panel)] safe-bottom shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-4 py-3">
              <h3 className="text-[17px] font-medium text-[var(--text-primary)]">Message info</h3>
              <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-black/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            {info ? (
              <div className="space-y-4 px-4 py-4">
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Sent</p>
                  <p className="text-[15px] text-[var(--text-primary)]">
                    {formatMessageTime(info.createdAt)} · {info.status}
                  </p>
                </div>
                {info.editedAt && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Edited</p>
                    <p className="text-[15px] text-[var(--text-primary)]">{formatMessageTime(info.editedAt)}</p>
                  </div>
                )}
                {info.readBy && info.readBy.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-[var(--text-secondary)]">Read by</p>
                    <ul className="space-y-2">
                      {info.readBy.map((r) => (
                        <li key={r.userId} className="flex justify-between text-[15px] text-[var(--text-primary)]">
                          <span>{r.displayName || 'User'}</span>
                          <span className="text-[var(--text-secondary)]">{formatMessageTime(r.readAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {info.reactions && info.reactions.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-[var(--text-secondary)]">Reactions</p>
                    <ul className="space-y-1">
                      {info.reactions.map((r, i) => (
                        <li key={i} className="text-[15px] text-[var(--text-primary)]">
                          {r.emoji} {r.displayName || 'User'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="px-4 py-8 text-center text-[var(--text-secondary)]">Loading…</p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
