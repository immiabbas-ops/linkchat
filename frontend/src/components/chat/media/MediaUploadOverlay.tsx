'use client';

import { cn } from '@/lib/utils';

interface MediaUploadOverlayProps {
  sending?: boolean;
  progress?: number;
}

export function MediaUploadOverlay({ sending, progress }: MediaUploadOverlayProps) {
  if (!sending) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex flex-col items-center justify-center',
        'rounded-md bg-black/45 backdrop-blur-[3px]',
      )}
    >
      {progress != null && progress >= 0 ? (
        <div className="w-[70%] max-w-[200px]">
          <div className="h-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-200"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      )}
    </div>
  );
}
