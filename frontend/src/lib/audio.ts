const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const RECORDING_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/aac',
];

const MIME_TO_EXT: Record<string, string> = {
  'audio/webm;codecs=opus': 'webm',
  'audio/webm': 'webm',
  'audio/ogg;codecs=opus': 'ogg',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/aac': 'm4a',
  'audio/mpeg': 'mp3',
};

const EXT_TO_MIME: Record<string, string> = {
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
};

export function getSupportedRecordingMime(): string {
  if (typeof window === 'undefined' || !window.MediaRecorder) return 'audio/webm';
  for (const type of RECORDING_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'audio/webm';
}

export function extensionForMime(mime: string): string {
  return MIME_TO_EXT[mime] || mime.split('/')[1]?.split(';')[0] || 'webm';
}

export function mimeFromUrl(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  return EXT_TO_MIME[ext] || 'audio/webm';
}

export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const origin = API_BASE.replace(/\/api\/v1\/?$/, '');
  return url.startsWith('/') ? `${origin}${url}` : `${API_BASE}/${url}`;
}

export function getVoiceMessageUrl(message: {
  mediaFiles?: { url?: string }[];
  metadata?: Record<string, unknown>;
}): string | null {
  const fromFile = message.mediaFiles?.[0]?.url;
  const fromMeta = message.metadata?.url as string | undefined;
  return resolveMediaUrl(fromFile || fromMeta);
}
