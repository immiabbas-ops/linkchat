'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, RotateCcw, Save, Upload } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string, name: string) => void;
  onCancel: () => void;
}

export function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const history = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const [name, setName] = useState('My signature');

  const getCtx = () => canvasRef.current?.getContext('2d');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#111827';
    pushHistory();
  }, []);

  const pushHistory = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.current.length > 30) history.current.shift();
    redoStack.current = [];
  };

  const undo = () => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas || history.current.length < 2) return;
    const current = history.current.pop()!;
    redoStack.current.push(current);
    const prev = history.current[history.current.length - 1];
    ctx.putImageData(prev, 0, 0);
  };

  const redo = () => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas || redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    history.current.push(next);
    ctx.putImageData(next, 0, 0);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pushHistory();
  };

  const pos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent) => {
    drawing.current = true;
    const ctx = getCtx()!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = getCtx()!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    pushHistory();
  };

  const upload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          clear();
          const canvas = canvasRef.current!;
          const ctx = getCtx()!;
          const scale = Math.min(canvas.clientWidth / img.width, canvas.clientHeight / img.height) * 0.8;
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (canvas.clientWidth - w) / 2, (canvas.clientHeight - h) / 2, w, h);
          pushHistory();
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const save = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0);
    onSave(exportCanvas.toDataURL('image/png'), name);
  }, [name, onSave]);

  return (
    <div className="flex flex-col gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Signature name"
        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50"
      />
      <canvas
        ref={canvasRef}
        className="h-36 w-full touch-none rounded-xl border-2 border-dashed border-white/30 bg-white"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={undo} className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white">Undo</button>
        <button type="button" onClick={redo} className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white">Redo</button>
        <button type="button" onClick={clear} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs text-white">
          <Eraser className="h-3.5 w-3.5" /> Clear
        </button>
        <button type="button" onClick={upload} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs text-white">
          <Upload className="h-3.5 w-3.5" /> Upload
        </button>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-white/25 py-2.5 text-sm text-white">
          <RotateCcw className="h-4 w-4" /> Cancel
        </button>
        <button type="button" onClick={save} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white">
          <Save className="h-4 w-4" /> Save
        </button>
      </div>
    </div>
  );
}
