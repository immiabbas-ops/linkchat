export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

export interface RouteInfo {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
}

export interface PlaceSuggestion {
  lat: number;
  lng: number;
  label: string;
  placeId: string;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';

/** Search addresses via OpenStreetMap Nominatim (debounce on caller). */
export async function searchPlaces(query: string, near?: GeoPoint): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    q,
    format: 'json',
    addressdetails: '1',
    limit: '6',
  });
  if (near) {
    params.set('viewbox', `${near.lng - 0.15},${near.lat + 0.15},${near.lng + 0.15},${near.lat - 0.15}`);
    params.set('bounded', '1');
  }

  const res = await fetch(`${NOMINATIM}/search?${params}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'LinkChat/1.0' },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string; place_id: number }>;
  return data.map((item) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    label: item.display_name,
    placeId: String(item.place_id),
  }));
}

/** Reverse geocode coordinates to a readable address. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
  });
  const res = await fetch(`${NOMINATIM}/reverse?${params}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'LinkChat/1.0' },
  });
  if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const data = (await res.json()) as { display_name?: string };
  return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** Get driving route via OSRM (OpenStreetMap routing). */
export async function fetchRoute(pickup: GeoPoint, dropoff: GeoPoint): Promise<RouteInfo | null> {
  const url = `${OSRM}/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    routes?: Array<{
      distance: number;
      duration: number;
      geometry: { coordinates: [number, number][] };
    }>;
  };
  const route = data.routes?.[0];
  if (!route) return null;

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export type RideType = 'economy' | 'comfort' | 'xl';

export const RIDE_TYPES: { id: RideType; label: string; desc: string; multiplier: number }[] = [
  { id: 'economy', label: 'Economy', desc: 'Standard ride', multiplier: 1 },
  { id: 'comfort', label: 'Comfort', desc: 'Premium car', multiplier: 1.35 },
  { id: 'xl', label: 'XL', desc: 'Up to 6 seats', multiplier: 1.55 },
];

/** Simple fare estimate (AED-style base + per km). */
export function estimateFare(distanceMeters: number, rideType: RideType): number {
  const km = distanceMeters / 1000;
  const type = RIDE_TYPES.find((r) => r.id === rideType)!;
  const base = 8;
  const perKm = 2.2;
  const raw = base + km * perKm;
  return Math.round(raw * type.multiplier * 100) / 100;
}
