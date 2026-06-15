'use client';

import { useEffect, useState } from 'react';
import { Home, MapPin, Phone, Navigation, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { formatDistance, mapsDirectionsUrl, mapsSearchUrl, telUrl } from '@/lib/places';
import { cn } from '@/lib/utils';

interface EstateOffice {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  distanceMeters: number;
}

export function RealEstatePanel() {
  const { coords, error: geoError, loading: geoLoading, refresh: refreshGeo } = useGeolocation();
  const [offices, setOffices] = useState<EstateOffice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coords) return;

    setLoading(true);
    setError(null);
    api
      .get<EstateOffice[]>(
        `/services/realestate/nearby?lat=${coords.lat}&lng=${coords.lng}&radius=8000`,
      )
      .then(setOffices)
      .catch(() => setError('Could not load nearby real estate offices.'))
      .finally(() => setLoading(false));
  }, [coords]);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-[var(--border-glass)] bg-[var(--list-bg)]/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Estate agents near you
          </p>
          <button
            type="button"
            onClick={refreshGeo}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--search-bg)]"
            title="Refresh location"
          >
            <RefreshCw className={cn('h-4 w-4', geoLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {geoLoading || loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Finding agents near you…</p>
          </div>
        ) : geoError ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
            <p className="text-sm text-amber-200">{geoError}</p>
            <button
              onClick={refreshGeo}
              className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
            >
              Enable Location
            </button>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        ) : offices.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Home className="h-12 w-12 text-[var(--text-secondary)] opacity-40" />
            <p className="mt-3 text-[var(--text-secondary)]">No estate agents found nearby.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {offices.map((office) => (
              <article
                key={office.id}
                className="rounded-2xl border border-[var(--border-glass)] bg-gradient-to-br from-emerald-500/5 to-teal-500/5 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-tight">{office.name}</h3>
                    <span className="mt-1 inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                      Estate Agent
                    </span>
                  </div>
                  <span className="shrink-0 rounded-lg bg-emerald-600/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                    {formatDistance(office.distanceMeters)}
                  </span>
                </div>

                {office.address && (
                  <p className="mt-2 flex items-start gap-1.5 text-sm text-[var(--text-secondary)]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {office.address}
                  </p>
                )}

                {office.openingHours && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Hours: {office.openingHours}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {office.phone && (
                    <a
                      href={telUrl(office.phone)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Call Agent
                    </a>
                  )}
                  <a
                    href={mapsDirectionsUrl(office.lat, office.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-medium text-white"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Get Directions
                  </a>
                  {office.website && (
                    <a
                      href={office.website.startsWith('http') ? office.website : `https://${office.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-glass)] px-3 py-2 text-xs font-medium"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Website
                    </a>
                  )}
                  <a
                    href={mapsSearchUrl(office.lat, office.lng, office.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-glass)] px-3 py-2 text-xs font-medium"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    View on Map
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
