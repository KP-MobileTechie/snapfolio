import { describe, it, expect, beforeEach } from 'vitest';
import { loadSession, addUpload, SESSION_KEY } from '@/lib/session';
import type { Photo } from '@/lib/photo';

const photo: Photo = { publicId: 'sandbox/x', width: 100, height: 50, source: 'session' };

beforeEach(() => localStorage.clear());

describe('loadSession', () => {
  it('returns [] when empty', () => {
    expect(loadSession()).toEqual([]);
  });

  it('returns [] for corrupt JSON', () => {
    localStorage.setItem(SESSION_KEY, '{nope');
    expect(loadSession()).toEqual([]);
  });

  it('returns [] for unknown version', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ version: 9, uploads: [photo] }));
    expect(loadSession()).toEqual([]);
  });

  it('round-trips uploads added via addUpload', () => {
    addUpload(photo);
    addUpload({ ...photo, publicId: 'sandbox/y' });
    expect(loadSession().map((p) => p.publicId)).toEqual(['sandbox/x', 'sandbox/y']);
  });

  it('drops malformed stored entries', () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ version: 1, uploads: [photo, { bad: true }] }),
    );
    expect(loadSession()).toHaveLength(1);
  });

  it('ignores duplicate publicIds', () => {
    addUpload(photo);
    addUpload(photo);
    expect(loadSession()).toHaveLength(1);
  });
});
