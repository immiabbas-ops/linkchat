'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint, RouteInfo } from '@/lib/taxi-osm';

// Fix default marker icons in Next.js/webpack
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({
  pickup,
  dropoff,
  live,
  route,
}: {
  pickup?: GeoPoint | null;
  dropoff?: GeoPoint | null;
  live?: { lat: number; lng: number } | null;
  route?: RouteInfo | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];
    if (live) points.push([live.lat, live.lng]);
    if (pickup) points.push([pickup.lat, pickup.lng]);
    if (dropoff) points.push([dropoff.lat, dropoff.lng]);
    if (route?.coordinates.length) {
      route.coordinates.forEach(([lat, lng]) => points.push([lat, lng]));
    }

    if (points.length === 0) {
      map.setView([25.2048, 55.2708], 12);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16 });
  }, [map, pickup, dropoff, live, route]);

  return null;
}

interface TaxiMapProps {
  liveLocation?: { lat: number; lng: number; accuracy?: number } | null;
  pickup?: GeoPoint | null;
  dropoff?: GeoPoint | null;
  route?: RouteInfo | null;
}

export function TaxiMap({ liveLocation, pickup, dropoff, route }: TaxiMapProps) {
  const center = useMemo(() => {
    if (liveLocation) return [liveLocation.lat, liveLocation.lng] as [number, number];
    if (pickup) return [pickup.lat, pickup.lng] as [number, number];
    return [25.2048, 55.2708] as [number, number];
  }, [liveLocation, pickup]);

  return (
    <MapContainer
      center={center}
      zoom={14}
      className="h-full w-full z-0"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds pickup={pickup} dropoff={dropoff} live={liveLocation} route={route} />

      {liveLocation && (
        <>
          {liveLocation.accuracy != null && liveLocation.accuracy < 200 && (
            <Circle
              center={[liveLocation.lat, liveLocation.lng]}
              radius={liveLocation.accuracy}
              pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.12, weight: 1 }}
            />
          )}
          <Circle
            center={[liveLocation.lat, liveLocation.lng]}
            radius={12}
            pathOptions={{ color: '#4338ca', fillColor: '#6366f1', fillOpacity: 1, weight: 3 }}
          />
        </>
      )}

      {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
      {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon} />}

      {route && route.coordinates.length > 1 && (
        <Polyline
          positions={route.coordinates}
          pathOptions={{ color: '#6366f1', weight: 5, opacity: 0.85 }}
        />
      )}
    </MapContainer>
  );
}
