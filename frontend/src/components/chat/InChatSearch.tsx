'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Message } from '@/types';
import { formatMessageTime } from '@/lib/utils';

interface InChatSearchProps {
  chatId: string;
  open: boolean;
  onClose: () => void;
  onJumpTo: (messageId: string) => void;
}

export function InChatSearch({ chatId, open, onClose, onJumpTo }: InChatSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const items = await api.get<Message[]>(`/messages/search?q=${encodeURIComponent(q)}&chatId=${chatId}`);
      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="fixed inset-x-0 top-0 z-[200] border-b border-[var(--border-glass)] bg-[var(--header)] px-3 py-2 safe-top shadow-lg"
        >
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <Search className="h-5 w-5 shrink-0 text-white/70" />
            <input
              autoFocus
              value={query}
              onChange={(e) => void search(e.target.value)}
              placeholder="Search in chat"
              className="min-w-0 flex-1 bg-transparent py-2 text-[16px] text-white placeholder:text-white/50 focus:outline-none"
            />
            <button type="button" onClick={onClose} className="rounded-full p-2 text-white hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
          {query && (
            <div className="mx-auto mt-2 max-h-[50vh] max-w-3xl overflow-y-auto rounded-lg bg-[var(--list-bg)] shadow-xl">
              {loading ? (
                <p className="px-4 py-3 text-sm text-[var(--text-secondary)]">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[var(--text-secondary)]">No messages found</p>
              ) : (
                results.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onJumpTo(m.id);
                      onClose();
                    }}
                    className="block w-full border-b border-[var(--border-glass)] px-4 py-3 text-left hover:bg-black/[0.03]"
                  >
                    <p className="truncate text-[15px] text-[var(--text-primary)]">{m.content}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{formatMessageTime(m.createdAt)}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
