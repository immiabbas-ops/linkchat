'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Copy,
  PenLine,
  Plus,
  RotateCcw,
  Send,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import {
  type EnhancementMode,
  type Point,
  type ScanPageData,
  type SignaturePlacement,
  applyEnhancement,
  buildDocumentFilename,
  captureVideoFrame,
  createPdfFromPages,
  detectDocumentCorners,
  drawEdgeOverlay,
  exportPageToPng,
  fallbackCorners,
  finalizePageForExport,
  loadSavedSignatures,
  processScanFrame,
  saveSignature,
  validateExport,
} from '@/lib/document-scan';
import { cameraErrorMessage, isSecureBrowserContext } from '@/lib/permissions';
import { SignaturePad } from './scanner/SignaturePad';
import { DocumentShareSheet, type ShareAction } from './scanner/DocumentShareSheet';
import { ProcessingOverlay } from './scanner/ProcessingOverlay';

interface DocumentScannerProps {
  open: boolean;
  onClose: () => void;
  onSend: (file: File, meta: { signed: boolean; scanned: boolean; pageCount: number }) => Promise<void>;
}

const ENHANCEMENT_MODES: { id: EnhancementMode; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'white', label: 'White doc' },
  { id: 'color', label: 'Color' },
  { id: 'original', label: 'Original' },
  { id: 'bw', label: 'B&W' },
];

