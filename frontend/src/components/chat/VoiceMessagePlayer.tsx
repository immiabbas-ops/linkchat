'use client';

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Mic, Pause, Play } from 'lucide-react';
import { cn, formatMessageTime } from '@/lib/utils';
import { mimeFromUrl } from '@/lib/audio';
import { formatMediaDuration, generateWaveformBars } from '@/lib/media-ui';
import { Avatar } from '@/components/ui/Avatar';

const BAR_COUNT = 48;

const VoiceWaveform = memo(function VoiceWaveform({
  bars,
  progress,
  playing,
  isOwn,
  onSeek,
}: {
  bars: number[];
  progress: number;
  playing: boolean;
  isOwn: boolean;
  onSeek: (pct: number) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const clipId = useId();
  const activeColor = isOwn ? '#53bdeb' : 'var(--read-tick)';
  const idleColor = isOwn ? 'rgba(255,255,255,0.45)' : '#8696a0';
  const progressWidth = progress * BAR_COUNT * 4;

  const handlePointer = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect?.width) return;
    onSeek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
  };

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${BAR_COUNT * 4} 28`}
      className="h-7 w-full min-w-0 cursor-pointer touch-none"
      preserveAspectRatio="none"
      onClick={(e) => handlePointer(e.clientX)}
      onTouchEnd={(e) => {
        const t = e.changedTouches[0];
        if (t) handlePointer(t.clientX);
      }}
      role="slider"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={progressWidth} height="28" />
        </clipPath>
        <linearGradient id={`${clipId}-fill`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={activeColor} stopOpacity="1" />
          <stop offset="100%" stopColor={activeColor} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      {bars.map((h, i) => {
        const barH = Math.max(3, h * 24);
        const x = i * 4 + 0.5;
        const y = (28 - barH) / 2;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="2.5"
            height={barH}
            rx="1.25"
            fill={idleColor}
            className={cn(playing && i > progress * BAR_COUNT ? 'opacity-80' : '')}
          />
        );
      })}
      <g clipPath={`url(#${clipId})`}>
        {bars.map((h, i) => {
          const barH = Math.max(3, h * 24);
          const x = i * 4 + 0.5;
          const y = (28 - barH) / 2;
          return (
            <rect
              key={`a-${i}`}
              x={x}
              y={y}
              width="2.5"
              height={barH}
              rx="1.25"
              fill={`url(#${clipId}-fill)`}
            />
          );
        })}
      </g>
      {playing && <circle cx={progressWidth} cy="14" r="3.5" fill={activeColor} className="drop-shadow-sm" />}
    </svg>
  );
});

interface VoiceMessagePlayerProps {
  src: string;
  isOwn: boolean;
  avatarUrl?: string;
  avatarName?: string;
  createdAt: string;
  status?: React.ReactNode;
}

export const VoiceMessagePlayer = memo(function VoiceMessagePlayer({
  src,
  isOwn,
  avatarUrl,
  avatarName,
  createdAt,
  status,
}: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);
  const [speed, setSpeed] = useState(1);

  const mimeType = useMemo(() => mimeFromUrl(src), [src]);
  const bars = useMemo(() => generateWaveformBars(src, BAR_COUNT), [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setError(false);
    setPlaying(false);
    setProgress(0);
    setDuration(0);
    audio.src = src;
    audio.load();

    const onTime = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
      }
    };
    const onMeta = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      audio.currentTime = 0;
    };
    const onError = () => {
      setError(true);
      setPlaying(false);
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onError);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const loadBlobFallback = async (): Promise<boolean> => {
    const audio = audioRef.current;
    if (!audio) return false;
    try {
      const response = await fetch(src);
      if (!response.ok) return false;
      const blob = await response.blob();
      const typedBlob = blob.type ? blob : new Blob([blob], { type: mimeType });
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = URL.createObjectURL(typedBlob);
      audio.src = blobUrlRef.current;
      audio.load();
      setError(false);
      return true;
    } catch {
      return false;
    }
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || error) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      const recovered = await loadBlobFallback();
      if (!recovered) {
        setError(true);
        return;
      }
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setError(true);
        setPlaying(false);
      }
    }
  };

  const seek = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = pct * audio.duration;
    setProgress(pct);
  }, []);

  const cycleSpeed = () => setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1));

  const displayTime = playing
    ? formatMediaDuration(progress * duration)
    : formatMediaDuration(duration || 0);

  return (
    <div className="min-w-[240px] max-w-[300px]">
      <audio ref={audioRef} preload="metadata" className="hidden" crossOrigin="anonymous">
        <source src={src} type={mimeType} />
      </audio>

      <div className={cn('flex items-center gap-2.5', isOwn && 'flex-row-reverse')}>
        <div className="relative shrink-0">
          <Avatar src={avatarUrl} name={avatarName} size="md" />
          <span
            className={cn(
              'absolute flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--read-tick)]',
              isOwn ? '-bottom-0.5 -right-0.5' : '-bottom-0.5 -left-0.5',
            )}
          >
            <Mic className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
          </span>
        </div>

        <button
          type="button"
          onClick={togglePlay}
          disabled={error}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-40',
            isOwn ? 'bg-white/20 text-white' : 'bg-[var(--read-tick)] text-white',
          )}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <Pause className="h-[18px] w-[18px] fill-current" />
          ) : (
            <Play className="ml-0.5 h-[18px] w-[18px] fill-current" />
          )}
        </button>

        <div className="min-w-0 flex-1 pt-0.5">
          <VoiceWaveform
            bars={bars}
            progress={progress}
            playing={playing}
            isOwn={isOwn}
            onSeek={seek}
          />
        </div>
      </div>

      <div
        className={cn(
          'mt-1 flex items-end justify-between gap-2',
          isOwn ? 'pl-[52px]' : 'pr-[52px]',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] tabular-nums text-[var(--text-secondary)]">
            {error ? 'Unable to play' : displayTime}
          </span>
          {!error && (
            <button
              type="button"
              onClick={cycleSpeed}
              className="rounded px-1 text-[10px] font-semibold text-[var(--accent-dark)] hover:bg-black/[0.04]"
            >
              {speed}×
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[var(--text-secondary)]">
            {formatMessageTime(createdAt)}
          </span>
          {isOwn && status}
        </div>
      </div>
    </div>
  );
});
