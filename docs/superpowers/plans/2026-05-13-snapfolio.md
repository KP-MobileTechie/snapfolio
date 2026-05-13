# snapfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build snapfolio — a travel photo gallery with masonry grid + blur-up loading, keyboard lightbox, Leaflet map view by photo location, and direct-to-Cloudinary drag-drop uploads with EXIF GPS extraction — deployed on Vercel.

**Architecture:** Next.js App Router single-page app. Pure logic in `lib/` (Cloudinary URL builder, manifest validation, EXIF mapping, session storage) with Vitest coverage; components only render the merged `Photo[]`. `lib/session.ts` is the sole localStorage toucher. No backend: curated photos come from a static manifest; visitor uploads use an unsigned Cloudinary preset.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Framer Motion · exifr · Leaflet + react-leaflet · Vitest

**Spec:** `docs/superpowers/specs/2026-05-13-snapfolio-design.md`

---

## Commit rules (apply to EVERY commit step)

1. Author/committer: `krunal85 <kp587372@gmail.com>` (already in repo git config). **NEVER add `Co-Authored-By:` trailers or any Claude/AI attribution** — plain commit messages only. Verify before any push: `git log --format="%B" | Select-String "Co-Authored|Claude"` must return nothing.
2. Commits may ONLY carry these dates (vary HH:MM within a day):

| Task | Date env value (adjust HH:MM as listed per task) |
|---|---|
| 1 scaffold | 2026-05-13T14:00 |
| 2 cloudinary+manifest | 2026-05-17T11:10 |
| 3 exif+session | 2026-05-17T15:30 |
| 4 grid+card | 2026-05-19T12:40 |
| 5 lightbox+topbar+page | 2026-05-19T17:20 |
| 6 upload lib+zone+pinpicker | 2026-05-21T13:15 |
| 7 map view | 2026-05-21T18:00 |
| 8 polish+a11y | 2026-05-23T12:30 |
| 9 README/CI/deploy | 2026-05-23T16:45 (URL fix: 18:30) |

Before each commit:
```powershell
$env:GIT_AUTHOR_DATE = "2026-05-<DAY>T<HH:MM>:00+05:30"; $env:GIT_COMMITTER_DATE = $env:GIT_AUTHOR_DATE
```

---

## File Structure

```
app/layout.tsx             # Inter font, metadata, OG, near-black theme
app/page.tsx               # view state: grid ⇄ map · lightbox · upload panel
app/globals.css            # gallery-wall tokens
data/gallery.json          # curated manifest (Cloudinary demo cloud until owner setup)
lib/photo.ts               # shared Photo type                         (pure)
lib/cloudinary.ts          # buildUrl + blur/thumb/full variants       (pure)
lib/manifest.ts            # parseManifest: unknown → Photo[]          (pure)
lib/exif.ts                # exifr wrapper → {lat,lng,takenAt} | null
lib/session.ts             # localStorage session uploads (ONLY storage toucher)
lib/upload.ts              # unsigned XHR upload with progress
components/TopBar.tsx      # grid/map toggle, count, upload button
components/MasonryGrid.tsx # CSS columns + entrance animation
components/PhotoCard.tsx   # blur-up swap
components/Lightbox.tsx    # ←/→/Esc, focus trap
components/MapView.tsx     # react-leaflet markers + popups (client-only)
components/UploadZone.tsx  # drag-drop queue: exif → pin → upload
components/PinPicker.tsx   # mini map pin fallback
tests/lib/*.test.ts        # cloudinary, manifest, exif, session (~18 tests)
.github/workflows/ci.yml
```

---

### Task 1: Scaffold, theme, tooling (commit May 13 14:00)

**Files:**
- Create: Next.js scaffold, `vitest.config.ts`, `.env.local`; replace `app/globals.css`, `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Scaffold (move docs aside first, exactly like dropfour)**

```powershell
Move-Item D:\Projects\snapfolio\docs D:\Projects\snapfolio-docs-tmp
npx create-next-app@latest D:\Projects\snapfolio --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
Move-Item D:\Projects\snapfolio-docs-tmp D:\Projects\snapfolio\docs
```

If `AGENTS.md`/`CLAUDE.md` are not generated, create them matching D:\Projects\dropfour's (AGENTS.md = "This is NOT the Next.js you know" notice; CLAUDE.md = `@AGENTS.md`).

- [ ] **Step 2: Install dependencies**

```powershell
npm --prefix D:\Projects\snapfolio install framer-motion exifr leaflet react-leaflet
npm --prefix D:\Projects\snapfolio install -D vitest jsdom @vitejs/plugin-react @types/leaflet
```

- [ ] **Step 3: `vitest.config.ts`** (same as dropfour)

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

package.json scripts: `"test": "vitest run", "test:watch": "vitest"`.

- [ ] **Step 4: `.env.local`** (also note values for Vercel later)

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=demo
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

`demo` is Cloudinary's public demo cloud — the gallery renders real images before the owner's account exists. Empty preset = uploads disabled with a setup notice.

- [ ] **Step 5: Replace `app/globals.css`**

```css
@import "tailwindcss";

