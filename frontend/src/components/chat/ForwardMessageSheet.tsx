'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '@/components/ui/Avatar';
import { useChatStore } from '@/store/chat-store';

interface ForwardMessageSheetProps {
  open: boolean;
  currentChatId: string;
  onClose: () => void;
  onSelect: (targetChatId: string) => void;
}

export function ForwardMessageSheet({
  open,
  currentChatId,
  onClose,
  onSelect,
}: ForwardMessageSheetProps) {
  const { chats } = useChatStore();
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const filtered = useMemo(() => {
    const list = chats.filter((c) => c.id !== currentChatId);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.title.toLowerCase().includes(q));
  }, [chats, currentChatId, query]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
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
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[211] max-h-[75vh] rounded-t-2xl bg-[var(--bg-panel)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-4 py-3">
              <h3 className="text-[17px] font-medium text-[var(--text-primary)]">Forward to</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 hover:bg-black/5"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="border-b border-[var(--border-glass)] px-4 py-2">
              <div className="flex items-center gap-2 rounded-lg bg-[var(--search-bg)] px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search chats"
                  className="w-full bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto scrollbar-hide safe-bottom">
              {filtered.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                  No chats found
                </p>
              ) : (
                filtered.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => onSelect(chat.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.04]"
                  >
                    <Avatar src={chat.avatarUrl} name={chat.title} size="md" />
                    <span className="truncate text-[16px] text-[var(--text-primary)]">{chat.title}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
