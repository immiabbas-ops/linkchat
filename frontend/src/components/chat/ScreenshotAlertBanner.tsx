'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera } from 'lucide-react';
import { formatUsername } from '@/lib/username';

export interface ScreenshotAlert {
  id: string;
  displayName?: string;
  username?: string;
  at: string;
}

interface ScreenshotAlertBannerProps {
  alert: ScreenshotAlert | null;
  onDismiss: () => void;
}

export function ScreenshotAlertBanner({ alert, onDismiss }: ScreenshotAlertBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!alert) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [alert, onDismiss]);

  const name = alert?.displayName || formatUsername(alert?.username) || 'Someone';

  return (
    <AnimatePresence>
      {visible && alert && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="pointer-events-none absolute left-0 right-0 top-2 z-30 flex justify-center px-4"
        >
          <div className="flex max-w-sm items-center gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/95 to-orange-500/95 px-4 py-3 text-white shadow-lg backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Camera className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-tight">Screenshot detected</p>
              <p className="text-[12px] leading-snug text-white/90">
                {name} took a screenshot of this chat
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
