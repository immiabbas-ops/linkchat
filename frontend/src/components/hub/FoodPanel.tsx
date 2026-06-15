'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Star,
  Clock,
  RefreshCw,
  AlertCircle,
  LocateFixed,
  UtensilsCrossed,
  Search,
  ChevronRight,
  Truck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { httpsRequiredMessage, isSecureBrowserContext } from '@/lib/permissions';
import { formatDistance } from '@/lib/places';
import {
  enrichPlace,
  formatDeliveryTime,
  getPlaceRating,
  getDeliveryMinutes,
  getCuisineTags,
} from '@/lib/food-data';
import { PlaceCoverBanner } from '@/components/hub/PlaceCoverBanner';
import { RestaurantDetail } from '@/components/hub/RestaurantDetail';
import type { NearbyPlace, PlaceDetails } from '@/types/food';
import { cn } from '@/lib/utils';

const filters = [
  { id: 'all', label: 'All', emoji: '🍽️' },
  { id: 'restaurant', label: 'Restaurants', emoji: '🍽️' },
  { id: 'fast_food', label: 'Fast Food', emoji: '🍔' },
  { id: 'cafe', label: 'Cafés', emoji: '☕' },
];

function RestaurantCard({
  place,
  onClick,
}: {
  place: NearbyPlace;
  onClick: () => void;
}) {
  const { rating, reviewCount } = getPlaceRating(place);
  const deliveryMin = getDeliveryMinutes(place.distanceMeters);
  const cuisine = getCuisineTags(place);

  return (
    <button
      onClick={onClick}
      className="group w-full overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-secondary)] text-left shadow-sm transition hover:border-[var(--accent)]/30 hover:shadow-md"
    >
      <PlaceCoverBanner
        place={place}
        className="h-36"
        distanceLabel={formatDistance(place.distanceMeters)}
      />

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-dark)]">
            {place.name}
          </h3>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-secondary)] transition group-hover:text-[var(--accent-dark)]" />
        </div>

        <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-secondary)]">
          {cuisine.join(' · ')}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-[var(--text-primary)]">{rating}</span>
            <span className="text-xs text-[var(--text-secondary)]">({reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            <Clock className="h-3 w-3 text-[var(--accent-dark)]" />
            {formatDeliveryTime(deliveryMin)}
          </div>
          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            <Truck className="h-3 w-3 text-[var(--accent-dark)]" />
            Free delivery
          </div>
        </div>

        {place.address && (
          <p className="mt-2 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{place.address}</span>
          </p>
        )}
      </div>
    </button>
  );
}

export function FoodPanel() {
  const { coords, error: geoError, loading: geoLoading, refresh: refreshGeo } = useGeolocation();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlaces = useCallback(async () => {
    if (!coords) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.get<NearbyPlace[]>(
        `/services/food/nearby?lat=${coords.lat}&lng=${coords.lng}&radius=5000&filter=${filter}`,
      );
      setPlaces(data);
    } catch (err) {
      const message =
        err instanceof Error && err.message !== 'Request failed'
          ? err.message
          : 'Could not load nearby restaurants. Check your connection and try again.';
      setError(message);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [coords, filter]);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const filteredPlaces = useMemo(() => {
    if (!search.trim()) return places;
    const q = search.toLowerCase();
    return places.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q) ||
        getCuisineTags(p).some((c) => c.toLowerCase().includes(q)),
    );
  }, [places, search]);

  const handleRefresh = () => {
    refreshGeo();
    if (coords) loadPlaces();
  };

  const handleSelectPlace = (place: NearbyPlace) => {
    setSelectedPlace(enrichPlace(place));
  };

  if (selectedPlace) {
    return (
      <RestaurantDetail place={selectedPlace} onBack={() => setSelectedPlace(null)} />
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header — Talabat-inspired orange accent */}
      <div className="sticky top-0 z-10 border-b border-[var(--border-glass)] bg-[var(--list-bg)]/95 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          {!loading && !error && places.length > 0 && (
            <p className="text-[13px] text-[var(--text-secondary)]">
              {filteredPlaces.length} place{filteredPlaces.length === 1 ? '' : 's'} nearby
            </p>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={geoLoading || loading}
            className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-glass)] bg-[var(--search-bg)] transition hover:bg-black/[0.04] disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4 text-[var(--text-secondary)]', (geoLoading || loading) && 'animate-spin')} />
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search restaurants, cafés, cuisine…"
              className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors',
                filter === f.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border-glass)] bg-[var(--search-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              )}
            >
              <span>{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {geoLoading || loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            <p className="mt-4 text-sm font-medium text-[var(--text-primary)]">
              Finding restaurants near you…
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Searching within 5 km</p>
          </div>
        ) : geoError ? (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-6 text-center">
            <LocateFixed className="mx-auto h-10 w-10 text-amber-500" />
            <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{geoError}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {isSecureBrowserContext()
                ? 'Location is required to show nearby dining options.'
                : 'Browsers block GPS on http:// IP addresses. Use HTTPS (domain + SSL) for location, camera, and microphone.'}
            </p>
            {isSecureBrowserContext() && (
              <button
                type="button"
                onClick={refreshGeo}
                className="mt-4 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Enable Location
              </button>
            )}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200/30 bg-red-500/10 p-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
            <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{error}</p>
            <button
              onClick={loadPlaces}
              className="mt-4 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Try Again
            </button>
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-secondary)] py-16 text-center">
            <UtensilsCrossed className="h-12 w-12 text-[var(--text-secondary)] opacity-50" />
            <p className="mt-4 font-medium text-[var(--text-primary)]">
              {search ? 'No matches found' : 'No places found nearby'}
            </p>
            <p className="mt-1 max-w-xs text-sm text-[var(--text-secondary)]">
              {search ? 'Try a different search term.' : 'Try a different filter or refresh your location.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredPlaces.map((place) => (
              <RestaurantCard
                key={place.id}
                place={place}
                onClick={() => handleSelectPlace(place)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
