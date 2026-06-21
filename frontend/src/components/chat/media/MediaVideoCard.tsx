'use client';

import { memo, useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMediaDuration, truncateFileName } from '@/lib/media-ui';
import { useVideoThumbnail } from '@/lib/use-video-thumbnail';
import { MediaUploadOverlay } from './MediaUploadOverlay';
import { VideoPlayerModal } from './VideoPlayerModal';

interface MediaVideoCardProps {
  src: string;
  fileName?: string;
  caption?: string;
  sending?: boolean;
  uploadProgress?: number;
  timeOverlay?: React.ReactNode;
  footerTime?: React.ReactNode;
}

export const MediaVideoCard = memo(function MediaVideoCard({
  src,
  fileName,
  caption,
  sending,
  uploadProgress,
  timeOverlay,
  footerTime,
}: MediaVideoCardProps) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const { thumbnail, duration, loading, error } = useVideoThumbnail(src);
  const displayDuration = duration > 0 ? formatMediaDuration(duration) : null;
  const shortName = fileName ? truncateFileName(fileName, 28) : undefined;

  return (
    <>
      <div className="overflow-hidden rounded-md">
        <button
          type="button"
          disabled={sending}
          onClick={() => setPlayerOpen(true)}
          className="relative block w-full text-left"
        >
          <div
            className={cn(
              'relative flex min-h-[160px] max-h-[360px] w-full max-w-[min(300px,78vw)] items-center justify-center overflow-hidden rounded-md bg-[#0b141a]',
              loading && !thumbnail && 'animate-pulse bg-[#1f2c34]',
            )}
          >
            {thumbnail ? (
              <img
                src={thumbnail}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            ) : !error && (
              <video
                src={src}
                preload="metadata"
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover opacity-40"
              />
            )}
            <div className="absolute inset-0 bg-black/25" />
            <div className="relative z-[1] flex h-14 w-14 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm ring-1 ring-white/20">
              <Play className="ml-1 h-7 w-7 fill-white text-white" />
            </div>
            {displayDuration && (
              <span className="absolute bottom-2 right-2 z-[1] rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                {displayDuration}
              </span>
            )}
            <MediaUploadOverlay sending={sending} progress={uploadProgress} />
            {!caption && timeOverlay && (
              <div className="absolute bottom-2 left-2 z-[1] rounded-md bg-black/50 px-1.5 py-0.5 backdrop-blur-[2px]">
                {timeOverlay}
              </div>
            )}
          </div>
        </button>
        {shortName && !caption && (
          <p className="mt-1 truncate px-0.5 text-[11px] opacity-70">{shortName}</p>
        )}
        {caption && (
          <div className="mt-1 px-0.5">
            <p className="whitespace-pre-wrap text-[14.2px] leading-[19px]">{caption}</p>
            {footerTime && <div className="mt-0.5 flex justify-end">{footerTime}</div>}
          </div>
        )}
        {!caption && footerTime && !shortName && (
          <div className="mt-0.5 flex justify-end px-0.5">{footerTime}</div>
        )}
      </div>
      <VideoPlayerModal
        src={src}
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
        title={shortName}
      />
    </>
  );
});
