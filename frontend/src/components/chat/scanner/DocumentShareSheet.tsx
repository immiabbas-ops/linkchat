'use client';

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Link2, Mail, MessageCircle, Send, Share2, X } from 'lucide-react';
import { buildDocumentFilename } from '@/lib/document-scan';

export type ShareAction = 'send' | 'download' | 'share' | 'email' | 'whatsapp' | 'copy';

interface DocumentShareSheetProps {
  open: boolean;
  filename: string;
  onClose: () => void;
  onAction: (action: ShareAction) => void;
  sending?: boolean;
}

export function DocumentShareSheet({ open, filename, onClose, onAction, sending }: DocumentShareSheetProps) {
  const items: { id: ShareAction; label: string; icon: typeof Send; desc?: string }[] = [
    { id: 'send', label: 'Send in chat', icon: Send, desc: 'Share to this conversation' },
    { id: 'download', label: 'Download', icon: Download, desc: filename },
    { id: 'share', label: 'Share sheet', icon: Share2, desc: 'System share menu' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'copy', label: 'Copy link', icon: Link2, desc: 'After upload to chat' },
  ];

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
            className="fixed inset-0 z-[225] bg-black/55"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-x-0 bottom-0 z-[226] rounded-t-2xl bg-[var(--list-bg)] safe-bottom shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-5 py-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Send document</h3>
              <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-black/[0.05]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-3 py-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={sending && item.id === 'send'}
                  onClick={() => onAction(item.id)}
                  className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left hover:bg-black/[0.04] disabled:opacity-50"
                >
                  <item.icon className="h-5 w-5 shrink-0 text-[var(--accent-dark)]" />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{item.label}</p>
                    {item.desc && <p className="text-xs text-[var(--text-secondary)]">{item.desc}</p>}
                  </div>
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

export { buildDocumentFilename };
