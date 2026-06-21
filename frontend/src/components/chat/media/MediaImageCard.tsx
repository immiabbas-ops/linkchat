'use client';

import { memo, useState } from 'react';
import { ScanLine, Stamp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediaUploadOverlay } from './MediaUploadOverlay';

interface MediaImageCardProps {
  src: string;
  alt?: string;
  caption?: string;
  sending?: boolean;
  uploadProgress?: number;
  isScanned?: boolean;
  isSigned?: boolean;
  onClick?: () => void;
  timeOverlay?: React.ReactNode;
  showTruncatedName?: boolean;
  truncatedName?: string;
  footerTime?: React.ReactNode;
}

export const MediaImageCard = memo(function MediaImageCard({
  src,
  alt = 'Image',
  caption,
  sending,
  uploadProgress,
  isScanned,
  isSigned,
  onClick,
  timeOverlay,
  showTruncatedName,
  truncatedName,
  footerTime,
}: MediaImageCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="overflow-hidden rounded-md">
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick || sending}
        className="relative block w-full text-left"
      >
        <div
          className={cn(
            'relative min-h-[100px] max-h-[360px] w-full max-w-[min(300px,78vw)] overflow-hidden rounded-md bg-[#0b141a]/10',
            !loaded && !failed && 'animate-pulse',
          )}
        >
          {!failed && (
            <img
              src={src}
              alt={alt}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={cn(
                'block max-h-[360px] min-h-[100px] w-full object-cover transition-opacity duration-300',
                loaded ? 'opacity-100' : 'opacity-0',
              )}
            />
          )}
          {failed && (
            <div className="flex min-h-[140px] items-center justify-center bg-black/5 text-xs text-[var(--text-secondary)]">
              Image unavailable
            </div>
          )}
          <MediaUploadOverlay sending={sending} progress={uploadProgress} />
          {(isScanned || isSigned) && (
            <div className="absolute left-2 top-2 z-[1] flex flex-wrap gap-1">
              {isScanned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                  <ScanLine className="h-3 w-3" />
                  Scanned
                </span>
              )}
              {isSigned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1d4ed8]/90 px-2 py-0.5 text-[10px] font-medium text-white">
                  <Stamp className="h-3 w-3" />
                  Signed
                </span>
              )}
            </div>
          )}
          {!caption && !showTruncatedName && timeOverlay && (
            <div className="absolute bottom-1.5 right-1.5 z-[1] rounded-md bg-black/50 px-1.5 py-0.5 shadow-sm backdrop-blur-[2px]">
              {timeOverlay}
            </div>
          )}
        </div>
      </button>
      {showTruncatedName && truncatedName && (
        <p className="mt-1 truncate px-0.5 text-[11px] opacity-70">{truncatedName}</p>
      )}
      {caption && (
        <div className="mt-1 px-0.5">
          <p className="whitespace-pre-wrap text-[14.2px] leading-[19px]">{caption}</p>
        </div>
      )}
      {(caption || showTruncatedName) && footerTime && (
        <div className="mt-0.5 flex items-end justify-end px-0.5">{footerTime}</div>
      )}
    </div>
  );
});
