'use client';

import { useEffect, useRef } from 'react';
import { socketService } from '@/lib/socket';

export function useScreenshotDetector(chatId: string | null, enabled = true) {
  const lastReport = useRef(0);

  useEffect(() => {
    if (!enabled || !chatId) return;

    const report = () => {
      const now = Date.now();
      if (now - lastReport.current < 4000) return;
      lastReport.current = now;
      socketService.reportScreenshot(chatId);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        report();
        return;
      }
      if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
        report();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        report();
      }
    };

    const onCopy = () => {
      const selection = window.getSelection()?.toString().trim();
      if (selection && selection.length > 20) report();
    };

    window.addEventListener('keyup', onKeyUp);
    document.addEventListener('copy', onCopy);

    return () => {
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('copy', onCopy);
    };
  }, [chatId, enabled]);
}
