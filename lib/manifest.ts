import type { Photo } from './photo';

function isValidEntry(e: unknown): e is Omit<Photo, 'source'> {
  if (typeof e !== 'object' || e === null) return false;
  const o = e as Record<string, unknown>;
  if (typeof o.publicId !== 'string' || o.publicId.length === 0) return false;
  if (typeof o.width !== 'number' || !Number.isFinite(o.width) || o.width <= 0) return false;
  if (typeof o.height !== 'number' || !Number.isFinite(o.height) || o.height <= 0) return false;
  if (o.title !== undefined && typeof o.title !== 'string') return false;
  const hasLat = typeof o.lat === 'number' && Number.isFinite(o.lat);
  const hasLng = typeof o.lng === 'number' && Number.isFinite(o.lng);
  if (hasLat !== hasLng) return false; // both or neither
  if (o.takenAt !== undefined && typeof o.takenAt !== 'string') return false;
  return true;
}

/** Validate raw manifest JSON. Invalid entries are skipped with a warning. */
export function parseManifest(raw: unknown): Photo[] {
  if (!Array.isArray(raw)) return [];
  const photos: Photo[] = [];
  for (const entry of raw) {
    if (isValidEntry(entry)) {
      photos.push({ ...entry, source: 'curated' });
    } else {
      console.warn('snapfolio: skipping invalid manifest entry', entry);
    }
  }
  return photos;
}
