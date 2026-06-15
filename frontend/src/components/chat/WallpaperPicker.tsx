'use client';

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { WALLPAPERS, type WallpaperId, setWallpaper } from '@/lib/chat-preferences';

interface WallpaperPickerProps {
  chatId: string;
  open: boolean;
  onClose: () => void;
  onChange: () => void;
}

const OPTIONS: { id: WallpaperId; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'nebula', label: 'Nebula' },
  { id: 'dots', label: 'Dots' },
  { id: 'gradient', label: 'Gradient' },
];

export function WallpaperPicker({ chatId, open, onClose, onChange }: WallpaperPickerProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-x-0 bottom-0 z-[201] rounded-t-2xl bg-[var(--bg-panel)] p-4 safe-bottom"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[17px] font-medium text-[var(--text-primary)]">Chat wallpaper</h3>
              <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-black/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setWallpaper(chatId, opt.id);
                    onChange();
                    onClose();
                  }}
                  className="overflow-hidden rounded-xl border border-[var(--border-glass)]"
                >
                  <div
                    className="h-24 bg-[var(--bg-primary)]"
                    style={opt.id !== 'default' ? { backgroundImage: WALLPAPERS[opt.id], backgroundSize: opt.id === 'dots' ? '18px 18px' : undefined } : undefined}
                  />
                  <p className="py-2 text-center text-sm text-[var(--text-primary)]">{opt.label}</p>
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
