'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Crop,
  Eraser,
  Pencil,
  RotateCw,
  Send,
  Smile,
  Type,
  Undo2,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CROP_RATIOS,
  DRAW_COLORS,
  type CropRect,
  type DrawStroke,
  type ImageEditState,
  type TextOverlay,
  clampCrop,
  defaultCropRect,
  defaultEditState,
  exportEditedImage,
  loadImageElement,
} from '@/lib/image-editor';
import { EmojiPicker } from './EmojiPicker';

type EditorMode = 'preview' | 'crop' | 'draw' | 'text';

interface ImageComposerProps {
  open: boolean;
  files: File[];
  initialCaption?: string;
  onClose: () => void;
  onSend: (files: File[], caption: string) => Promise<void>;
}

interface ImageItem {
  file: File;
  previewUrl: string;
  edit: ImageEditState;
  naturalSize: { w: number; h: number };
}

function CropOverlay({
  crop,
  displaySize,
  naturalSize,
  ratio,
  onChange,
}: {
  crop: CropRect;
  displaySize: { w: number; h: number };
  naturalSize: { w: number; h: number };
  ratio: number | null;
  onChange: (crop: CropRect) => void;
}) {
  const scaleX = displaySize.w / naturalSize.w;
  const scaleY = displaySize.h / naturalSize.h;
  const dragRef = useRef<{ mode: 'move' | 'se'; startX: number; startY: number; startCrop: CropRect } | null>(null);

  const toDisplay = (r: CropRect) => ({
    left: r.x * scaleX,
    top: r.y * scaleY,
    width: r.width * scaleX,
    height: r.height * scaleY,
  });

  const d = toDisplay(crop);

  const onPointerDown = (mode: 'move' | 'se') => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, startCrop: crop };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.startX) / scaleX;
    const dy = (e.clientY - dragRef.current.startY) / scaleY;
    const start = dragRef.current.startCrop;

    if (dragRef.current.mode === 'move') {
      onChange(clampCrop({ ...start, x: start.x + dx, y: start.y + dy }, naturalSize.w, naturalSize.h, ratio));
    } else {
      onChange(
        clampCrop(
          { ...start, width: start.width + dx, height: start.height + dy },
          naturalSize.w,
          naturalSize.h,
          ratio,
        ),
      );
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      className="absolute inset-0 touch-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
        style={{ left: d.left, top: d.top, width: d.width, height: d.height }}
        onPointerDown={onPointerDown('move')}
      >
        <div
          className="absolute bottom-0 right-0 h-6 w-6 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-full border-2 border-white bg-[var(--accent)]"
          onPointerDown={(e) => {
            e.stopPropagation();
            onPointerDown('se')(e);
          }}
        />
      </div>
    </div>
  );
}

function DrawCanvas({
  strokes,
  displaySize,
  naturalSize,
  color,
  brushSize,
  onStrokeEnd,
}: {
  strokes: DrawStroke[];
  displaySize: { w: number; h: number };
  naturalSize: { w: number; h: number };
  color: string;
  brushSize: number;
  onStrokeEnd: (stroke: DrawStroke) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStroke = useRef<DrawStroke | null>(null);
  const scaleX = naturalSize.w / displaySize.w;
  const scaleY = naturalSize.h / displaySize.h;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const all = currentStroke.current ? [...strokes, currentStroke.current] : strokes;
    for (const stroke of all) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x / scaleX, stroke.points[0].y / scaleY);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x / scaleX, stroke.points[i].y / scaleY);
      }
      ctx.stroke();
    }
  }, [strokes, scaleX, scaleY]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const toNatural = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  return (
    <canvas
      ref={canvasRef}
      width={displaySize.w}
      height={displaySize.h}
      className="absolute inset-0 touch-none cursor-crosshair"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const p = toNatural(e);
        currentStroke.current = { color, width: brushSize, points: [p] };
        redraw();
      }}
      onPointerMove={(e) => {
        if (!currentStroke.current) return;
        currentStroke.current.points.push(toNatural(e));
        redraw();
      }}
      onPointerUp={() => {
        if (currentStroke.current && currentStroke.current.points.length > 1) {
          onStrokeEnd(currentStroke.current);
        }
        currentStroke.current = null;
      }}
    />
  );
}

