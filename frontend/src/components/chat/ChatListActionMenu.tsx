'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Archive, Bell, BellOff, CheckCheck, LogOut, Pin, PinOff, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { getChatDisplayTitle } from '@/lib/phone';
import { cn } from '@/lib/utils';
import type { Chat } from '@/types';

interface ActionRow {
  id: string;
  label: string;
  icon: typeof Pin;
  danger?: boolean;
}

interface ChatListActionMenuProps {
  chat: Chat | null;
  open: boolean;
  onClose: () => void;
  onAction: (action: string, chat: Chat) => void;
}

function buildActions(chat: Chat): ActionRow[] {
  const items: ActionRow[] = [
    {
      id: 'pin',
      label: chat.isPinned ? 'Unpin chat' : 'Pin chat',
      icon: chat.isPinned ? PinOff : Pin,
    },
    {
      id: 'mute',
      label: chat.isMuted ? 'Unmute notifications' : 'Mute notifications',
      icon: chat.isMuted ? Bell : BellOff,
    },
    {
      id: 'archive',
      label: chat.isArchived ? 'Unarchive chat' : 'Archive chat',
      icon: Archive,
    },
  ];

  if ((chat.unreadCount || 0) > 0) {
    items.push({ id: 'mark-read', label: 'Mark as read', icon: CheckCheck });
  }

  if (chat.type === 'GROUP') {
    items.push({ id: 'leave-group', label: 'Exit group', icon: LogOut, danger: true });
  } else {
    items.push({ id: 'delete', label: 'Delete chat', icon: Trash2, danger: true });
  }

  return items;
}

export function ChatListActionMenu({ chat, open, onClose, onAction }: ChatListActionMenuProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) return null;

  const actions = chat ? buildActions(chat) : [];

  return createPortal(
    <AnimatePresence>
      {open && chat && (
        <div className="fixed inset-0 z-[300] flex flex-col justify-end">
          <motion.button
            type="button"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative mx-3 mb-3 overflow-hidden rounded-2xl bg-[var(--list-bg)] shadow-2xl ring-1 ring-[var(--border-glass)]"
          >
            <div className="flex items-center gap-3 border-b border-[var(--border-glass)] px-4 py-3">
              <Avatar src={chat.avatarUrl} name={chat.title} online={chat.isOnline} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-medium text-[var(--text-primary)]">
                  {getChatDisplayTitle(chat)}
                </p>
                <p className="truncate text-[14px] text-[var(--text-secondary)]">
                  {chat.lastMessage?.content || 'No messages yet'}
                </p>
              </div>
            </div>

            <div className="py-1">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => onAction(action.id, chat)}
                    className={cn(
                      'flex w-full items-center gap-4 px-5 py-3.5 text-left text-[15px] transition-colors hover:bg-black/[0.05]',
                      action.danger ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0 opacity-90" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
