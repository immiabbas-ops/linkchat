const URL_REGEX = /https?:\/\/[^\s<]+[^\s<.,;:!?'")\]}]/gi;

export function extractUrls(text?: string | null): string[] {
  if (!text) return [];
  return Array.from(new Set(text.match(URL_REGEX) || []));
}

export function linkPreviewLabel(url: string): { host: string; path: string } {
  try {
    const u = new URL(url);
    return { host: u.hostname.replace(/^www\./, ''), path: u.pathname === '/' ? '' : u.pathname };
  } catch {
    return { host: url, path: '' };
  }
}