export function ImageComposer({ open, files, initialCaption = '', onClose, onSend }: ImageComposerProps) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<ImageItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [mode, setMode] = useState<EditorMode>('preview');
  const [cropRatio, setCropRatio] = useState<number | null>(null);
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [brushSize, setBrushSize] = useState(6);
  const [textColor, setTextColor] = useState('#ffffff');
  const [textInput, setTextInput] = useState('');
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null);
  const [hd, setHd] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !files.length) return;

    let cancelled = false;
    setCaption(initialCaption);
    setMode('preview');
    setActiveIndex(0);
    setCropRatio(null);
    setShowEmoji(false);

    void (async () => {
      const loaded: ImageItem[] = [];
      for (const file of files) {
        const img = await loadImageElement(file);
        if (cancelled) return;
        loaded.push({
          file,
          previewUrl: img.src,
          edit: defaultEditState(),
          naturalSize: { w: img.naturalWidth, h: img.naturalHeight },
        });
      }
      if (!cancelled) setItems(loaded);
    })();

    return () => {
      cancelled = true;
      setItems((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return [];
      });
    };
  }, [open, files, initialCaption]);

  const active = items[activeIndex];

  const updateActiveEdit = useCallback(
    (patch: Partial<ImageEditState> | ((edit: ImageEditState) => ImageEditState)) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== activeIndex) return item;
          const nextEdit = typeof patch === 'function' ? patch(item.edit) : { ...item.edit, ...patch };
          return { ...item, edit: nextEdit };
        }),
      );
    },
    [activeIndex],
  );

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const img = imgRef.current;
      if (!img) return;
      setDisplaySize({ w: img.clientWidth, h: img.clientHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (imgRef.current) ro.observe(imgRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [open, activeIndex, mode, active?.edit.rotation]);

  const startCrop = () => {
    if (!active) return;
    const ratio = cropRatio;
    const crop = active.edit.crop ?? defaultCropRect(active.naturalSize.w, active.naturalSize.h, ratio);
    updateActiveEdit({ crop: clampCrop(crop, active.naturalSize.w, active.naturalSize.h, ratio) });
    setMode('crop');
  };

  const applyCrop = () => {
    setMode('preview');
  };

  const rotate = () => {
    updateActiveEdit((edit) => ({ ...edit, rotation: (edit.rotation + 90) % 360 }));
  };

  const undoDraw = () => {
    updateActiveEdit((edit) => ({ ...edit, strokes: edit.strokes.slice(0, -1) }));
  };

  const clearDraw = () => {
    updateActiveEdit({ strokes: [] });
  };

  const placeText = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!active || mode !== 'text') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * active.naturalSize.w;
    const y = ((e.clientY - rect.top) / rect.height) * active.naturalSize.h;
    setPendingTextPos({ x, y });
    setTextInput('');
  };

  const confirmText = () => {
    if (!pendingTextPos || !textInput.trim()) {
      setPendingTextPos(null);
      return;
    }
    const overlay: TextOverlay = {
      id: `t-${Date.now()}`,
      x: pendingTextPos.x,
      y: pendingTextPos.y,
      text: textInput.trim(),
      color: textColor,
      fontSize: 42,
    };
    updateActiveEdit((edit) => ({ ...edit, texts: [...edit.texts, overlay] }));
    setPendingTextPos(null);
    setTextInput('');
  };

  const previewStyle = useMemo(() => {
    if (!active) return {};
    return { transform: `rotate(${active.edit.rotation}deg)` };
  }, [active]);

  const send = async () => {
    if (!items.length || sending) return;
    setSending(true);
    try {
      const exported = await Promise.all(items.map((item) => exportEditedImage(item.file, item.edit, hd)));
      await onSend(exported, caption.trim());
      onClose();
    } finally {
      setSending(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && items.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex flex-col bg-[#0b141a] text-white"
        >
          {/* Top bar */}
          <div className="safe-top flex shrink-0 items-center justify-between px-2 py-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="flex items-center gap-1">
              {mode === 'crop' ? (
                <>
                  {CROP_RATIOS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setCropRatio(r.ratio);
                        if (active) {
                          const crop = defaultCropRect(active.naturalSize.w, active.naturalSize.h, r.ratio);
                          updateActiveEdit({ crop });
                        }
                      }}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium',
                        cropRatio === r.ratio ? 'bg-[var(--accent)]' : 'bg-white/10',
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={applyCrop}
                    className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startCrop}
                    className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
                    aria-label="Crop"
                  >
                    <Crop className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'draw' ? 'preview' : 'draw')}
                    className={cn('flex h-10 w-10 items-center justify-center rounded-full', mode === 'draw' && 'bg-white/15')}
                    aria-label="Draw"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'text' ? 'preview' : 'text')}
                    className={cn('flex h-10 w-10 items-center justify-center rounded-full', mode === 'text' && 'bg-white/15')}
                    aria-label="Add text"
                  >
                    <Type className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={rotate}
                    className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
                    aria-label="Rotate"
                  >
                    <RotateCw className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHd((v) => !v)}
                    className={cn(
                      'flex h-10 items-center gap-1 rounded-full px-2.5 text-xs font-semibold',
                      hd ? 'bg-[var(--accent)]' : 'bg-white/10',
                    )}
                    aria-label="HD quality"
                  >
                    <Zap className="h-4 w-4" />
                    HD
                  </button>
                </>
              )}
            </div>

            <div className="w-10" />
          </div>

          {/* Draw / text tools */}
          {mode === 'draw' && (
            <div className="flex shrink-0 items-center justify-center gap-2 px-4 py-2">
              {DRAW_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDrawColor(c)}
                  className={cn('h-7 w-7 rounded-full border-2', drawColor === c ? 'border-white scale-110' : 'border-transparent')}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="range"
                min={3}
                max={16}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="mx-2 w-24 accent-[var(--accent)]"
              />
              <button type="button" onClick={undoDraw} className="rounded-full p-2 hover:bg-white/10" aria-label="Undo">
                <Undo2 className="h-5 w-5" />
              </button>
              <button type="button" onClick={clearDraw} className="rounded-full p-2 hover:bg-white/10" aria-label="Clear">
                <Eraser className="h-5 w-5" />
              </button>
            </div>
          )}

          {mode === 'text' && (
            <div className="flex shrink-0 items-center justify-center gap-2 px-4 py-2">
              {DRAW_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setTextColor(c)}
                  className={cn('h-7 w-7 rounded-full border-2', textColor === c ? 'border-white scale-110' : 'border-transparent')}
                  style={{ backgroundColor: c }}
                />
              ))}
              <span className="text-xs text-white/60">Tap image to place text</span>
            </div>
          )}

          {/* Image preview */}
          <div ref={previewRef} className="relative mx-auto flex min-h-0 w-full max-w-lg flex-1 items-center justify-center px-3">
            <div className="relative" style={previewStyle} onClick={placeText}>
              <img
                ref={imgRef}
                src={active?.previewUrl}
                alt=""
                className="max-h-[min(58vh,520px)] max-w-full object-contain"
                draggable={false}
                onLoad={() => {
                  const img = imgRef.current;
                  if (img) setDisplaySize({ w: img.clientWidth, h: img.clientHeight });
                }}
              />

              {displaySize.w > 0 && (
                <div className="absolute left-0 top-0" style={{ width: displaySize.w, height: displaySize.h }}>
                  {mode === 'crop' && active?.edit.crop && (
                    <CropOverlay
                      crop={active.edit.crop}
                      displaySize={displaySize}
                      naturalSize={active.naturalSize}
                      ratio={cropRatio}
                      onChange={(crop) => updateActiveEdit({ crop })}
                    />
                  )}

                  {mode === 'draw' && active && (
                    <DrawCanvas
                      strokes={active.edit.strokes}
                      displaySize={displaySize}
                      naturalSize={active.naturalSize}
                      color={drawColor}
                      brushSize={brushSize}
                      onStrokeEnd={(stroke) =>
                        updateActiveEdit((edit) => ({ ...edit, strokes: [...edit.strokes, stroke] }))
                      }
                    />
                  )}

                  {active?.edit.texts.map((t) => (
                    <span
                      key={t.id}
                      className="pointer-events-none absolute font-semibold drop-shadow-md"
                      style={{
                        left: `${(t.x / active.naturalSize.w) * 100}%`,
                        top: `${(t.y / active.naturalSize.h) * 100}%`,
                        color: t.color,
                        fontSize: `${Math.max(14, (t.fontSize / active.naturalSize.h) * displaySize.h)}px`,
                        transform: 'translate(-2%, -50%)',
                      }}
                    >
                      {t.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Thumbnails for multiple images */}
          {items.length > 1 && (
            <div className="flex shrink-0 justify-center gap-2 px-4 py-2">
              {items.map((item, i) => (
                <button
                  key={item.previewUrl}
                  type="button"
                  onClick={() => {
                    setActiveIndex(i);
                    setMode('preview');
                  }}
                  className={cn(
                    'h-14 w-14 overflow-hidden rounded-lg border-2',
                    i === activeIndex ? 'border-[var(--accent)]' : 'border-transparent opacity-70',
                  )}
                >
                  <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Caption + send */}
          <div className="safe-bottom shrink-0 border-t border-white/10 bg-[#1f2c34] px-3 py-3">
            {pendingTextPos && (
              <div className="mb-2 flex gap-2">
                <input
                  autoFocus
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmText()}
                  placeholder="Type text..."
                  className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none"
                />
                <button type="button" onClick={confirmText} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium">
                  Add
                </button>
                <button type="button" onClick={() => setPendingTextPos(null)} className="rounded-lg px-2 text-white/60">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="relative">
              <EmojiPicker
                open={showEmoji}
                onSelect={(emoji) => {
                  setCaption((c) => c + emoji);
                  captionRef.current?.focus();
                }}
              />
            </div>

            <div className="flex items-end gap-2">
              <div className="flex min-h-[44px] flex-1 items-end rounded-full bg-[#2a3942] px-1 ring-1 ring-white/5">
                <button
                  type="button"
                  onClick={() => setShowEmoji((v) => !v)}
                  className="flex h-11 w-10 shrink-0 items-center justify-center text-white/70"
                >
                  <Smile className="h-6 w-6" />
                </button>
                <textarea
                  ref={captionRef}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  rows={1}
                  className="max-h-24 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] text-white placeholder:text-white/45 focus:outline-none"
                />
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                disabled={sending}
                onClick={() => void send()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
