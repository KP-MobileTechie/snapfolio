import { describe, it, expect, vi } from 'vitest';
import { parseManifest } from '@/lib/manifest';

const valid = {
  publicId: 'curated/alps',
  width: 1600,
  height: 1067,
  title: 'Alps at dawn',
  lat: 46.56,
  lng: 8.56,
  takenAt: '2025-09-14T06:31:00Z',
};

describe('parseManifest', () => {
  it('parses valid entries and stamps source=curated', () => {
    const photos = parseManifest([valid]);
    expect(photos).toHaveLength(1);
    expect(photos[0]).toMatchObject({ ...valid, source: 'curated' });
  });

  it('accepts entries without optional fields', () => {
    const photos = parseManifest([{ publicId: 'p', width: 10, height: 20 }]);
    expect(photos[0]).toEqual({ publicId: 'p', width: 10, height: 20, source: 'curated' });
  });

  it('skips invalid entries but keeps the rest, warning per skip', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const photos = parseManifest([
      { width: 10, height: 10 },
      valid,
      { publicId: 'x', width: -5, height: 10 },
      { publicId: 'y', width: 10, height: 10, lat: 12 },
      'not-an-object',
    ]);
    expect(photos).toHaveLength(1);
    expect(photos[0].publicId).toBe('curated/alps');
    expect(warn).toHaveBeenCalledTimes(4);
    warn.mockRestore();
  });

  it('returns [] for non-array input', () => {
    expect(parseManifest(null)).toEqual([]);
    expect(parseManifest({})).toEqual([]);
  });
});
