'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import type { Chat } from '@/types';

interface ChatHeaderMenuProps {
  chat: Chat | undefined;
  onContactInfo: () => void;
  onGroupInfo: () => void;
  onAddToContact: () => void;
  onAddMembers: () => void;
  onLeaveGroup: () => void;
  onClearChat: () => void;
  onAction: (action: string) => void;
}

const privateMenuItems = [
  { id: 'contact', label: 'Contact info' },
  { id: 'search', label: 'Search' },
  { id: 'select', label: 'Select messages' },
  { id: 'starred', label: 'Starred messages' },
  { id: 'pin-chat', label: 'Pin chat' },
  { id: 'mute', label: 'Mute notifications' },
  { id: 'archive', label: 'Archive chat' },
  { id: 'wallpaper', label: 'Wallpaper' },
  { id: 'disappearing', label: 'Disappearing messages' },
  { id: 'clear', label: 'Clear on this device', danger: true },
  { id: 'block', label: 'Block', danger: true },
] as const;

const groupMenuItems = [
  { id: 'group-info', label: 'Group info' },
  { id: 'add-members', label: 'Add participants' },
  { id: 'search', label: 'Search' },
  { id: 'select', label: 'Select messages' },
  { id: 'starred', label: 'Starred messages' },
  { id: 'pin-chat', label: 'Pin chat' },
  { id: 'mute', label: 'Mute notifications' },
  { id: 'archive', label: 'Archive chat' },
  { id: 'wallpaper', label: 'Wallpaper' },
  { id: 'disappearing', label: 'Disappearing messages' },
  { id: 'clear', label: 'Clear on this device', danger: true },
  { id: 'leave-group', label: 'Exit group', danger: true },
] as const;

export function ChatHeaderMenu({
  chat,
  onContactInfo,
  onGroupInfo,
  onAddToContact,
  onAddMembers,
  onLeaveGroup,
  onClearChat,
  onAction,
}: ChatHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isGroup = chat?.type === 'GROUP';

  const menuItems = useMemo(() => {
    if (isGroup) return [...groupMenuItems];
    if (chat?.type === 'PRIVATE' && !chat.isContact) {
      return [{ id: 'add-contact' as const, label: 'Add to contact' }, ...privateMenuItems];
    }
    return [...privateMenuItems];
  }, [chat?.type, chat?.isContact, isGroup]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const handleSelect = (id: string) => {
    setOpen(false);
    if (id === 'add-contact') {
      onAddToContact();
      return;
    }
    if (id === 'contact') {
      onContactInfo();
      return;
    }
    if (id === 'group-info') {
      onGroupInfo();
      return;
    }
    if (id === 'add-members') {
      onAddMembers();
      return;
    }
    if (id === 'leave-group') {
      if (window.confirm('Leave this group?')) onLeaveGroup();
      return;
    }
    if (id === 'clear') {
      if (
        window.confirm(
          `Clear messages on this device only? Messages will still appear on other devices and for ${chat?.title || 'this contact'}.`,
        )
      ) {
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
        <div
          role="menu"
          className="chat-header-menu absolute right-0 top-full z-50 mt-1 max-h-[70vh] min-w-[220px] overflow-y-auto rounded-xl border border-[var(--border-glass)] bg-[var(--list-bg)] py-2 text-[var(--text-primary)] shadow-xl"
        >
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(item.id)}
              className={`block w-full px-6 py-3 text-left text-[14.5px] transition-colors hover:bg-black/[0.06] ${
                'danger' in item && item.danger ? 'menu-item-danger' : ''
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
