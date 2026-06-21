/** UI helpers for WhatsApp-style media message cards. */

const THUMB_CACHE = new Map<string, string>();

export function truncateFileName(name: string, max = 28): string {
  if (!name || name.length <= max) return name || 'File';
  const dot = name.lastIndexOf('.');
  if (dot > 0 && dot < name.length - 1) {
    const ext = name.slice(dot);
    const base = name.slice(0, dot);
    const keep = max - ext.length - 3;
    if (keep >= 4) return `${base.slice(0, keep)}...${ext}`;
  }
  return `${name.slice(0, max - 3)}...`;
}

export function formatMediaDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function getCachedThumbnail(src: string): string | null {
  return THUMB_CACHE.get(src) ?? null;
}

export function setCachedThumbnail(src: string, dataUrl: string) {
  THUMB_CACHE.set(src, dataUrl);
  if (THUMB_CACHE.size > 80) {
    const first = THUMB_CACHE.keys().next().value;
    if (first) THUMB_CACHE.delete(first);
  }
}

export function generateWaveformBars(seed: string, count = 48): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Array.from({ length: count }, (_, i) => {
    const a = Math.abs(Math.sin((hash + i * 13) * 0.55));
    const b = Math.abs(Math.cos((hash + i * 7) * 0.41));
    return 0.18 + (a * 0.45 + b * 0.37);
  });
}
