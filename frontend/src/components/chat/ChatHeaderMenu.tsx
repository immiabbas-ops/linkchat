'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import type { Chat } from '@/types';

interface ChatHeaderMenuProps {
  chat: Chat | undefined;
  onContactInfo: () => void;
  onAddToContact: () => void;
  onClearChat: () => void;
  onAction: (action: string) => void;
}

const baseMenuItems = [
  { id: 'contact', label: 'Contact info' },
  { id: 'search', label: 'Search' },
  { id: 'select', label: 'Select messages' },
  { id: 'starred', label: 'Starred messages' },
  { id: 'pin-chat', label: 'Pin chat' },
  { id: 'mute', label: 'Mute notifications' },
  { id: 'archive', label: 'Archive chat' },
  { id: 'wallpaper', label: 'Wallpaper' },
  { id: 'disappearing', label: 'Disappearing messages' },
  { id: 'clear', label: 'Clear chat', danger: true },
  { id: 'block', label: 'Block', danger: true },
] as const;

export function ChatHeaderMenu({
  chat,
  onContactInfo,
  onAddToContact,
  onClearChat,
  onAction,
}: ChatHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const menuItems = useMemo(() => {
    if (chat?.type === 'PRIVATE' && !chat.isContact) {
      return [{ id: 'add-contact' as const, label: 'Add to contact' }, ...baseMenuItems];
    }
    return [...baseMenuItems];
  }, [chat?.type, chat?.isContact]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const handleSelect = (id: (typeof menuItems)[number]['id']) => {
    setOpen(false);
    if (id === 'add-contact') {
      onAddToContact();
      return;
    }
    if (id === 'contact') {
      onContactInfo();
      return;
    }
    if (id === 'clear') {
      if (window.confirm(`Clear all messages in chat with ${chat?.title || 'this contact'}?`)) {
        onClearChat();
      }
      return;
    }
    onAction(id);
  };

  const label = (id: string, defaultLabel: string) => {
    if (id === 'mute') return chat?.isMuted ? 'Unmute notifications' : 'Mute notifications';
    if (id === 'pin-chat') return chat?.isPinned ? 'Unpin chat' : 'Pin chat';
    return defaultLabel;
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full p-2 hover:bg-white/10" aria-label="Menu">
        <MoreVertical className="h-6 w-6" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-[70vh] min-w-[220px] overflow-y-auto rounded-xl border border-[var(--border-glass)] bg-[var(--list-bg)] py-2 shadow-xl">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`block w-full px-6 py-3 text-left text-[14.5px] transition-colors hover:bg-white/5 ${
                'danger' in item && item.danger ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {label(item.id, item.label)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