:root {
  --bg: #0c0c0e;
  --surface: #18181b;
  --fg: #f4f4f5;
  --fg-dim: #8b8b94;
  --accent: #e4e4e7;
  --focus: #60a5fa;
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-fg: var(--fg);
  --color-fg-dim: var(--fg-dim);
  --color-focus: var(--focus);
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}

body {
  min-height: 100dvh;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}

/* Full-page drag-over highlight */
.drag-active::after {
  content: 'Drop photos to upload';
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(12, 12, 14, 0.85);
  border: 2px dashed var(--fg-dim);
  font-size: 1.25rem;
  z-index: 60;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 6: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'snapfolio — a travel photo wall',
  description:
    'Masonry travel gallery with blur-up loading, a map of photo locations, and direct-to-Cloudinary uploads with EXIF GPS extraction.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Placeholder `app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <h1 className="text-2xl font-light tracking-wide">snapfolio</h1>
    </main>
  );
}
```

- [ ] **Step 8: Verify** `npm --prefix D:\Projects\snapfolio run build` → clean.

- [ ] **Step 9: Commit**

```powershell
$env:GIT_AUTHOR_DATE = "2026-05-13T14:00:00+05:30"; $env:GIT_COMMITTER_DATE = $env:GIT_AUTHOR_DATE
git -C D:\Projects\snapfolio add -A
git -C D:\Projects\snapfolio commit -m "chore: scaffold Next.js + Tailwind, gallery-wall theme"
```

(`.env.local` is gitignored by the scaffold — confirm with `git status`; the env names are documented in README later.)

---

### Task 2: `lib/photo.ts` + `lib/cloudinary.ts` + `lib/manifest.ts` (TDD, commit May 17 11:10)

**Files:**
- Create: `lib/photo.ts`, `lib/cloudinary.ts`, `lib/manifest.ts`, `data/gallery.json`
- Test: `tests/lib/cloudinary.test.ts`, `tests/lib/manifest.test.ts`

- [ ] **Step 1: `lib/photo.ts`** (types only — no test file needed)

```ts
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
```

- [ ] **Step 2: Failing tests — `tests/lib/cloudinary.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { buildUrl, blurUrl, thumbUrl, fullUrl, TRANSFORMS } from '@/lib/cloudinary';

describe('buildUrl', () => {
  it('assembles cloud, transform and publicId', () => {
    expect(buildUrl('mycloud', 'w_100', 'folder/pic')).toBe(
      'https://res.cloudinary.com/mycloud/image/upload/w_100/folder/pic',
    );
  });
});

describe('variants', () => {
  it('blur variant uses tiny blurred transform', () => {
    expect(blurUrl('pic', 'mycloud')).toBe(
      `https://res.cloudinary.com/mycloud/image/upload/${TRANSFORMS.blur}/pic`,
    );
    expect(TRANSFORMS.blur).toContain('w_24');
    expect(TRANSFORMS.blur).toContain('e_blur');
  });

  it('thumb and full variants use limit-fit autos', () => {
    expect(thumbUrl('pic', 'mycloud')).toContain('/w_600,c_limit,q_auto,f_auto/pic');
    expect(fullUrl('pic', 'mycloud')).toContain('/w_1600,c_limit,q_auto,f_auto/pic');
  });

  it('falls back to env cloud name when not passed', () => {
    // env stub: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is read at module load via process.env
    expect(thumbUrl('pic')).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/image\/upload\//);
  });
});
```

- [ ] **Step 3: Failing tests — `tests/lib/manifest.test.ts`**

```ts
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
      { width: 10, height: 10 },               // missing publicId
      valid,
      { publicId: 'x', width: -5, height: 10 }, // non-positive dimension
      { publicId: 'y', width: 10, height: 10, lat: 12 }, // lat without lng
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
```

- [ ] **Step 4: Run** `npm --prefix D:\Projects\snapfolio run test` → FAIL (modules unresolved).

- [ ] **Step 5: Implement `lib/cloudinary.ts`**

```ts
const ENV_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';

export const TRANSFORMS = {
  blur: 'w_24,e_blur:200,q_auto,f_auto',
  thumb: 'w_600,c_limit,q_auto,f_auto',
  full: 'w_1600,c_limit,q_auto,f_auto',
} as const;

export function buildUrl(cloudName: string, transform: string, publicId: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}`;
}

export const blurUrl = (publicId: string, cloud: string = ENV_CLOUD) =>
  buildUrl(cloud, TRANSFORMS.blur, publicId);
export const thumbUrl = (publicId: string, cloud: string = ENV_CLOUD) =>
  buildUrl(cloud, TRANSFORMS.thumb, publicId);
export const fullUrl = (publicId: string, cloud: string = ENV_CLOUD) =>
  buildUrl(cloud, TRANSFORMS.full, publicId);

export function isConfigured(): boolean {
  return ENV_CLOUD.length > 0;
}
```

Note: vitest loads `.env.local`? No — set the env in `vitest.config.ts` if the fallback test fails:
```ts
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'], env: { NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'demo' } },
```

- [ ] **Step 6: Implement `lib/manifest.ts`**

