'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, Plus, RotateCcw, Stamp, Trash2, X } from 'lucide-react';
import {
  applySignedStamp,
  blobToFile,
  combineDocumentPages,
  enhanceDocumentImage,
} from '@/lib/document-utils';
import { useAuthStore } from '@/store/auth-store';

interface DocumentScannerProps {
  open: boolean;
  onClose: () => void;
  onSend: (file: File, meta: { signed: boolean; scanned: boolean; pageCount: number }) => Promise<void>;
}

type ScanPage = { blob: Blob; url: string };

export function DocumentScanner({ open, onClose, onSend }: DocumentScannerProps) {
  const { user } = useAuthStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [signedPreviewUrl, setSignedPreviewUrl] = useState<string | null>(null);
  const [addStamp, setAddStamp] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);

  const signerName = user?.profile?.displayName || user?.email?.split('@')[0] || 'User';

  useEffect(() => setMounted(true), []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError('');
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError('Camera access denied. Allow camera permission to scan documents.');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setPages((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      setSignedPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setAddStamp(false);
      setReviewMode(false);
      return;
    }
    void startCamera();
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setProcessing(true);
    setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const rawBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Capture failed'))), 'image/jpeg', 0.95);
      });
      const enhanced = await enhanceDocumentImage(rawBlob);
      const url = URL.createObjectURL(enhanced);
      setPages((prev) => [...prev, { blob: enhanced, url }]);
    } catch {
      setError('Could not capture image. Try again.');
    } finally {
      setProcessing(false);
    }
  };

  const removePage = (index: number) => {
    setPages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].url);
      next.splice(index, 1);
      return next;
    });
    if (signedPreviewUrl) {
      URL.revokeObjectURL(signedPreviewUrl);
      setSignedPreviewUrl(null);
    }
  };

  const openReview = async () => {
    if (pages.length === 0) return;
    stopCamera();
    setReviewMode(true);
  };

  const toggleStamp = async (enabled: boolean) => {
    setAddStamp(enabled);
    if (signedPreviewUrl) {
      URL.revokeObjectURL(signedPreviewUrl);
      setSignedPreviewUrl(null);
    }
    if (!enabled || pages.length === 0) return;
    setProcessing(true);
    try {
      const combined = await combineDocumentPages(pages.map((p) => p.blob));
      const stamped = await applySignedStamp(combined, signerName);
      setSignedPreviewUrl(URL.createObjectURL(stamped));
    } catch {
      setError('Could not apply stamp.');
      setAddStamp(false);
    } finally {
      setProcessing(false);
    }
  };

  const backToCamera = () => {
    setReviewMode(false);
    if (signedPreviewUrl) {
      URL.revokeObjectURL(signedPreviewUrl);
      setSignedPreviewUrl(null);
    }
    setAddStamp(false);
    void startCamera();
  };

  const send = async () => {
    if (pages.length === 0) return;
    setSending(true);
    setError('');
    try {
      let combined = await combineDocumentPages(pages.map((p) => p.blob));
      if (addStamp) combined = await applySignedStamp(combined, signerName);
      const file = blobToFile(combined, `scan-${Date.now()}.jpg`);
      await onSend(file, { signed: addStamp, scanned: true, pageCount: pages.length });
      onClose();
    } catch {
      setError('Could not send document.');
    } finally {
      setSending(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[220] flex flex-col bg-black">
          <header className="safe-top flex items-center justify-between bg-black/80 px-4 py-3">
            <button type="button" onClick={onClose} className="rounded-full p-2 text-white hover:bg-white/10">
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-[16px] font-medium text-white">
              {reviewMode ? `Review (${pages.length} page${pages.length === 1 ? '' : 's'})` : 'Document scanner'}
            </h2>
            <div className="w-10" />
          </header>

          <div className="relative flex flex-1 flex-col overflow-hidden">
            {!reviewMode ? (
              <>
                <video ref={videoRef} playsInline muted className="h-full w-full flex-1 object-cover" />
                <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-dashed border-white/70" />
                {pages.length > 0 && (
                  <div className="absolute bottom-28 left-0 right-0 flex gap-2 overflow-x-auto px-4 pb-2">
                    {pages.map((p, i) => (
                      <div key={p.url} className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={`Page ${i + 1}`} className="h-16 w-12 rounded border border-white/40 object-cover" />
                        <button
                          type="button"
                          onClick={() => removePage(i)}
                          className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="absolute bottom-36 left-0 right-0 px-6 text-center text-sm text-white/80">
                  {pages.length === 0
                    ? 'Align the document, then capture. Add more pages before sending.'
                    : `${pages.length} page${pages.length === 1 ? '' : 's'} captured — add more or continue`}
                </p>
              </>
            ) : (
              <div className="flex h-full flex-col bg-[#111]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={addStamp && signedPreviewUrl ? signedPreviewUrl : pages[0]?.url}
                  alt="Preview"
                  className="max-h-[55vh] w-full object-contain"
                />
                <div className="flex gap-2 overflow-x-auto px-4 py-2">
                  {pages.map((p, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={p.url} src={p.url} alt={`Page ${i + 1}`} className="h-14 w-10 shrink-0 rounded object-cover opacity-80" />
                  ))}
                </div>
                <div className="px-5 py-3">
                  <button
                    type="button"
                    onClick={() => void toggleStamp(!addStamp)}
                    disabled={processing}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                      addStamp ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-white' : 'border-white/20 bg-white/5 text-white'
                    }`}
                  >
                    <Stamp className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Add signed stamp</p>
                      <p className="text-xs opacity-70">SIGNED · date · {signerName}</p>
                    </div>
                    {addStamp && <Check className="ml-auto h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="absolute bottom-44 left-4 right-4 rounded-lg bg-red-500/90 px-3 py-2 text-center text-sm text-white">{error}</p>
            )}
          </div>

          <footer className="safe-bottom bg-black/90 px-5 py-4">
            {!reviewMode ? (
              <div className="flex items-center justify-center gap-6">
                {pages.length > 0 && (
                  <button type="button" onClick={() => void openReview()} className="rounded-xl border border-white/30 px-4 py-2 text-sm text-white">
                    Continue
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void capture()}
                  disabled={processing || !!error}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black disabled:opacity-40"
                  aria-label="Capture page"
                >
                  {pages.length > 0 ? <Plus className="h-7 w-7" /> : <Camera className="h-7 w-7" />}
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button type="button" onClick={backToCamera} disabled={sending} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/25 py-3 text-white">
                  <RotateCcw className="h-5 w-5" />
                  Add pages
                </button>
                <button type="button" onClick={() => void send()} disabled={sending || processing} className="flex flex-1 items-center justify-center rounded-xl bg-[var(--accent)] py-3 font-semibold text-white disabled:opacity-50">
                  {sending ? 'Sending…' : addStamp ? 'Sign & send' : 'Send document'}
                </button>
              </div>
            )}
          </footer>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
