'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Image,
  Video,
  FileText,
  MapPin,
  FolderOpen,
  ScanLine,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const options = [
  { id: 'scanner', label: 'Scanner', icon: ScanLine, color: 'from-amber-500 to-orange-500' },
  { id: 'camera', label: 'Camera', icon: Camera, color: 'from-pink-500 to-rose-500' },
  { id: 'gallery', label: 'Gallery', icon: Image, color: 'from-purple-500 to-violet-500' },
  { id: 'video', label: 'Video', icon: Video, color: 'from-red-500 to-orange-500' },
  { id: 'document', label: 'Document', icon: FileText, color: 'from-blue-500 to-cyan-500' },
  { id: 'location', label: 'Location', icon: MapPin, color: 'from-green-500 to-emerald-500' },
  { id: 'files', label: 'Files', icon: FolderOpen, color: 'from-slate-500 to-gray-500' },
];

interface AttachmentSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: string) => void;
}

export function AttachmentSheet({ open, onClose, onSelect }: AttachmentSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-[var(--list-bg)] p-6 safe-bottom"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-[var(--text-primary)]">Share</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {options.map((option, i) => {
                const Icon = option.icon;
                return (
                  <motion.button
                    key={option.id}
                    type="button"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => {
                      onSelect(option.id);
                      onClose();
                    }}
                    className="flex flex-col items-center gap-2 p-2"
                  >
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br shadow-md',
                        option.color,
                      )}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">{option.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