function newPageId() {
  return `page_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function DocumentScanner({ open, onClose, onSend }: DocumentScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveCorners = useRef<Point[] | null>(null);

  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');
  const [pages, setPages] = useState<ScanPageData[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [enhancement, setEnhancement] = useState<EnhancementMode>('auto');
  const [processing, setProcessing] = useState(false);
  const [processLabel, setProcessLabel] = useState('');
  const [processProgress, setProcessProgress] = useState<number | undefined>();
  const [showEnhance, setShowEnhance] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [exportFile, setExportFile] = useState<File | null>(null);
  const [qualityIssues, setQualityIssues] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const activePage = pages[activePageIndex];

  useEffect(() => setMounted(true), []);

  const stopCamera = useCallback(() => {
    if (detectTimer.current) {
      clearInterval(detectTimer.current);
      detectTimer.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const runLiveDetection = useCallback(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video?.videoWidth || !overlay) return;

    const frame = captureVideoFrame(video);
    const corners = detectDocumentCorners(frame) ?? fallbackCorners(frame.width, frame.height);
    liveCorners.current = corners;

    overlay.width = video.clientWidth;
    overlay.height = video.clientHeight;
    const ctx = overlay.getContext('2d')!;
    const sx = overlay.width / frame.width;
    const sy = overlay.height / frame.height;
    const scaled = corners.map((p) => ({ x: p.x * sx, y: p.y * sy }));
    drawEdgeOverlay(ctx, scaled, overlay.width, overlay.height);
  }, []);

  const startCamera = useCallback(async () => {
    setError('');
    stopCamera();
    if (!isSecureBrowserContext()) {
      setError(cameraErrorMessage());
      return;
    }
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
      detectTimer.current = setInterval(runLiveDetection, 450);
    } catch {
      setError(cameraErrorMessage());
    }
  }, [runLiveDetection, stopCamera]);

  const resetState = useCallback(() => {
    setPages((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setActivePageIndex(0);
    setReviewMode(false);
    setEnhancement('auto');
    setShowEnhance(false);
    setShowSignaturePad(false);
    setShowShare(false);
    setExportFile(null);
    setQualityIssues([]);
    setError('');
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      resetState();
      return;
    }
    void startCamera();
    return () => stopCamera();
  }, [open, startCamera, stopCamera, resetState]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    setProcessing(true);
    setProcessLabel('Detecting edges…');
    setError('');
    try {
      const frame = captureVideoFrame(video);
      const corners = liveCorners.current ?? detectDocumentCorners(frame) ?? fallbackCorners(frame.width, frame.height);
      setProcessLabel('Correcting perspective…');
      const blob = await processScanFrame(frame, enhancement, corners);
      const url = URL.createObjectURL(blob);
      const page: ScanPageData = {
        id: newPageId(),
        blob,
        url,
        corners,
        enhancement,
        signatures: [],
      };
      setPages((prev) => [...prev, page]);
      setActivePageIndex(pages.length);
    } catch {
      setError('Could not capture. Hold steady and try again.');
    } finally {
      setProcessing(false);
      setProcessLabel('');
    }
  };

  const removePage = (index: number) => {
    setPages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].url);
      next.splice(index, 1);
      return next;
    });
    setActivePageIndex((i) => Math.max(0, Math.min(i, pages.length - 2)));
  };

  const duplicatePage = (index: number) => {
    setPages((prev) => {
      const src = prev[index];
      const url = URL.createObjectURL(src.blob);
      const copy: ScanPageData = {
        ...src,
        id: newPageId(),
        url,
        signatures: src.signatures.map((s) => ({ ...s })),
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const movePage = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setActivePageIndex(target);
  };

  const updatePageEnhancement = async (mode: EnhancementMode) => {
    if (!activePage) return;
    setEnhancement(mode);
    setProcessing(true);
    setProcessLabel('Enhancing…');
    try {
      const blob = await applyEnhancement(activePage.blob, mode);
      const url = URL.createObjectURL(blob);
      setPages((prev) =>
        prev.map((p, i) => {
          if (i !== activePageIndex) return p;
          URL.revokeObjectURL(p.url);
          return { ...p, blob, url, enhancement: mode };
        }),
      );
    } finally {
      setProcessing(false);
      setProcessLabel('');
    }
  };

  const addSignatureToPage = (dataUrl: string, sigName: string) => {
    const saved = saveSignature(sigName, dataUrl);
    const placement: SignaturePlacement = {
      signatureId: saved.id,
      dataUrl: saved.dataUrl,
      x: 0.72,
      y: 0.82,
      scale: 1,
      rotation: -0.08,
    };
    setPages((prev) =>
      prev.map((p, i) =>
        i === activePageIndex ? { ...p, signatures: [...p.signatures, placement] } : p,
      ),
    );
    setShowSignaturePad(false);
  };

  const prepareExport = async (): Promise<File> => {
    setProcessing(true);
    setProcessLabel('Exporting A4 pages…');
    setProcessProgress(10);
    const a4Pages: Blob[] = [];
    for (let i = 0; i < pages.length; i++) {
      setProcessProgress(10 + Math.round((i / pages.length) * 70));
      a4Pages.push(await finalizePageForExport(pages[i]));
    }
    setProcessLabel('Creating PDF…');
    setProcessProgress(85);
    const pdfBlob = await createPdfFromPages(a4Pages);
    const filename = buildDocumentFilename('pdf');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    setProcessLabel('Quality check…');
    setProcessProgress(95);
    const report = await validateExport(
      a4Pages[0],
      pages.some((p) => p.signatures.length > 0),
    );
    setQualityIssues(report.issues);
    setProcessProgress(100);
    setProcessing(false);
    return file;
  };

  const openShare = async () => {
    if (pages.length === 0) return;
    setError('');
    try {
      const file = await prepareExport();
      setExportFile(file);
      setShowShare(true);
    } catch {
      setError('Export failed. Try again.');
      setProcessing(false);
    }
  };

  const handleShareAction = async (action: ShareAction) => {
    if (!exportFile) return;
    const hasSig = pages.some((p) => p.signatures.length > 0);

    if (action === 'send') {
      setSending(true);
      try {
        await onSend(exportFile, { signed: hasSig, scanned: true, pageCount: pages.length });
        setShowShare(false);
        onClose();
      } catch {
        setError('Could not send document.');
      } finally {
        setSending(false);
      }
      return;
    }

    if (action === 'download') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(exportFile);
      a.download = exportFile.name;
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }

    if (action === 'share' && navigator.share) {
      try {
        await navigator.share({
          title: exportFile.name,
          files: [exportFile],
        });
      } catch {
        /* user cancelled */
      }
      return;
    }

    if (action === 'whatsapp') {
      const a4 = await finalizePageForExport(pages[0]);
      const jpg = await exportPageToPng(a4);
      const f = new File([jpg], buildDocumentFilename('jpg'), { type: 'image/jpeg' });
      if (navigator.share) {
        await navigator.share({ files: [f], text: 'Scanned document from LinkChat' });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent('Document from LinkChat')}`, '_blank');
      }
      return;
    }

    if (action === 'email') {
      const subject = encodeURIComponent(exportFile.name);
      const body = encodeURIComponent('Please find the scanned document attached (download from LinkChat).');
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      return;
    }

    if (action === 'copy') {
      await navigator.clipboard.writeText(exportFile.name);
    }
  };

  const openReview = () => {
    if (pages.length === 0) return;
    stopCamera();
    setReviewMode(true);
    setActivePageIndex(0);
  };

  const backToCamera = () => {
    setReviewMode(false);
    void startCamera();
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
              {reviewMode ? `Edit (${pages.length} pg)` : 'Document scanner'}
            </h2>
            {reviewMode ? (
              <button type="button" onClick={() => setShowEnhance((v) => !v)} className="rounded-full p-2 text-white hover:bg-white/10">
                <Settings2 className="h-5 w-5" />
              </button>
            ) : (
              <div className="w-10" />
            )}
          </header>

          <div className="relative flex flex-1 flex-col overflow-hidden">
            {!reviewMode ? (
              <>
                <video ref={videoRef} playsInline muted className="h-full w-full flex-1 object-cover" />
                <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
                <p className="pointer-events-none absolute left-0 right-0 top-4 px-6 text-center text-xs text-emerald-300">
                  Align document — edges detected automatically
                </p>
                {pages.length > 0 && (
                  <div className="absolute bottom-28 left-0 right-0 flex gap-2 overflow-x-auto px-4 pb-2">
                    {pages.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => removePage(i)}
                        className="relative shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={`Page ${i + 1}`} className="h-16 w-12 rounded border-2 border-white/50 object-cover" />
                        <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[9px] text-white">{i + 1}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full flex-col bg-[#111]">
                <div className="relative flex-1 overflow-hidden">
                  {activePage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={activePage.url} alt="Page preview" className="h-full w-full object-contain" />
                  )}
                  {activePage?.signatures.map((sig, si) => (
                    <div
                      key={`${sig.signatureId}-${si}`}
                      className="pointer-events-none absolute"
                      style={{
                        left: `${sig.x * 100}%`,
                        top: `${sig.y * 100}%`,
                        transform: `translate(-50%, -50%) rotate(${sig.rotation}rad) scale(${sig.scale})`,
                        width: '22%',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sig.dataUrl} alt="Signature" className="w-full" />
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 px-3 py-2">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {pages.map((p, i) => (
                      <div key={p.id} className="relative shrink-0">
                        <button type="button" onClick={() => setActivePageIndex(i)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.url}
                            alt={`Page ${i + 1}`}
                            className={`h-14 w-10 rounded object-cover ${i === activePageIndex ? 'ring-2 ring-emerald-400' : 'opacity-70'}`}
                          />
                        </button>
                        <div className="mt-1 flex justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => movePage(i, -1)}
                            disabled={i === 0}
                            className="rounded bg-white/10 px-1 text-[10px] text-white disabled:opacity-30"
                          >
                            ←
                          </button>
                          <button type="button" onClick={() => duplicatePage(i)} className="text-white/60">
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => movePage(i, 1)}
                            disabled={i === pages.length - 1}
                            className="rounded bg-white/10 px-1 text-[10px] text-white disabled:opacity-30"
                          >
                            →
                          </button>
                          <button type="button" onClick={() => removePage(i)} className="text-red-400">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {showEnhance && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {ENHANCEMENT_MODES.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => void updatePageEnhancement(m.id)}
                          className={`rounded-full px-3 py-1 text-xs ${
                            enhancement === m.id ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/80'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {showSignaturePad ? (
                    <SignaturePad onSave={addSignatureToPage} onCancel={() => setShowSignaturePad(false)} />
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSignaturePad(true)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 py-2.5 text-sm text-white"
                      >
                        <PenLine className="h-4 w-4" />
                        Add signature
                      </button>
                      {loadSavedSignatures().length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const sig = loadSavedSignatures()[0];
                            addSignatureToPage(sig.dataUrl, sig.name);
                          }}
                          className="rounded-xl border border-white/20 px-3 text-xs text-white"
                        >
                          Saved
                        </button>
                      )}
                    </div>
                  )}

                  {qualityIssues.length > 0 && (
                    <div className="mt-2 rounded-lg bg-amber-500/20 px-3 py-2 text-xs text-amber-200">
                      {qualityIssues.map((q) => (
                        <p key={q}>⚠ {q}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <ProcessingOverlay visible={processing} label={processLabel} progress={processProgress} />
            {error && (
              <p className="absolute bottom-44 left-4 right-4 rounded-lg bg-red-500/90 px-3 py-2 text-center text-sm text-white">{error}</p>
            )}
          </div>

          <footer className="safe-bottom bg-black/90 px-5 py-4">
            {!reviewMode ? (
              <div className="flex items-center justify-center gap-6">
                {pages.length > 0 && (
                  <button type="button" onClick={openReview} className="rounded-xl border border-white/30 px-4 py-2 text-sm text-white">
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
                <button
                  type="button"
                  onClick={() => void openShare()}
                  disabled={sending || processing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 font-semibold text-white disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            )}
          </footer>

          <DocumentShareSheet
            open={showShare}
            filename={exportFile?.name ?? buildDocumentFilename('pdf')}
            onClose={() => setShowShare(false)}
            onAction={(a) => void handleShareAction(a)}
            sending={sending}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
