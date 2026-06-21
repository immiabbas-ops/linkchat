'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMediaDuration } from '@/lib/media-ui';

interface VideoPlayerModalProps {
  src: string;
  open: boolean;
  onClose: () => void;
  title?: string;
}

export function VideoPlayerModal({ src, open, onClose, title }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setPlaying(false);
      setProgress(0);
      setReady(false);
      videoRef.current?.pause();
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [open, src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      void v.play().then(() => setPlaying(true));
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const seek = (pct: number) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = pct * duration;
    setProgress(pct);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[230] flex flex-col bg-black"
          onClick={onClose}
        >
          <div className="safe-top flex items-center justify-between px-3 py-2">
            <p className="truncate text-sm text-white/80">{title}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="rounded-full p-2 text-white hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div
            className="relative flex flex-1 items-center justify-center px-2"
            onClick={(e) => e.stopPropagation()}
          >
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            )}
            <video
              ref={videoRef}
              src={src}
              playsInline
              className="max-h-[75vh] max-w-full"
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) setProgress(v.currentTime / v.duration);
              }}
              onLoadedMetadata={(e) => {
                setDuration(e.currentTarget.duration || 0);
                setReady(true);
              }}
              onEnded={() => setPlaying(false)}
              onClick={togglePlay}
            />
          </div>

          <div
            className="safe-bottom space-y-2 px-4 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative h-1 cursor-pointer rounded-full bg-white/25"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seek((e.clientX - rect.left) / rect.width);
              }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[var(--read-tick)]"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button type="button" onClick={togglePlay} className="p-1">
                  {playing ? <Pause className="h-7 w-7 fill-white" /> : <Play className="h-7 w-7 fill-white" />}
                </button>
                <button type="button" onClick={toggleMute} className="p-1">
                  {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <span className="text-xs tabular-nums text-white/70">
                  {formatMediaDuration(progress * duration)} / {formatMediaDuration(duration)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
