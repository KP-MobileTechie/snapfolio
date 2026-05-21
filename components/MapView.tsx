'use client';

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { thumbUrl } from '@/lib/cloudinary';
import { hasLocation, type Photo } from '@/lib/photo';

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  // Key on the point VALUES, not the array reference — re-fitting on every parent
  // re-render would snap the map back while the user is panning.
  const pointsKey = points.map(([lat, lng]) => `${lat},${lng}`).join(';');
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 10 });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- pointsKey is the value identity of points
  }, [map, pointsKey]);
  return null;
}

interface Props {
  photos: Photo[];
  onOpen: (index: number) => void;
}

export default function MapView({ photos, onOpen }: Props) {
  const located = photos
    .map((photo, index) => ({ photo, index }))
    .filter(({ photo }) => hasLocation(photo));

  if (located.length === 0) {
    return (
      <p className="py-24 text-center text-sm text-[var(--fg-dim)]">
        No photos with location data yet.
      </p>
    );
  }

  const points = located.map(({ photo }) => [photo.lat!, photo.lng!] as [number, number]);

  return (
    <div className="h-[70dvh] overflow-hidden rounded-xl">
      <MapContainer center={points[0]} zoom={3} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {located.map(({ photo, index }) => (
          <CircleMarker
            key={photo.publicId}
            center={[photo.lat!, photo.lng!]}
            radius={8}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#60a5fa', fillOpacity: 0.9 }}
          >
            <Popup>
              <button onClick={() => onOpen(index)} className="block w-40 text-left">
                {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumb in Leaflet popup */}
                <img src={thumbUrl(photo.publicId)} alt={photo.title ?? ''} className="w-40 rounded" />
                {photo.title && <span className="mt-1 block text-xs">{photo.title}</span>}
              </button>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
