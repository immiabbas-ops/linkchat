'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDownUp,
  Car,
  Clock,
  History,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistance } from '@/lib/places';
import { useLiveGeolocation } from '@/hooks/useLiveGeolocation';
import {
  estimateFare,
  fetchRoute,
  formatDuration,
  reverseGeocode,
  RIDE_TYPES,
  searchPlaces,
  type GeoPoint,
  type PlaceSuggestion,
  type RideType,
  type RouteInfo,
} from '@/lib/taxi-osm';
import { cn } from '@/lib/utils';

const TaxiMap = dynamic(() => import('./TaxiMap').then((m) => m.TaxiMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--search-bg)] text-sm text-[var(--text-secondary)]">
      Loading map…
    </div>
  ),
});

interface TaxiBooking {
  id: string;
  pickup: string;
  dropoff: string;
  status: string;
  fare?: number | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export function TaxiPanel() {
  const { coords: live, error: geoError, loading: geoLoading, refresh: refreshGeo } = useLiveGeolocation();

  const [pickup, setPickup] = useState<GeoPoint | null>(null);
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null);
  const [pickupQuery, setPickupQuery] = useState('');
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceSuggestion[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<PlaceSuggestion[]>([]);
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>(null);
  const [rideType, setRideType] = useState<RideType>('economy');
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<TaxiBooking[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const loadHistory = useCallback(async () => {
    try {
      const items = await api.get<TaxiBooking[]>('/services/taxi');
      setHistory(items);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Set pickup from live location once
  useEffect(() => {
    if (!live || pickup) return;
    void reverseGeocode(live.lat, live.lng).then((label) => {
      setPickup({ lat: live.lat, lng: live.lng, label });
      setPickupQuery(label.split(',').slice(0, 2).join(',').trim());
    });
  }, [live, pickup]);

  // Route when both points set
  useEffect(() => {
    if (!pickup || !dropoff) {
      setRoute(null);
      return;
    }
    setRouteLoading(true);
    void fetchRoute(pickup, dropoff)
      .then(setRoute)
      .finally(() => setRouteLoading(false));
  }, [pickup, dropoff]);

  const runSearch = (field: 'pickup' | 'dropoff', q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) {
      if (field === 'pickup') setPickupSuggestions([]);
      else setDropoffSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      void searchPlaces(q, live ? { lat: live.lat, lng: live.lng, label: '' } : pickup || undefined).then(
        (results) => {
          if (field === 'pickup') setPickupSuggestions(results);
          else setDropoffSuggestions(results);
        },
      );
    }, 350);
  };

  const selectSuggestion = (field: 'pickup' | 'dropoff', s: PlaceSuggestion) => {
    const point = { lat: s.lat, lng: s.lng, label: s.label };
    if (field === 'pickup') {
      setPickup(point);
      setPickupQuery(s.label.split(',').slice(0, 2).join(',').trim());
      setPickupSuggestions([]);
    } else {
      setDropoff(point);
      setDropoffQuery(s.label.split(',').slice(0, 2).join(',').trim());
      setDropoffSuggestions([]);
    }
    setActiveField(null);
  };

  const useMyLocation = async () => {
    if (!live) {
      refreshGeo();
      return;
    }
    const label = await reverseGeocode(live.lat, live.lng);
    setPickup({ lat: live.lat, lng: live.lng, label });
    setPickupQuery(label.split(',').slice(0, 2).join(',').trim());
    setPickupSuggestions([]);
  };

  const swapLocations = () => {
    const p = pickup;
    const d = dropoff;
    const pq = pickupQuery;
    const dq = dropoffQuery;
    setPickup(d);
    setDropoff(p);
    setPickupQuery(dq);
    setDropoffQuery(pq);
  };

  const estimatedFare = route ? estimateFare(route.distanceMeters, rideType) : null;

  const submit = async () => {
    if (!pickup || !dropoff) {
      setError('Set pickup and drop-off on the map or search.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/services/taxi', {
        pickup: pickup.label,
        dropoff: dropoff.label,
        fare: estimatedFare ?? undefined,
        metadata: {
          rideType,
          pickupCoords: { lat: pickup.lat, lng: pickup.lng },
          dropoffCoords: { lat: dropoff.lat, lng: dropoff.lng },
          distanceMeters: route?.distanceMeters,
          durationSeconds: route?.durationSeconds,
        },
      });
      setSuccess(true);
      setDropoff(null);
      setDropoffQuery('');
      setRoute(null);
      void loadHistory();
      setTimeout(() => setSuccess(false), 5000);
    } catch {
      setError('Could not submit ride request. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const suggestions = activeField === 'pickup' ? pickupSuggestions : activeField === 'dropoff' ? dropoffSuggestions : [];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--list-bg)]">
      {/* Map */}
      <div className="relative min-h-[38vh] flex-1 shrink-0">
        <TaxiMap liveLocation={live} pickup={pickup} dropoff={dropoff} route={route} />

        <button
          type="button"
          onClick={refreshGeo}
          className="absolute right-3 top-3 z-[400] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/10"
          aria-label="Refresh location"
        >
          <LocateFixed className={cn('h-5 w-5 text-[var(--accent-dark)]', geoLoading && 'animate-pulse')} />
        </button>

        {geoError && (
          <div className="absolute left-3 right-14 top-3 z-[400] rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow ring-1 ring-amber-200">
            {geoError}
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      <div className="relative z-[500] max-h-[58vh] shrink-0 overflow-y-auto rounded-t-2xl bg-[var(--list-bg)] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] scrollbar-hide">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-black/15" />

        <div className="space-y-3 p-4 pb-6 safe-bottom">
          {success && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800">
              Ride requested. A driver will be assigned shortly.
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Location inputs */}
          <div className="rounded-2xl border border-[var(--border-glass)] bg-[var(--input-bg)] p-3 shadow-sm">
            <div className="flex gap-2">
              <div className="flex flex-col items-center py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                <span className="my-1 w-0.5 flex-1 bg-[var(--border-glass)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 ring-4 ring-red-500/20" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="relative">
                  <input
                    value={pickupQuery}
                    onChange={(e) => {
                      setPickupQuery(e.target.value);
                      setActiveField('pickup');
                      runSearch('pickup', e.target.value);
                    }}
                    onFocus={() => setActiveField('pickup')}
                    placeholder="Pickup location"
                    className="w-full rounded-xl bg-[var(--list-bg)] px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  />
                  <button
                    type="button"
                    onClick={() => void useMyLocation()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--accent-dark)] hover:bg-black/[0.04]"
                    title="Use my location"
                  >
                    <Navigation className="h-4 w-4" />
                  </button>
                </div>
                <input
                  value={dropoffQuery}
                  onChange={(e) => {
                    setDropoffQuery(e.target.value);
                    setActiveField('dropoff');
                    runSearch('dropoff', e.target.value);
                  }}
                  onFocus={() => setActiveField('dropoff')}
                  placeholder="Where to?"
                  className="w-full rounded-xl bg-[var(--list-bg)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                />
              </div>
              <button
                type="button"
                onClick={swapLocations}
                className="self-center rounded-full p-2 text-[var(--text-secondary)] hover:bg-black/[0.05]"
                aria-label="Swap locations"
              >
                <ArrowDownUp className="h-4 w-4" />
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-[var(--border-glass)] bg-[var(--list-bg)]">
                {suggestions.map((s) => (
                  <button
                    key={s.placeId}
                    type="button"
                    onClick={() => selectSuggestion(activeField!, s)}
                    className="flex w-full items-start gap-2 border-b border-black/[0.04] px-3 py-2.5 text-left last:border-0 hover:bg-black/[0.03]"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-dark)]" />
                    <span className="line-clamp-2 text-xs text-[var(--text-primary)]">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Route summary */}
          {route && (
            <div className="flex items-center gap-4 rounded-2xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 text-sm">
              <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
                <Route className="h-4 w-4 text-[var(--accent-dark)]" />
                {formatDistance(route.distanceMeters)}
              </div>
              <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
                <Clock className="h-4 w-4 text-[var(--accent-dark)]" />
                {formatDuration(route.durationSeconds)}
              </div>
              {estimatedFare != null && (
                <div className="ml-auto font-semibold text-[var(--accent-dark)]">~AED {estimatedFare}</div>
              )}
            </div>
          )}
          {routeLoading && (
            <p className="text-center text-xs text-[var(--text-secondary)]">Calculating route…</p>
          )}

          {/* Ride type */}
          <div className="flex gap-2">
            {RIDE_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setRideType(type.id)}
                className={cn(
                  'flex flex-1 flex-col items-center rounded-xl border px-2 py-3 text-center transition',
                  rideType === type.id
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border-glass)] bg-[var(--input-bg)] hover:border-[var(--accent)]/40',
                )}
              >
                <Car className="mb-1 h-5 w-5 text-[var(--accent-dark)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">{type.label}</span>
                <span className="text-[10px] text-[var(--text-secondary)]">{type.desc}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || !pickup || !dropoff}
            className="w-full rounded-2xl bg-[var(--accent)] py-3.5 text-[16px] font-semibold text-white shadow-md disabled:opacity-50"
          >
            {submitting ? 'Requesting…' : estimatedFare != null ? `Request ride · ~AED ${estimatedFare}` : 'Request ride'}
          </button>

          {/* Recent rides */}
          {history.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--accent-dark)]"
              >
                <History className="h-4 w-4" />
                Recent rides ({history.length})
                <RefreshCw className={cn('h-3 w-3', showHistory && 'rotate-180')} />
              </button>
              {showHistory && (
                <div className="space-y-2">
                  {history.slice(0, 5).map((b) => (
                    <div
                      key={b.id}
                      className="rounded-xl border border-[var(--border-glass)] bg-[var(--input-bg)] px-3 py-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium capitalize text-amber-800">
                          {b.status}
                        </span>
                        {b.fare != null && <span className="font-semibold text-[var(--text-primary)]">AED {b.fare}</span>}
                      </div>
                      <p className="mt-1 truncate text-[var(--text-primary)]">{b.pickup}</p>
                      <p className="truncate text-[var(--text-secondary)]">→ {b.dropoff}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-center text-[10px] text-[var(--text-secondary)]">
            Map © OpenStreetMap · Routing via OSRM · Fare is estimated
          </p>
        </div>
      </div>
    </div>
  );
}