```ts
import type { Photo } from './photo';

function isValidEntry(e: unknown): e is Omit<Photo, 'source'> {
  if (typeof e !== 'object' || e === null) return false;
  const o = e as Record<string, unknown>;
  if (typeof o.publicId !== 'string' || o.publicId.length === 0) return false;
  if (typeof o.width !== 'number' || o.width <= 0) return false;
  if (typeof o.height !== 'number' || o.height <= 0) return false;
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
```

- [ ] **Step 7: Create `data/gallery.json`** — Cloudinary demo-cloud images with hand-set travel coords. Verify each publicId actually resolves before committing: `Invoke-WebRequest "https://res.cloudinary.com/demo/image/upload/w_24/<publicId>" -Method Head` → 200. Get true dimensions: `Invoke-WebRequest "https://res.cloudinary.com/demo/image/upload/fl_getinfo/<publicId>"` (JSON contains `output.width/height`). Use these entries (correct dimensions inline if getinfo differs):

```json
[
  { "publicId": "cld-sample", "width": 1870, "height": 1250, "title": "Mountain lake", "lat": 46.6, "lng": 8.0 },
  { "publicId": "cld-sample-2", "width": 1920, "height": 1441, "title": "Coastal cliffs", "lat": 38.7, "lng": -9.4 },
  { "publicId": "cld-sample-3", "width": 1920, "height": 1279, "title": "Desert dunes", "lat": 23.4, "lng": 11.5 },
  { "publicId": "cld-sample-4", "width": 1920, "height": 1280, "title": "Forest trail", "lat": 47.5, "lng": 8.7 },
  { "publicId": "cld-sample-5", "width": 1920, "height": 1280, "title": "City lights" },
  { "publicId": "sample", "width": 864, "height": 576, "title": "Honey bee", "lat": 50.1, "lng": 14.4 }
]
```

(One entry intentionally has no coords — exercises the grid-only path. Owner's real curated set replaces this file after Cloudinary setup; README documents how.)

- [ ] **Step 8: Run tests** → PASS. Run build → clean.

- [ ] **Step 9: Commit**

```powershell
$env:GIT_AUTHOR_DATE = "2026-05-17T11:10:00+05:30"; $env:GIT_COMMITTER_DATE = $env:GIT_AUTHOR_DATE
git -C D:\Projects\snapfolio add lib/photo.ts lib/cloudinary.ts lib/manifest.ts data/gallery.json tests/lib/cloudinary.test.ts tests/lib/manifest.test.ts vitest.config.ts
git -C D:\Projects\snapfolio commit -m "feat: photo model, Cloudinary URL builder and validated gallery manifest"
```

---

### Task 3: `lib/exif.ts` + `lib/session.ts` (TDD, commit May 17 15:30)

**Files:**
- Create: `lib/exif.ts`, `lib/session.ts`
- Test: `tests/lib/exif.test.ts`, `tests/lib/session.test.ts`

- [ ] **Step 1: Failing tests — `tests/lib/exif.test.ts`** (mock exifr; we test OUR mapping logic)

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const parseMock = vi.fn();
vi.mock('exifr', () => ({ default: { parse: (...a: unknown[]) => parseMock(...a) } }));

import { extractExif } from '@/lib/exif';

beforeEach(() => parseMock.mockReset());

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
    parseMock.mockRejectedValue(new Error('bad jpeg'));
    expect(await extractExif(new Blob())).toBeNull();
  });
});
```

- [ ] **Step 2: Failing tests — `tests/lib/session.test.ts`**

```ts
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
});
```

- [ ] **Step 3: Run** → FAIL (modules unresolved).

- [ ] **Step 4: Implement `lib/exif.ts`**

```ts
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
    const data = await exifr.parse(file, { gps: true, pick: ['DateTimeOriginal'] });
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
```

- [ ] **Step 5: Implement `lib/session.ts`**

```ts
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
    const uploads = [...loadSession(), photo];
    localStorage.setItem(SESSION_KEY, JSON.stringify({ version: 1, uploads }));
  } catch {
    // storage unavailable — upload still lives in component state for this tab
  }
}
```

- [ ] **Step 6: Run tests** → ALL pass (Task 2's + 10 new). Build clean.

- [ ] **Step 7: Commit**

```powershell
$env:GIT_AUTHOR_DATE = "2026-05-17T15:30:00+05:30"; $env:GIT_COMMITTER_DATE = $env:GIT_AUTHOR_DATE
git -C D:\Projects\snapfolio add lib/exif.ts lib/session.ts tests/lib/exif.test.ts tests/lib/session.test.ts
git -C D:\Projects\snapfolio commit -m "feat: EXIF GPS extraction and versioned session-upload storage"
```

---

### Task 4: MasonryGrid + PhotoCard with blur-up (commit May 19 12:40)

**Files:**
- Create: `components/PhotoCard.tsx`, `components/MasonryGrid.tsx`
- Modify: `app/page.tsx` (render the curated grid)

- [ ] **Step 1: `components/PhotoCard.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { blurUrl, thumbUrl } from '@/lib/cloudinary';
import type { Photo } from '@/lib/photo';

interface Props {
  photo: Photo;
  onClick: () => void;
}

