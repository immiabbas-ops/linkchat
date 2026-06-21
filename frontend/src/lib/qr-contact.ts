import { normalizeUsername } from './username';
import { getShareOrigin } from './app-origin';

export type QrContactPayload = {
  type: 'linkchat-contact';
  username: string;
};

export function getAppOrigin(): string {
  return getShareOrigin();
}

export function buildContactQrUrl(username: string): string {
  const normalized = normalizeUsername(username);
  return `${getAppOrigin()}/add/@${normalized}`;
}

export function buildContactQrPayload(username: string): string {
  const payload: QrContactPayload = {
    type: 'linkchat-contact',
    username: normalizeUsername(username),
  };
  return JSON.stringify(payload);
}

export function parseContactQrText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const json = JSON.parse(trimmed) as Partial<QrContactPayload>;
    if (json.type === 'linkchat-contact' && json.username) {
      return normalizeUsername(json.username);
    }
  } catch {
    /* not JSON */
  }

  const urlMatch = trimmed.match(/\/add\/@?([a-z][a-z0-9_]{2,29})/i);
  if (urlMatch?.[1]) return normalizeUsername(urlMatch[1]);

  const schemeMatch = trimmed.match(/^linkchat:\/\/add\/@?([a-z][a-z0-9_]{2,29})/i);
  if (schemeMatch?.[1]) return normalizeUsername(schemeMatch[1]);

  if (/^@?[a-z][a-z0-9_]{2,29}$/i.test(trimmed)) {
    return normalizeUsername(trimmed);
  }

  return null;
}

export async function generateContactQrDataUrl(username: string): Promise<string> {
  const QRCode = await import('qrcode');
  return QRCode.toDataURL(buildContactQrUrl(username), {
    margin: 2,
    width: 280,
    color: { dark: '#1e1b4b', light: '#ffffff' },
  });
}
