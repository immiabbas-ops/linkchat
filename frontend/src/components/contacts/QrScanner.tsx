'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';
import { parseContactQrText } from '@/lib/qr-contact';
import { isSecureBrowserContext } from '@/lib/permissions';

interface QrScannerProps {
  onScan: (username: string) => void;
  onError?: (message: string) => void;
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const [starting, setStarting] = useState(true);
  const [failed, setFailed] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!isSecureBrowserContext()) {
      setFailed('Camera requires HTTPS. Open LinkChat over a secure connection.');
      setStarting(false);
      return;
    }

    const scannerId = 'linkchat-qr-scanner';
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;
    handledRef.current = false;

    void scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (handledRef.current) return;
          const username = parseContactQrText(decoded);
          if (!username) return;
          handledRef.current = true;
          onScan(username);
        },
        () => {
          /* ignore frame errors */
        },
      )
      .then(() => setStarting(false))
      .catch(() => {
        setFailed('Could not access camera. Allow camera permission and try again.');
        setStarting(false);
        onError?.('Camera access denied');
      });

    return () => {
      void scanner.stop().catch(() => undefined);
      scannerRef.current = null;
    };
  }, [onScan, onError]);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-glass)] bg-[var(--search-bg)] px-6 py-12 text-center">
        <Camera className="mb-3 h-10 w-10 text-[var(--text-secondary)]" />
        <p className="text-sm text-[var(--text-secondary)]">{failed}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <div id="linkchat-qr-scanner" className="min-h-[280px] w-full [&>video]:object-cover" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-56 w-56 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
      </div>
      {starting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white">
          Starting camera…
        </div>
      )}
    </div>
  );
}

export function QrScannerOverlay({ onClose, onScan }: { onClose: () => void; onScan: (username: string) => void }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-2 text-white"
        aria-label="Close scanner"
      >
        <X className="h-4 w-4" />
      </button>
      <QrScanner onScan={onScan} />
      <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">
        Point your camera at a LinkChat QR code
      </p>
    </div>
  );
}
