/** Rewrite localhost media URLs from dev uploads to the deployed API origin. */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const origin = new URL(apiBase).origin;
      return `${origin}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return url;
  }
  return url;
}
