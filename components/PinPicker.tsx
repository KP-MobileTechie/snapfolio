'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#60a5fa;border:2px solid white"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface Props {
  fileName: string;
  onConfirm: (coords: { lat: number; lng: number } | null) => void;
}

export default function PinPicker({ fileName, onConfirm }: Props) {
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Set location for ${fileName}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-[var(--surface)] p-4">
        <p className="mb-2 text-sm">
          <span className="font-medium">{fileName}</span> has no GPS data — click the map to
          place it, or skip (photo stays off the map).
        </p>
        <div className="h-64 overflow-hidden rounded-lg">
          <MapContainer center={[20, 0]} zoom={2} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickCatcher onPick={(lat, lng) => setPin({ lat, lng })} />
            {pin && <Marker position={[pin.lat, pin.lng]} icon={pinIcon} />}
          </MapContainer>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => onConfirm(null)}
            className="rounded-full px-4 py-1.5 text-sm text-[var(--fg-dim)] hover:text-[var(--fg)]"
          >
            Skip
          </button>
          <button
            onClick={() => pin && onConfirm(pin)}
            disabled={!pin}
            className="rounded-full bg-[var(--fg)] px-4 py-1.5 text-sm text-[var(--bg)] disabled:opacity-40"
          >
            Use this location
          </button>
        </div>
      </div>
    </div>
  );
}
