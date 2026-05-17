import exifr from 'exifr';

export interface ExifLocation {
  lat: number;
  lng: number;
  takenAt?: string;
}

/**
 * Extract GPS (decimal degrees, courtesy of exifr) and capture time.
 * Returns null when there is no usable GPS — caller falls back to PinPicker.
 */
export async function extractExif(file: Blob | ArrayBuffer): Promise<ExifLocation | null> {
  try {
    const data = (await exifr.parse(file, { gps: true, pick: ['DateTimeOriginal'] })) as
      | Record<string, unknown>
      | undefined;
    if (
      typeof data?.latitude === 'number' && Number.isFinite(data.latitude) &&
      typeof data?.longitude === 'number' && Number.isFinite(data.longitude)
    ) {
      const takenAt =
        data.DateTimeOriginal instanceof Date ? data.DateTimeOriginal.toISOString() : undefined;
      return takenAt !== undefined
        ? { lat: data.latitude, lng: data.longitude, takenAt }
        : { lat: data.latitude, lng: data.longitude };
    }
    return null;
  } catch {
    return null;
  }
}
