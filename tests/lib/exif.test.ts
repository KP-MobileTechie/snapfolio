import { describe, it, expect, vi } from 'vitest';

const parseMock = vi.fn();
vi.mock('exifr', () => ({ default: { parse: (...a: unknown[]) => parseMock(...a) } }));

import { extractExif } from '@/lib/exif';

// No beforeEach reset: every test installs its own implementation, and vitest 4's
// mockReset/mockClear leave the spy in a state where a later rejected implementation
// is reported as an unhandled error even though the caller awaits and catches it.

describe('extractExif', () => {
  it('maps decimal GPS and capture date', async () => {
    parseMock.mockResolvedValue({
      latitude: 46.56,
      longitude: 8.56,
      DateTimeOriginal: new Date('2025-09-14T06:31:00Z'),
    });
    const result = await extractExif(new Blob());
    expect(result).toEqual({ lat: 46.56, lng: 8.56, takenAt: '2025-09-14T06:31:00.000Z' });
  });

  it('returns coords without takenAt when date missing', async () => {
    parseMock.mockResolvedValue({ latitude: 1, longitude: 2 });
    expect(await extractExif(new Blob())).toEqual({ lat: 1, lng: 2 });
  });

  it('returns null when GPS missing', async () => {
    parseMock.mockResolvedValue({ Make: 'Canon' });
    expect(await extractExif(new Blob())).toBeNull();
  });

  it('returns null when exifr returns undefined', async () => {
    parseMock.mockResolvedValue(undefined);
    expect(await extractExif(new Blob())).toBeNull();
  });

  it('returns null when exifr throws (corrupt file)', async () => {
    parseMock.mockImplementation(() => Promise.reject(new Error('bad jpeg')));
    expect(await extractExif(new Blob())).toBeNull();
  });
});
