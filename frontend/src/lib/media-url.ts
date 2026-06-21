import { getApiUrl } from '@/lib/service-urls';

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isIpAddress(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

/** Origin used for media file URLs (HTTPS on production). */
function getSecureMediaOrigin(): string {
  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (!isLocalHost(hostname)) {
      return origin;
    }
  }
  try {
    return new URL(getApiUrl()).origin;
  } catch {
    return '';
  }
}

function shouldRewriteToSecureOrigin(hostname: string, protocol: string): boolean {
  if (isLocalHost(hostname) || isIpAddress(hostname)) return true;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && protocol === 'http:') {
    return true;
  }
  return false;
}

/**
 * Rewrite media URLs so they load on HTTPS pages (fixes mixed content from
 * localhost, VPS IP, or http:// links stored in the database).
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';

  const secureOrigin = getSecureMediaOrigin();

  if (url.startsWith('/')) {
    return secureOrigin ? `${secureOrigin}${url}` : url;
  }

  try {
    const parsed = new URL(url);

    if (parsed.pathname.includes('/media/files/') || shouldRewriteToSecureOrigin(parsed.hostname, parsed.protocol)) {
      if (secureOrigin) {
        return `${secureOrigin}${parsed.pathname}${parsed.search}`;
      }
    }
  } catch {
    return url;
  }

  return url;
}
