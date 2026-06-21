import { SIGNATURES_STORAGE_KEY } from './constants';
import type { SavedSignature } from './types';

export function loadSavedSignatures(): SavedSignature[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SIGNATURES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSignature[]) : [];
  } catch {
    return [];
  }
}

export function saveSignature(name: string, dataUrl: string): SavedSignature {
  const sig: SavedSignature = {
    id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || 'Signature',
    dataUrl,
    createdAt: new Date().toISOString(),
  };
  const list = [...loadSavedSignatures(), sig];
  localStorage.setItem(SIGNATURES_STORAGE_KEY, JSON.stringify(list));
  return sig;
}

export function deleteSavedSignature(id: string): void {
  const list = loadSavedSignatures().filter((s) => s.id !== id);
  localStorage.setItem(SIGNATURES_STORAGE_KEY, JSON.stringify(list));
}

export function buildDocumentFilename(ext: 'pdf' | 'jpg' | 'png' = 'pdf'): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Document_${d.getFullYear()}_${pad(d.getMonth() + 1)}_${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.${ext}`;
}
