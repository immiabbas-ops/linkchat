const PRODUCTION_HOST = 'link-chats.com';

export function isSecureBrowserContext() {
  return typeof window !== 'undefined' && window.isSecureContext;
}

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isIpHost(hostname: string) {
  return /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
}

/** URL users should open for camera, mic, and GPS (HTTPS or localhost only). */
export function getRecommendedSecureUrl() {
  let configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (configured) {
    if (!configured.startsWith('http')) configured = `https://${configured}`;
    if (!configured.includes('localhost')) {
      configured = configured.replace(/^http:\/\//, 'https://');
      try {
        const parsed = new URL(configured);
        if (isIpHost(parsed.hostname)) parsed.hostname = PRODUCTION_HOST;
        return `${parsed.origin}${parsed.pathname}${parsed.search}`;
      } catch {
        return `https://${PRODUCTION_HOST}`;
      }
    }
    return configured;
  }

  if (typeof window === 'undefined') return `https://${PRODUCTION_HOST}`;

  const { hostname, pathname, search, port, protocol } = window.location;
  if (isLocalHost(hostname)) {
    return `${protocol}//${hostname}${port ? `:${port}` : ''}${pathname}${search}`;
  }

  const host = isIpHost(hostname) ? PRODUCTION_HOST : hostname;
  return `https://${host}${pathname}${search}`;
}

function normalizeUrl(url: string) {
  try {
    const u = new URL(url);
    u.hash = '';
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.origin + u.pathname + u.search;
  } catch {
    return url.replace(/\/$/, '').split('#')[0];
  }
}

/** Send users off http:// or IP URLs so GPS, camera, and mic can work. */
export function redirectToSecureIfNeeded(): boolean {
  if (typeof window === 'undefined') return false;

  const { hostname, protocol } = window.location;
  if (isLocalHost(hostname)) return false;

  // Only redirect plain HTTP or IP — never bounce HTTPS pages (avoids infinite reload loops).
  const needsRedirect = protocol === 'http:' || isIpHost(hostname);
  if (!needsRedirect) return false;

  if (sessionStorage.getItem('linkchat_secure_redirect') === '1') return false;

  const target = normalizeUrl(getRecommendedSecureUrl());
  const current = normalizeUrl(window.location.href.split('#')[0]);
  if (current === target) return false;

  sessionStorage.setItem('linkchat_secure_redirect', '1');
  window.location.replace(target);
  return true;
}

export function httpsRequiredMessage(feature: 'camera' | 'location' | 'microphone') {
  const labels = {
    camera: 'Camera',
    location: 'Location',
    microphone: 'Microphone',
  };
  const secureUrl = getRecommendedSecureUrl();
  return `${labels[feature]} requires HTTPS. Tap below to open ${secureUrl}`;
}

export function geolocationErrorMessage(code: number, secure = isSecureBrowserContext()) {
  if (!secure) return httpsRequiredMessage('location');
  if (code === 1) return 'Allow location access in your browser to share or detect your position.';
  if (code === 2) return 'Location unavailable. Check that GPS/location services are enabled on your device.';
  if (code === 3) return 'Location request timed out. Try again.';
  return 'Could not detect your location.';
}

export function cameraErrorMessage(secure = isSecureBrowserContext()) {
  if (!secure) return httpsRequiredMessage('camera');
  return 'Camera access denied. Allow camera permission in your browser settings.';
}

export function microphoneErrorMessage(secure = isSecureBrowserContext()) {
  if (!secure) return httpsRequiredMessage('microphone');
  return 'Microphone access denied. Allow microphone permission to record voice messages.';
}

export function canUseGeolocation() {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}

export function canUseCamera() {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    isSecureBrowserContext()
  );
}

export function requestCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!canUseGeolocation()) {
      reject(new Error('Location is not supported on this device.'));
      return;
    }
    if (!isSecureBrowserContext()) {
      reject(new Error(httpsRequiredMessage('location')));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      reject(new Error(geolocationErrorMessage(err.code)));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
}
