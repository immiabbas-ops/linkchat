export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function mapsSearchUrl(lat: number, lng: number, name?: string): string {
  const query = name ? encodeURIComponent(`${name}@${lat},${lng}`) : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