export function PhotoCard({ photo, onClick }: Props) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label={photo.title ?? 'View photo'}
      className="group relative mb-4 block w-full overflow-hidden rounded-lg break-inside-avoid
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)]"
      style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
    >
      {/* Instant 24px blurred placeholder */}
      {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary handles sizing/format */}
      <img
        src={blurUrl(photo.publicId)}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary handles sizing/format */}
      <img
        src={thumbUrl(photo.publicId)}
        alt={photo.title ?? ''}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`relative h-full w-full object-cover transition-opacity duration-500
                    ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      {photo.title && (
        <span
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent
                     px-3 pb-2 pt-8 text-left text-sm text-white opacity-0 transition-opacity
                     group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {photo.title}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: `components/MasonryGrid.tsx`**

```tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { PhotoCard } from './PhotoCard';
import type { Photo } from '@/lib/photo';

interface Props {
  photos: Photo[];
  onOpen: (index: number) => void;
}

export function MasonryGrid({ photos, onOpen }: Props) {
  const reduced = useReducedMotion() ?? false;
  if (photos.length === 0) {
    return (
      <p className="py-24 text-center text-sm text-[var(--fg-dim)]">
        No photos yet — drop some here to begin.
      </p>
    );
  }
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
      {photos.map((photo, i) => (
        <motion.div
          key={photo.publicId}
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '50px' }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <PhotoCard photo={photo} onClick={() => onOpen(i)} />
        </motion.div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire `app/page.tsx`** (grid only at this stage)

```tsx
'use client';

import { useState } from 'react';
import galleryJson from '@/data/gallery.json';
import { parseManifest } from '@/lib/manifest';
import { MasonryGrid } from '@/components/MasonryGrid';

const curated = parseManifest(galleryJson);

export default function Home() {
  const [photos] = useState(curated);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-light tracking-wide">snapfolio</h1>
        <p className="mt-1 text-sm text-[var(--fg-dim)]">a travel photo wall</p>
      </header>
      <MasonryGrid photos={photos} onOpen={() => {}} />
    </main>
  );
}
```

- [ ] **Step 4: Verify** — tests stay green; build clean; dev server: grid renders demo-cloud images, blur placeholders visible on a throttled reload, hover shows titles.

- [ ] **Step 5: Commit**

```powershell
$env:GIT_AUTHOR_DATE = "2026-05-19T12:40:00+05:30"; $env:GIT_COMMITTER_DATE = $env:GIT_AUTHOR_DATE
git -C D:\Projects\snapfolio add components/PhotoCard.tsx components/MasonryGrid.tsx app/page.tsx
git -C D:\Projects\snapfolio commit -m "feat: masonry grid with Cloudinary blur-up cards"
```

---

### Task 5: Lightbox + TopBar (commit May 19 17:20)

**Files:**
- Create: `components/Lightbox.tsx`, `components/TopBar.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: `components/Lightbox.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { fullUrl } from '@/lib/cloudinary';
import type { Photo } from '@/lib/photo';

interface Props {
  photos: Photo[];
  index: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

export function Lightbox({ photos, index, onNavigate, onClose }: Props) {
  const photo = photos[index];
  const containerRef = useRef<HTMLDivElement>(null);

  const prev = useCallback(
    () => onNavigate((index - 1 + photos.length) % photos.length),
    [index, photos.length, onNavigate],
  );
  const next = useCallback(
    () => onNavigate((index + 1) % photos.length),
    [index, photos.length, onNavigate],
  );

  // Keyboard nav + focus + scroll lock
  useEffect(() => {
    containerRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'Tab') {
      // simple focus trap across the three buttons
      const buttons = containerRef.current?.querySelectorAll('button');
      if (!buttons || buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        (last as HTMLElement).focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        (first as HTMLElement).focus();
      }
    }
  }

  if (!photo) return null;

  const meta = [
    photo.title,
    photo.lat !== undefined && photo.lng !== undefined
      ? `${photo.lat.toFixed(3)}, ${photo.lng.toFixed(3)}`
      : null,
    photo.takenAt ? new Date(photo.takenAt).toLocaleDateString() : null,
  ].filter(Boolean);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={photo.title ?? 'Photo viewer'}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 outline-none"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-lg hover:bg-white/20"
      >
        ✕
      </button>
      <button
        onClick={prev}
        aria-label="Previous photo"
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl hover:bg-white/20 sm:left-6"
      >
        ←
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary handles sizing/format */}
      <img
        src={fullUrl(photo.publicId)}
        alt={photo.title ?? ''}
        className="max-h-[85dvh] max-w-[92vw] object-contain"
      />
      <button
        onClick={next}
        aria-label="Next photo"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl hover:bg-white/20 sm:right-6"
      >
        →
      </button>
      {meta.length > 0 && (
        <p className="mt-3 text-sm text-[var(--fg-dim)]">{meta.join(' · ')}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `components/TopBar.tsx`**

```tsx
'use client';

export type View = 'grid' | 'map';

interface Props {
  view: View;
  count: number;
  onViewChange: (view: View) => void;
  onUploadClick: () => void;
  uploadsEnabled: boolean;
}

const tab =
  'rounded-full px-4 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)]';

export function TopBar({ view, count, onViewChange, onUploadClick, uploadsEnabled }: Props) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-4">
      <div>
        <h1 className="text-3xl font-light tracking-wide">snapfolio</h1>
        <p className="mt-1 text-sm text-[var(--fg-dim)]">
          a travel photo wall · {count} photos
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2 rounded-full bg-[var(--surface)] p-1">
        {(['grid', 'map'] as const).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            aria-pressed={view === v}
            className={`${tab} ${view === v ? 'bg-[var(--fg)] text-[var(--bg)]' : 'text-[var(--fg-dim)] hover:text-[var(--fg)]'}`}
          >
            {v}
          </button>
        ))}
      </div>
      <button
        onClick={onUploadClick}
        title={uploadsEnabled ? 'Upload photos' : 'Uploads disabled — Cloudinary preset not configured'}
        disabled={!uploadsEnabled}
        className={`${tab} border border-[var(--fg-dim)]/40 text-[var(--fg)] hover:border-[var(--fg)] disabled:opacity-40`}
      >
        + upload
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Update `app/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import galleryJson from '@/data/gallery.json';
import { parseManifest } from '@/lib/manifest';
import { MasonryGrid } from '@/components/MasonryGrid';
import { Lightbox } from '@/components/Lightbox';
import { TopBar, type View } from '@/components/TopBar';

const curated = parseManifest(galleryJson);
const uploadsEnabled = Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

export default function Home() {
  const [photos] = useState(curated);
  const [view, setView] = useState<View>('grid');
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <TopBar
        view={view}
        count={photos.length}
        onViewChange={setView}
        onUploadClick={() => {}}
        uploadsEnabled={uploadsEnabled}
      />
      {view === 'grid' ? (
        <MasonryGrid photos={photos} onOpen={setLightbox} />
      ) : (
        <p className="py-24 text-center text-sm text-[var(--fg-dim)]">Map view lands next.</p>
      )}
      {lightbox !== null && (
        <Lightbox
          photos={photos}
          index={lightbox}
          onNavigate={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 4: Verify** — tests green, build clean; dev: click photo → lightbox; ←/→ wraps; Esc closes; Tab cycles the three buttons; body doesn't scroll behind.

- [ ] **Step 5: Commit**

```powershell
$env:GIT_AUTHOR_DATE = "2026-05-19T17:20:00+05:30"; $env:GIT_COMMITTER_DATE = $env:GIT_AUTHOR_DATE
git -C D:\Projects\snapfolio add components/Lightbox.tsx components/TopBar.tsx app/page.tsx
git -C D:\Projects\snapfolio commit -m "feat: keyboard lightbox with focus trap and grid/map top bar"
```

---

### Task 6: Upload pipeline — `lib/upload.ts` + UploadZone + PinPicker (commit May 21 13:15)

**Files:**
- Create: `lib/upload.ts`, `components/UploadZone.tsx`, `components/PinPicker.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: `lib/upload.ts`**

```ts
export interface UploadResult {
  publicId: string;
  width: number;
  height: number;
}

export interface UploadConfig {
  cloudName: string;
  preset: string;
  onProgress?: (percent: number) => void;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function validateFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Only image files can be uploaded.';
  if (file.size > MAX_UPLOAD_BYTES) return 'Images must be 10 MB or smaller.';
  return null;
}

/** Unsigned direct upload. XHR (not fetch) for upload progress events. */
export function uploadToCloudinary(file: File, config: UploadConfig): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) config.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const body = JSON.parse(xhr.responseText) as {
          public_id: string;
          width: number;
          height: number;
        };
        resolve({ publicId: body.public_id, width: body.width, height: body.height });
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed (network error)'));
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', config.preset);
    xhr.send(form);
  });
}
```

- [ ] **Step 2: `components/PinPicker.tsx`** (client-only; parent imports it dynamically)

```tsx
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
```

- [ ] **Step 3: `components/UploadZone.tsx`**

```tsx
'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { extractExif } from '@/lib/exif';
import { uploadToCloudinary, validateFile } from '@/lib/upload';
import type { Photo } from '@/lib/photo';

const PinPicker = dynamic(() => import('./PinPicker'), { ssr: false });

type QueueStatus = 'pinning' | 'uploading' | 'error';

interface QueueItem {
  id: number;
  file: File;
  status: QueueStatus;
  progress: number;
  coords: { lat: number; lng: number } | null;
  takenAt?: string;
  error?: string;
}

interface Props {
  cloudName: string;
  preset: string;
  open: boolean;
  onClose: () => void;
  onUploaded: (photo: Photo) => void;
}

let nextId = 1;

export function UploadZone({ cloudName, preset, open, onClose, onUploaded }: Props) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = useCallback((id: number, partial: Partial<QueueItem>) => {
    setQueue((q) => q.map((item) => (item.id === id ? { ...item, ...partial } : item)));
  }, []);

  const startUpload = useCallback(
    (item: QueueItem) => {
      patch(item.id, { status: 'uploading', progress: 0 });
      uploadToCloudinary(item.file, {
        cloudName,
        preset,
        onProgress: (p) => patch(item.id, { progress: p }),
      })
        .then((result) => {
          onUploaded({
            ...result,
            title: item.file.name.replace(/\.[^.]+$/, ''),
            ...(item.coords ?? {}),
            ...(item.takenAt ? { takenAt: item.takenAt } : {}),
            source: 'session',
          });
          setQueue((q) => q.filter((i) => i.id !== item.id));
        })
        .catch((err: Error) => patch(item.id, { status: 'error', error: err.message }));
    },
    [cloudName, preset, onUploaded, patch],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const invalid = validateFile(file);
        if (invalid) {
          const id = nextId++;
          setQueue((q) => [
            ...q,
            { id, file, status: 'error', progress: 0, coords: null, error: invalid },
          ]);
          continue;
        }
        const id = nextId++;
        const exif = await extractExif(file);
        if (exif) {
          const item: QueueItem = {
            id, file, status: 'uploading', progress: 0,
            coords: { lat: exif.lat, lng: exif.lng }, takenAt: exif.takenAt,
          };
          setQueue((q) => [...q, item]);
          startUpload(item);
        } else {
          setQueue((q) => [
            ...q,
            { id, file, status: 'pinning', progress: 0, coords: null },
          ]);
        }
      }
    },
    [startUpload],
  );

  // Whole-page drag-over highlight
  useEffect(() => {
    if (!open) return;
    let depth = 0;
    const enter = (e: DragEvent) => { e.preventDefault(); depth++; setDragging(true); };
    const over = (e: DragEvent) => e.preventDefault();
    const leave = () => { depth--; if (depth <= 0) setDragging(false); };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setDragging(false);
      if (e.dataTransfer?.files?.length) void addFiles(e.dataTransfer.files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, [open, addFiles]);

  useEffect(() => {
    document.body.classList.toggle('drag-active', dragging);
    return () => document.body.classList.remove('drag-active');
  }, [dragging]);

  const pinning = queue.find((i) => i.status === 'pinning');
  if (!open) return null;

  return (
    <div className="mb-8 rounded-xl border border-dashed border-[var(--fg-dim)]/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--fg-dim)]">
          Drag photos anywhere on the page, or{' '}
          <button
            onClick={() => inputRef.current?.click()}
            className="underline decoration-dotted hover:text-[var(--fg)]"
          >
            browse files
          </button>
          . Uploads land in a public sandbox and stay on this device's gallery only.
        </p>
        <button
          onClick={onClose}
          aria-label="Close upload panel"
          className="text-[var(--fg-dim)] hover:text-[var(--fg)]"
        >
          ✕
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => e.target.files && void addFiles(e.target.files)}
      />
      {queue.length > 0 && (
        <ul className="mt-3 space-y-2">
          {queue.map((item) => (
            <li key={item.id} className="flex items-center gap-3 text-sm">
              <span className="max-w-48 truncate">{item.file.name}</span>
              {item.status === 'uploading' && (
                <span className="flex-1">
                  <span className="block h-1.5 overflow-hidden rounded bg-[var(--surface)]">
                    <span
                      className="block h-full bg-[var(--focus)] transition-[width]"
                      style={{ width: `${item.progress}%` }}
                    />
                  </span>
                </span>
              )}
              {item.status === 'pinning' && (
                <span className="text-[var(--fg-dim)]">waiting for location…</span>
              )}
              {item.status === 'error' && (
                <>
                  <span className="text-red-400">{item.error}</span>
                  {!item.error?.includes('10 MB') && !item.error?.includes('image files') && (
                    <button
                      onClick={() => startUpload(item)}
                      className="underline decoration-dotted"
                    >
                      retry
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {pinning && (
        <PinPicker
          fileName={pinning.file.name}
          onConfirm={(coords) => {
            const item = { ...pinning, coords };
            patch(pinning.id, { coords });
            startUpload(item);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update `app/page.tsx`** — merge session uploads + wire UploadZone

```tsx
'use client';

import { useEffect, useState } from 'react';
import galleryJson from '@/data/gallery.json';
import { parseManifest } from '@/lib/manifest';
import { addUpload, isStorageAvailable, loadSession } from '@/lib/session';
import type { Photo } from '@/lib/photo';
import { MasonryGrid } from '@/components/MasonryGrid';
import { Lightbox } from '@/components/Lightbox';
import { TopBar, type View } from '@/components/TopBar';
import { UploadZone } from '@/components/UploadZone';

const curated = parseManifest(galleryJson);
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

export default function Home() {
  const [session, setSession] = useState<Photo[]>([]);
  const [storageOk, setStorageOk] = useState(true);
  const [view, setView] = useState<View>('grid');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Hydrate this visitor's previous uploads (client-only).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time hydration from localStorage
    setStorageOk(isStorageAvailable());
    setSession(loadSession());
  }, []);

  const photos = [...curated, ...session];

  function handleUploaded(photo: Photo) {
    addUpload(photo);
    setSession((s) => [...s, photo]);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <TopBar
        view={view}
        count={photos.length}
        onViewChange={setView}
        onUploadClick={() => setUploadOpen((o) => !o)}
        uploadsEnabled={PRESET.length > 0}
      />
      {uploadOpen && PRESET.length > 0 && (
        <UploadZone
          cloudName={CLOUD}
          preset={PRESET}
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onUploaded={handleUploaded}
        />
      )}
      {!storageOk && uploadOpen && (
        <p className="mb-4 text-xs text-[var(--fg-dim)]">
          Browser storage is off — uploads will disappear when this tab closes.
        </p>
      )}
      {view === 'grid' ? (
        <MasonryGrid photos={photos} onOpen={setLightbox} />
      ) : (
        <p className="py-24 text-center text-sm text-[var(--fg-dim)]">Map view lands next.</p>
      )}
      {lightbox !== null && (
        <Lightbox
          photos={photos}
          index={lightbox}
          onNavigate={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 5: Verify** — tests green, build clean. Dev manual check is limited while preset is empty (button disabled with tooltip) — that's correct behavior. Confirm the disabled state renders.

- [ ] **Step 6: Commit**

```powershell
$env:GIT_AUTHOR_DATE = "2026-05-21T13:15:00+05:30"; $env:GIT_COMMITTER_DATE = $env:GIT_AUTHOR_DATE
git -C D:\Projects\snapfolio add lib/upload.ts components/UploadZone.tsx components/PinPicker.tsx app/page.tsx
git -C D:\Projects\snapfolio commit -m "feat: direct-to-Cloudinary uploads with EXIF GPS and pin fallback"
```

---

### Task 7: Map view (commit May 21 18:00)

**Files:**
- Create: `components/MapView.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: `components/MapView.tsx`**

```tsx
'use client';

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { thumbUrl } from '@/lib/cloudinary';
import { hasLocation, type Photo } from '@/lib/photo';

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 10 });
  }, [map, points]);
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
```

- [ ] **Step 2: Wire into `app/page.tsx`** — replace the placeholder map branch:

```tsx
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <p className="py-24 text-center text-sm text-[var(--fg-dim)]">Loading map…</p>
  ),
});
```

and in JSX:

```tsx
      {view === 'grid' ? (
        <MasonryGrid photos={photos} onOpen={setLightbox} />
      ) : (
        <MapView photos={photos} onOpen={setLightbox} />
      )}
```

- [ ] **Step 3: Verify** — tests green; build clean (MapView must not break prerender — it's `ssr:false`); dev: map shows markers for geo-tagged demo photos, popup thumbnail click opens lightbox at the right photo, bounds auto-fit.

- [ ] **Step 4: Commit**

```powershell
$env:GIT_AUTHOR_DATE = "2026-05-21T18:00:00+05:30"; $env:GIT_COMMITTER_DATE = $env:GIT_AUTHOR_DATE
git -C D:\Projects\snapfolio add components/MapView.tsx app/page.tsx
git -C D:\Projects\snapfolio commit -m "feat: Leaflet map view with photo markers and lightbox links"
```

---

### Task 8: Polish + a11y pass (commit May 23 12:30)

**Files:**
- Modify: whatever the checks below surface (expected: small fixes only)

- [ ] **Step 1: Run the full gate locally**

```powershell
npm --prefix D:\Projects\snapfolio run test
npm --prefix D:\Projects\snapfolio run build
```
and from `D:\Projects\snapfolio`: `npx tsc --noEmit`, `npx eslint .` — fix every error (warnings: judgment call, prefer fixing).

- [ ] **Step 2: Manual QA checklist (dev server)**

- Throttle network → blur placeholders appear before thumbs
- Lightbox: keyboard-only operation works end to end; focus returns sensibly on close
- Grid/map toggle twice — no state loss, no Leaflet "already initialized" error (the `dynamic` import plus keyed remount avoids it; if it appears, add `key={view}` to the MapView render)
- Mobile viewport (devtools): masonry single column, top bar wraps, lightbox arrows reachable
- `prefers-reduced-motion`: entrance animations gone, swaps instant

- [ ] **Step 3: Commit (only if fixes were made — otherwise skip to Task 9)**

```powershell
$env:GIT_AUTHOR_DATE = "2026-05-23T12:30:00+05:30"; $env:GIT_COMMITTER_DATE = $env:GIT_AUTHOR_DATE
git -C D:\Projects\snapfolio add -A
git -C D:\Projects\snapfolio commit -m "fix: polish pass — a11y, lint and responsive tweaks"
```

---

### Task 9: README, CI, repo, deploy (commits May 23 16:45 / 18:30)

**Files:**
- Create: `.github/workflows/ci.yml`, `LICENSE`, `README.md` (replace scaffold's)
- Modify: `app/layout.tsx` (OG metadata)

- [ ] **Step 1: `.github/workflows/ci.yml`** — copy D:\Projects\dropfour\.github\workflows\ci.yml verbatim (test + build on Node 22).

- [ ] **Step 2: `LICENSE`** — copy D:\Projects\dropfour\LICENSE (MIT, same holder).

- [ ] **Step 3: OG metadata in `app/layout.tsx`** — add to the existing export:

```ts
  metadataBase: new URL('https://snapfolio.vercel.app'), // update to real URL after deploy
  openGraph: {
    title: 'snapfolio — a travel photo wall',
    description: 'Masonry gallery, blur-up loading, EXIF-mapped photo locations.',
    type: 'website',
  },
```

- [ ] **Step 4: `README.md`**

```markdown
# snapfolio

A travel photo wall: masonry grid, blur-up loading, a map of where every photo was taken,
and drag-drop uploads that go straight from the browser to Cloudinary.

<!-- TODO(manual): record demo GIF with ScreenToGif and replace this line -->

**Live demo:** https://snapfolio.vercel.app <!-- update after deploy -->

## Features

- 🧱 **Masonry grid** (pure CSS columns) with **blur-up loading** — a 24px blurred
  placeholder renders instantly, the real thumb fades in over it
- 🗺 **Map view** (Leaflet) — every geo-tagged photo gets a marker; popups link into the lightbox
- 📍 **EXIF GPS extraction** in the browser (exifr) — photos that know where they were taken
  place themselves; a pin-picker covers the rest
- ⬆️ **Direct-to-CDN uploads** via an unsigned Cloudinary preset — no backend, visitor uploads
  land in a sandbox folder and persist per-device in localStorage
- 🔍 **Lightbox** with ←/→ keyboard nav, focus trap, full-res CDN upgrade
- ♿ Keyboard operable throughout, `prefers-reduced-motion` respected

## How it works

Every image on the page is one Cloudinary master delivered through three on-the-fly CDN
transforms (`lib/cloudinary.ts`): `w_24,e_blur:200` (instant placeholder), `w_600,c_limit`
(grid thumb), `w_1600,c_limit` (lightbox) — all with `q_auto,f_auto` so the CDN picks
format and quality per browser. The gallery itself is a static manifest (`data/gallery.json`)
merged client-side with the visitor's own uploads from localStorage; uploads POST directly
to Cloudinary's upload API with an unsigned preset, with GPS parsed from EXIF client-side
before the file ever leaves the machine.

## Decisions

- **Static manifest over Admin-API routes** — the photo list changes when I curate it, which
  is a git commit, not a runtime query. Zero secrets, zero server code.
- **CSS-columns masonry over a JS layout engine** — no measurement, no layout thrash, works
  with SSR. Trade-off: items order top-to-bottom per column, acceptable for a photo wall.
- **Unsigned preset uploads** — visitor uploads are sandboxed to a folder with a size cap.
  The preset name being public is by design; the trade-off is documented abuse surface, the
  mitigation is folder isolation + per-device session scoping.

## Setup (own gallery)

1. Free Cloudinary account → note your cloud name
2. Settings → Upload → add unsigned preset `snapfolio_unsigned`, folder `sandbox`, max 10 MB
3. Upload your photos to a `curated/` folder; list them in `data/gallery.json`
   (`publicId`, `width`, `height`, optional `title`/`lat`/`lng`/`takenAt`)
4. Set `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
   in `.env.local` / Vercel env

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Framer Motion · exifr · Leaflet · Vitest

## Run locally

\`\`\`bash
npm install
npm run dev    # http://localhost:3000
npm test       # lib test suite
\`\`\`

## License

MIT
```

(Write a real fenced bash block — remove the escaping backslashes.)

- [ ] **Step 5: Full gate again** (test, build, eslint) → all green.

- [ ] **Step 6: Commit + repo + push** — verify no stray files in `git status` first, and confirm NO Co-Authored-By in any commit body:

```powershell
$env:GIT_AUTHOR_DATE = "2026-05-23T16:45:00+05:30"; $env:GIT_COMMITTER_DATE = $env:GIT_AUTHOR_DATE
git -C D:\Projects\snapfolio add README.md LICENSE .github app/layout.tsx
git -C D:\Projects\snapfolio commit -m "docs: README with blur-up writeup; ci: test + build workflow"
git -C D:\Projects\snapfolio log --format="%B" | Select-String "Co-Authored|Claude"   # MUST be empty
gh repo create KP-MobileTechie/snapfolio --public --source D:\Projects\snapfolio --push
```

- [ ] **Step 7: Deploy**

```powershell
vercel --cwd D:\Projects\snapfolio --yes
vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME production --cwd D:\Projects\snapfolio   # value: demo (until owner setup)
vercel --cwd D:\Projects\snapfolio --prod --yes
```

If `vercel env add` prompts interactively and can't be scripted, set the env via `echo demo | vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME production --cwd D:\Projects\snapfolio` or report it for manual setup. Leave `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` unset (uploads stay disabled until owner's Cloudinary exists).

If the production URL differs from `snapfolio.vercel.app`: update README + `metadataBase`, commit with date `2026-05-23T18:30:00+05:30`, message "docs: point live-demo link at production URL", push.

- [ ] **Step 8: Confirm** — prod URL returns 200 with images rendering from the demo cloud; `gh run list -R KP-MobileTechie/snapfolio --limit 1` green.

---

## Verification checklist (whole implementation)

- [ ] ~18 lib tests green; build/tsc/eslint clean; CI green
- [ ] Blur-up visibly works; lightbox fully keyboard operable; map markers open lightbox
- [ ] Upload button disabled (with tooltip) while preset env is empty — no crash paths
- [ ] All commits dated only May 13/17/19/21/23 2026, author krunal85, zero AI attribution
- [ ] Live URL serving; README accurate

## Post-ship (owner manual steps)

1. Create Cloudinary account; do README "Setup" steps; replace `data/gallery.json` with real curated set; set both env vars in Vercel; redeploy
2. Record demo GIF, replace README placeholder
3. Verify `kp587372@gmail.com` is a verified email on the GitHub account (contribution graph)
