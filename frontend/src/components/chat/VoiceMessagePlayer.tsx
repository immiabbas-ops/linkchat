'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Pause, Play } from 'lucide-react';
import { cn, formatMessageTime } from '@/lib/utils';
import { mimeFromUrl } from '@/lib/audio';
import { Avatar } from '@/components/ui/Avatar';

function generateWaveform(seed: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Array.from({ length: count }, (_, i) => {
    const v = Math.abs(Math.sin((hash + i * 17) * 0.7)) * 0.65 + 0.2;
    return v;
  });
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

interface VoiceMessagePlayerProps {
  src: string;
  isOwn: boolean;
  avatarUrl?: string;
  avatarName?: string;
  createdAt: string;
  status?: React.ReactNode;
}

export function VoiceMessagePlayer({
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
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [speed, setSpeed] = useState(1);

  const mimeType = useMemo(() => mimeFromUrl(src), [src]);
  const bars = useMemo(() => generateWaveform(src, 32), [src]);
  const progressIndex = Math.floor(progress * bars.length);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setReady(false);
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
        setReady(true);
      }
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onError = () => {
      setError(true);
      setReady(false);
      setPlaying(false);
    };
    const onCanPlay = () => {
      setReady(true);
      setError(false);
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onError);
    audio.addEventListener('canplay', onCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('canplay', onCanPlay);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const cycleSpeed = () => {
    setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1));
  };

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
      setReady(true);
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

  const avatar = (
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
  );

  return (
    <div className="min-w-[240px] max-w-[280px]">
      <audio ref={audioRef} preload="metadata" className="hidden" crossOrigin="anonymous">
        <source src={src} type={mimeType} />
      </audio>

      <div className={cn('flex items-center gap-2', isOwn && 'flex-row-reverse')}>
        {avatar}

        <button
          type="button"
          onClick={togglePlay}
          disabled={error}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-black/[0.04] disabled:opacity-40"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 fill-current" />
          )}
        </button>

        <div className="relative flex min-w-0 flex-1 items-end gap-[2px] pb-1 pt-2">
          {bars.map((h, i) => (
            <span
              key={i}
              className={cn(
                'w-[3px] rounded-full transition-colors',
                i <= progressIndex ? 'bg-[var(--read-tick)]' : 'bg-[#8696a0]',
              )}
              style={{ height: `${Math.max(4, h * 22)}px` }}
            />
          ))}
          {playing && (
            <span
              className="absolute top-1 h-2 w-2 rounded-full bg-[var(--read-tick)]"
              style={{ left: `${Math.min(98, progress * 100)}%`, transform: 'translateX(-50%)' }}
            />
          )}
        </div>
      </div>

      <div
        className={cn(
          'mt-0.5 flex items-end justify-between gap-2',
          isOwn ? 'pl-[52px]' : 'pr-[52px]',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-secondary)]">
            {error ? 'Unable to play' : formatDuration(duration || 0)}
          </span>
          {!error && (
            <button
              type="button"
              onClick={cycleSpeed}
              className="rounded px-1 text-[10px] font-medium text-[var(--accent-dark)] hover:bg-black/[0.04]"
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
}
