import type { Photo } from './photo';

export const SESSION_KEY = 'snapfolio:v1';

interface SessionData {
  version: 1;
  uploads: Photo[];
}

function isPhoto(e: unknown): e is Photo {
  if (typeof e !== 'object' || e === null) return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o.publicId === 'string' &&
    typeof o.width === 'number' &&
    typeof o.height === 'number' &&
    o.source === 'session'
  );
}

export function isStorageAvailable(): boolean {
  try {
    const k = '__snapfolio_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function loadSession(): Photo[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionData;
    if (parsed?.version !== 1 || !Array.isArray(parsed.uploads)) return [];
    return parsed.uploads.filter(isPhoto);
  } catch {
    return [];
  }
}

export function addUpload(photo: Photo): void {
  try {
    const existing = loadSession();
    if (existing.some((p) => p.publicId === photo.publicId)) return;
    const uploads = [...existing, photo];
    localStorage.setItem(SESSION_KEY, JSON.stringify({ version: 1, uploads }));
  } catch {
    // storage unavailable — upload still lives in component state for this tab
  }
}
