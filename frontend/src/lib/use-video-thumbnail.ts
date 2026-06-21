'use client';

import { useEffect, useState } from 'react';
import { getCachedThumbnail, setCachedThumbnail } from './media-ui';

interface VideoThumbState {
  thumbnail: string | null;
  duration: number;
  loading: boolean;
  error: boolean;
}

export function useVideoThumbnail(src: string | undefined): VideoThumbState {
  const [state, setState] = useState<VideoThumbState>({
    thumbnail: src ? getCachedThumbnail(src) : null,
    duration: 0,
    loading: !!src && !getCachedThumbnail(src || ''),
    error: false,
  });

  useEffect(() => {
    if (!src) {
      setState({ thumbnail: null, duration: 0, loading: false, error: false });
      return;
    }

    const cached = getCachedThumbnail(src);
    if (cached) {
      setState((s) => ({ ...s, thumbnail: cached, loading: false, error: false }));
      return;
    }

    let cancelled = false;
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };

    const capture = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const w = video.videoWidth || 320;
        const h = video.videoHeight || 180;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no canvas');
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        setCachedThumbnail(src, dataUrl);
        setState({
          thumbnail: dataUrl,
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          loading: false,
          error: false,
        });
      } catch {
        setState({ thumbnail: null, duration: 0, loading: false, error: true });
      } finally {
        cleanup();
      }
    };

    video.addEventListener('loadeddata', () => {
      if (cancelled) return;
      const seekTo = Math.min(0.5, (video.duration || 1) * 0.05);
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        capture();
      };
      video.addEventListener('seeked', onSeeked);
      try {
        video.currentTime = seekTo;
      } catch {
        capture();
      }
    });

    video.addEventListener('loadedmetadata', () => {
      if (!cancelled && Number.isFinite(video.duration)) {
        setState((s) => ({ ...s, duration: video.duration }));
      }
    });

    video.addEventListener('error', () => {
      if (!cancelled) {
        setState({ thumbnail: null, duration: 0, loading: false, error: true });
        cleanup();
      }
    });

    video.src = src;
    video.load();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [src]);

  return state;
}
