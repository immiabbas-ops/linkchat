const CANONICAL_HOST = 'link-chats.com';

/** Public URL to share (always HTTPS domain, never IP or http). */
export function getShareOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (configured) {
    const url = configured.startsWith('http') ? configured : `https://${configured}`;
    return url.replace(/^http:\/\//i, 'https://');
  }

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return window.location.origin;
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || protocol === 'http:') {
      return `https://${CANONICAL_HOST}`;
    }
    return window.location.origin;
  }

  return `https://${CANONICAL_HOST}`;
}
