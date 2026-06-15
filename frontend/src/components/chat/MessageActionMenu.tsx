'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Reply,
  Forward,
  Copy,
  Trash2,
  Pencil,
  Star,
  Info,
  Download,
  ChevronLeft,
  Pin,
  Stamp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Message } from '@/types';
import { isOwnMessage } from '@/lib/messages';
import { useAuthStore } from '@/store/auth-store';
import { cn, formatMessageTime } from '@/lib/utils';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const MORE_REACTIONS = ['🔥', '👏', '🎉', '💯', '😍', '🤔', '😭', '👀'];

type MenuView = 'main' | 'delete' | 'more-reactions';

interface ActionRow {
  id: string;
  label: string;
  icon: typeof Reply;
  danger?: boolean;
}

const MAIN_ACTIONS: ActionRow[] = [
  { id: 'reply', label: 'Reply', icon: Reply },
  { id: 'forward', label: 'Forward', icon: Forward },
  { id: 'copy', label: 'Copy', icon: Copy },
  { id: 'edit', label: 'Edit', icon: Pencil },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'pin', label: 'Pin', icon: Pin },
  { id: 'info', label: 'Info', icon: Info },
  { id: 'save', label: 'Save media', icon: Download },
  { id: 'delete', label: 'Delete', icon: Trash2, danger: true },
];

interface MessageActionMenuProps {
  message: Message | null;
  open: boolean;
  onClose: () => void;
  onAction: (action: string, message: Message) => void;
  onReact: (message: Message, emoji: string) => void;
  contactName?: string;
}

function messagePreview(message: Message) {
  if (message.type === 'IMAGE') return '📷 Photo';
  if (message.type === 'VOICE') return '🎤 Voice message';
  if (message.type === 'VIDEO') return '🎥 Video';
  if (message.type === 'DOCUMENT' || message.type === 'FILE') return '📎 File';
  if (message.type === 'LOCATION') return '📍 Location';
  return message.content?.trim() || 'Message';
}

export function MessageActionMenu({
  message,
  open,
  onClose,
  onAction,
  onReact,
  contactName,
}: MessageActionMenuProps) {
  const { user } = useAuthStore();
  const [view, setView] = useState<MenuView>('main');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) setView('main');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !message) return null;

  const own = isOwnMessage(message, user?.id);
  const senderLabel = own ? 'You' : message.sender?.displayName || contactName || 'Contact';
  const mediaUrl = message.mediaFiles?.[0]?.url;
  const canSignDoc =
    !message.metadata?.signed &&
    !!mediaUrl &&
    (message.type === 'IMAGE' ||
      message.type === 'DOCUMENT' ||
      (message.type === 'FILE' && message.mediaFiles?.[0]?.mimeType?.startsWith('image/')));

  const filteredActions = MAIN_ACTIONS.filter((action) => {
    if (action.id === 'edit' && (!own || message.type !== 'TEXT')) return false;
    if (action.id === 'copy' && !message.content?.trim()) return false;
    if (action.id === 'save' && !message.mediaFiles?.length) return false;
    return true;
  });

  const handleClose = () => {
    setView('main');
    onClose();
  };

  const handleReact = (emoji: string) => {
    onReact(message, emoji);
    handleClose();
  };

  const handleAction = (actionId: string) => {
    if (actionId === 'delete') {
      setView('delete');
      return;
    }
    onAction(actionId, message);
    handleClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex flex-col bg-[rgba(17,27,33,0.92)]"
        >
          <button type="button" className="absolute inset-0" aria-label="Close menu" onClick={handleClose} />

          <div className="relative flex flex-1 flex-col justify-end pointer-events-none">
            {/* Message preview */}
            <div className="flex flex-1 items-center justify-center px-6 pb-4 pt-16">
              <div
                className={cn(
                  'pointer-events-auto max-w-[85%] rounded-lg px-3 py-2 shadow-xl',
                  own ? 'wa-bubble-out' : 'wa-bubble-in',
                )}
              >
                <p className="mb-0.5 text-[11px] font-medium opacity-70">{senderLabel}</p>
                <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">
                  {messagePreview(message)}
                </p>
                <p className="mt-1 text-right text-[10px] opacity-60">
                  {formatMessageTime(message.createdAt)}
                </p>
              </div>
            </div>

            {/* Reaction bar */}
            {view === 'main' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="pointer-events-auto relative mx-auto mb-3 flex items-center gap-0.5 rounded-full border border-[#3b4a54] bg-[#233138] px-2 py-1.5 shadow-xl"
              >
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReact(emoji)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[26px] transition-transform hover:scale-110 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setView('more-reactions')}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#182229] text-lg text-[#8696a0]"
                  aria-label="More reactions"
                >
                  +
                </button>
              </motion.div>
            )}

            {view === 'more-reactions' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="pointer-events-auto relative mx-4 mb-3 rounded-2xl border border-[#3b4a54] bg-[#233138] p-3 shadow-xl"
              >
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView('main')}
                    className="rounded-full p-1 text-[#aebac1] hover:bg-[#182229]"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm font-medium text-[#e9edef]">More reactions</span>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {MORE_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReact(emoji)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl hover:bg-[#182229]"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Bottom action sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="pointer-events-auto relative rounded-t-2xl bg-[#1f2c33] safe-bottom shadow-[0_-8px_32px_rgba(0,0,0,0.45)]"
            >
              {view === 'main' && (
                <div className="py-1">
                  {canSignDoc && (
                    <button
                      type="button"
                      onClick={() => handleAction('sign-document')}
                      className="flex w-full items-center gap-5 px-6 py-3.5 text-left text-[#e9edef] transition-colors hover:bg-[#182229]"
                    >
                      <Stamp className="h-5 w-5 shrink-0 opacity-90" />
                      <span className="text-[16px]">Sign & resend</span>
                    </button>
                  )}
                  {filteredActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => handleAction(action.id)}
                        className={cn(
                          'flex w-full items-center gap-5 px-6 py-3.5 text-left transition-colors hover:bg-[#182229]',
                          action.danger ? 'text-[#ea0038]' : 'text-[#e9edef]',
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0 opacity-90" />
                        <span className="text-[16px]">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {view === 'delete' && (
                <div className="py-2">
                  <p className="px-6 pb-2 text-[13px] text-[#8696a0]">Delete message?</p>
                  {own && (
                    <button
                      type="button"
                      onClick={() => {
                        onAction('delete-everyone', message);
                        handleClose();
                      }}
                      className="flex w-full items-center gap-5 px-6 py-3.5 text-left text-[#ea0038] hover:bg-[#182229]"
                    >
                      <Trash2 className="h-5 w-5 shrink-0" />
                      <span className="text-[16px]">Delete for everyone</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onAction('delete-me', message);
                      handleClose();
                    }}
                    className="flex w-full items-center gap-5 px-6 py-3.5 text-left text-[#ea0038] hover:bg-[#182229]"
                  >
                    <Trash2 className="h-5 w-5 shrink-0" />
                    <span className="text-[16px]">Delete for me</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('main')}
                    className="mt-1 flex w-full items-center justify-center border-t border-[#3b4a54] py-3.5 text-[16px] text-[#00a884]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
