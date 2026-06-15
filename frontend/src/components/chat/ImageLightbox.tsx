'use client';

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  index: number;
  open: boolean;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}

export function ImageLightbox({ images, index, open, onClose, onChangeIndex }: ImageLightboxProps) {
  if (typeof document === 'undefined' || !images.length) return null;

  const src = images[index];

  return createPortal(
    <AnimatePresence>
      {open && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/90"
        >
          <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full p-2 text-white hover:bg-white/10 safe-top">
            <X className="h-7 w-7" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => onChangeIndex(Math.max(0, index - 1))}
                className="absolute left-2 rounded-full p-2 text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                type="button"
                onClick={() => onChangeIndex(Math.min(images.length - 1, index + 1))}
                className="absolute right-2 rounded-full p-2 text-white hover:bg-white/10"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}
          <img src={src} alt="" className="max-h-[90vh] max-w-[95vw] object-contain" />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
