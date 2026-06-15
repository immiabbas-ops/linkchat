'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Stamp, X } from 'lucide-react';
import { applySignedStamp, blobToFile } from '@/lib/document-utils';
import { useAuthStore } from '@/store/auth-store';

interface DocumentSignSheetProps {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onSend: (file: File, meta: { signed: boolean }) => Promise<void>;
}

export function DocumentSignSheet({ open, file, onClose, onSend }: DocumentSignSheetProps) {
  const { user } = useAuthStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stampedUrl, setStampedUrl] = useState<string | null>(null);
  const [addStamp, setAddStamp] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  const signerName = user?.profile?.displayName || user?.email?.split('@')[0] || 'User';

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !file) return;
    let previewRevoke: string | null = null;
    let stampedRevoke: string | null = null;

    const url = URL.createObjectURL(file);
    previewRevoke = url;
    setPreviewUrl(url);
    setAddStamp(true);
    setStampedUrl(null);

    void (async () => {
      setProcessing(true);
      try {
        const stamped = await applySignedStamp(file, signerName);
        const stampedObjectUrl = URL.createObjectURL(stamped);
        stampedRevoke = stampedObjectUrl;
        setStampedUrl(stampedObjectUrl);
      } finally {
        setProcessing(false);
      }
    })();

    return () => {
      if (previewRevoke) URL.revokeObjectURL(previewRevoke);
      if (stampedRevoke) URL.revokeObjectURL(stampedRevoke);
    };
  }, [open, file, signerName]);

  const send = async () => {
    if (!file) return;
    setSending(true);
    try {
      const finalFile = addStamp ? blobToFile(await applySignedStamp(file, signerName), file.name) : file;
      await onSend(finalFile, { signed: addStamp });
      onClose();
    } finally {
      setSending(false);
    }
  };

  if (!mounted) return null;

  const displayUrl = addStamp && stampedUrl ? stampedUrl : previewUrl;

  return createPortal(
    <AnimatePresence>
      {open && file && (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] bg-black/55"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-x-0 bottom-0 z-[211] max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-[var(--list-bg)] safe-bottom shadow-2xl sm:mx-auto sm:max-w-md sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-glass)] px-5 py-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Send document</h3>
              <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-black/[0.05]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4">
              {file.type.startsWith('image/') && displayUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayUrl}
                  alt="Document preview"
                  className="mb-4 max-h-48 w-full rounded-lg border border-[var(--border-glass)] object-contain bg-black/[0.03]"
                />
              )}

              <p className="mb-3 truncate text-sm text-[var(--text-secondary)]">{file.name}</p>

              {file.type.startsWith('image/') && (
                <button
                  type="button"
                  onClick={() => setAddStamp((v) => !v)}
                  disabled={processing}
                  className={`mb-4 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                    addStamp
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                      : 'border-[var(--border-glass)] bg-[var(--search-bg)]'
                  }`}
                >
                  <Stamp className="h-5 w-5 text-[var(--accent)]" />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Signed stamp</p>
                    <p className="text-xs text-[var(--text-secondary)]">SIGNED · date · {signerName}</p>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || processing}
                className="w-full rounded-xl bg-[var(--accent)] py-3 font-semibold text-white disabled:opacity-50"
              >
                {sending ? 'Sending…' : addStamp && file.type.startsWith('image/') ? 'Sign & send' : 'Send'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
