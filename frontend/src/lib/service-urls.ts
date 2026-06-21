const DEFAULT_LOCAL_API = 'http://localhost:4000/api/v1';

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** Resolve API base URL at runtime (fixes production builds that still embed localhost). */
export function getApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');

  if (typeof window === 'undefined') {
    return configured || DEFAULT_LOCAL_API;
  }

  const { hostname, origin } = window.location;

  if (!isLocalHost(hostname)) {
    if (!configured || configured.includes('localhost') || configured.includes('127.0.0.1')) {
      return `${origin}/api/v1`;
    }
    return configured;
  }

  return configured || DEFAULT_LOCAL_API;
}

/** Socket.IO namespace URL. */
export function getSocketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (configured) {
    const normalized = configured.replace(/\/$/, '');
    return normalized.endsWith('/chat') ? normalized : `${normalized}/chat`;
  }

  return `${getApiUrl().replace(/\/api\/v1\/?$/, '')}/chat`;
}

export function getServerReachabilityHint(): string {
  if (typeof window === 'undefined') {
    return 'Cannot reach the server.';
  }
  const { hostname } = window.location;
  if (isLocalHost(hostname)) {
    return 'Cannot reach the server. Start the backend with: cd backend && npm run start:dev';
  }
  return `Cannot reach the server at ${getApiUrl()}. Check that linkchat-api is running and nginx proxies /api/ to port 4000.`;
}
