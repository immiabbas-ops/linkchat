'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Trash2, Send, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSupportedRecordingMime } from '@/lib/audio';
import { socketService } from '@/lib/socket';

interface VoiceRecorderProps {
  chatId: string;
  onSend: (blob: Blob) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ chatId, onSend, onCancel }: VoiceRecorderProps) {
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(Array(28).fill(0.25));
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>();
  const durationRef = useRef(0);
  const cancelledRef = useRef(false);
  const onSendRef = useRef(onSend);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onSendRef.current = onSend;
    onCancelRef.current = onCancel;
  }, [onSend, onCancel]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const releaseMic = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = undefined;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    socketService.setRecording(chatId, false);
  }, [chatId]);

  const finish = useCallback(
    (cancel: boolean) => {
      if (sending) return;
      cancelledRef.current = cancel;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state === 'recording') {
        setSending(true);
        recorder.stop();
        return;
      }
      releaseMic();
      onCancel();
    },
    [onCancel, releaseMic, sending],
  );

  useEffect(() => {
    let active = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const mimeType = getSupportedRecordingMime();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const mime = recorder.mimeType || getSupportedRecordingMime();
          const blob =
            chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: mime }) : null;

          releaseMic();
          setSending(false);

          if (!cancelledRef.current && blob && durationRef.current >= 1) {
            onSendRef.current(blob);
          } else {
            onCancelRef.current();
          }
        };

        recorder.start();
        socketService.setRecording(chatId, true);
        setReady(true);

        timerRef.current = setInterval(() => {
          durationRef.current += 1;
          setDuration(durationRef.current);
        }, 1000);

        const updateWaveform = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          setWaveform(
            Array.from({ length: 28 }, (_, i) => {
              const idx = Math.floor((i / 28) * data.length);
              return Math.max(0.15, data[idx] / 255);
            }),
          );
          animRef.current = requestAnimationFrame(updateWaveform);
        };
        updateWaveform();
      } catch {
        releaseMic();
        onCancelRef.current();
      }
    };

    void start();

    return () => {
      active = false;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state === 'recording') {
        cancelledRef.current = true;
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
      releaseMic();
    };
  }, [chatId, releaseMic]);

  return (
    <div className="safe-bottom bg-[#f0f2f5] px-2 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => finish(true)}
          disabled={sending}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[#54656f] hover:bg-black/[0.05]"
          aria-label="Cancel recording"
        >
          <Trash2 className="h-6 w-6" />
        </button>

        <div className="flex min-h-[48px] flex-1 items-center gap-3 rounded-[24px] bg-white px-4 shadow-sm">
          <span className="flex h-3 w-3 shrink-0 animate-pulse rounded-full bg-[#ea0038]" />
          <span className="min-w-[40px] text-[15px] tabular-nums text-[#111b21]">
            {formatTime(duration)}
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-[2px]">
            {waveform.map((h, i) => (
              <span
                key={i}
                className={cn('w-[3px] rounded-full', ready ? 'bg-[#008069]' : 'bg-[#8696a0]')}
                style={{ height: `${Math.max(4, h * 22)}px` }}
              />
            ))}
          </div>
          <Mic className="h-5 w-5 shrink-0 text-[#54656f]" />
        </div>

        <button
          type="button"
          onClick={() => finish(false)}
          disabled={!ready || sending || duration < 1}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#008069] text-white shadow-sm disabled:opacity-40"
          aria-label="Send voice message"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
