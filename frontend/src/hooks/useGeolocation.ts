'use client';

import { useEffect, useState } from 'react';

export interface GeoCoords {
  lat: number;
  lng: number;
}

export function useGeolocation() {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Location is not supported on this device.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === 1
            ? 'Allow location access to see nearby places.'
            : 'Could not detect your location.',
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  useEffect(() => {
    refresh();
  }, []);

  return { coords, error, loading, refresh };
}
