'use client';

import { useEffect, useRef, useState } from 'react';
import { geolocationErrorMessage, isSecureBrowserContext } from '@/lib/permissions';

export interface LiveCoords {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
}

/** Real-time GPS with watchPosition — updates as the user moves. */
export function useLiveGeolocation(enabled = true) {
  const [coords, setCoords] = useState<LiveCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Location is not supported on this device.');
      setLoading(false);
      return;
    }

    if (!isSecureBrowserContext()) {
      setError(geolocationErrorMessage(0, false));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        });
        setLoading(false);
      },
      (err) => {
        setError(geolocationErrorMessage(err.code));
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [enabled]);

  const refresh = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLoading(false);
        setError(null);
      },
      () => setLoading(false),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return { coords, error, loading, refresh };
}
