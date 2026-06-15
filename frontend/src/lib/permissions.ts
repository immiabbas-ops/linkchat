export function isSecureBrowserContext() {
  return typeof window !== 'undefined' && window.isSecureContext;
}

export function httpsRequiredMessage(feature: 'camera' | 'location' | 'microphone') {
  const labels = {
    camera: 'Camera',
    location: 'Location',
    microphone: 'Microphone',
  };
  return `${labels[feature]} requires a secure connection (HTTPS). Open LinkChat over https:// or use localhost for development.`;
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
