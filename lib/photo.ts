export interface Photo {
  publicId: string;
  width: number;
  height: number;
  title?: string;
  lat?: number;
  lng?: number;
  takenAt?: string; // ISO 8601
  source: 'curated' | 'session';
}

export function hasLocation(p: Photo): p is Photo & { lat: number; lng: number } {
  return typeof p.lat === 'number' && typeof p.lng === 'number';
}
