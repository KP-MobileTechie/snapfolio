# snapfolio — Design Spec

**Date:** 2026-05-13
**Status:** Approved (brainstorming session)
**Repo:** `D:\Projects\snapfolio` · Deploy target: Vercel · Public GitHub repo (`KP-MobileTechie/snapfolio`)

## Summary

A travel photo gallery: masonry grid with blur-up lazy loading, full-screen lightbox with keyboard navigation, a Leaflet map view plotting photos by location, and drag-drop uploads that go directly from the browser to Cloudinary. Curated photos live in the owner's Cloudinary account and are described by a static manifest in the repo; visitor uploads land in a sandboxed Cloudinary folder via an unsigned preset and persist per-visitor in localStorage. No backend, no secrets.

Portfolio goals: real cloud media handling (direct-to-CDN upload, edge-transformed thumbnails, blur-up placeholder strategy), client-side EXIF GPS parsing, and a visual-showpiece UI. Third project in the six-project portfolio plan.

## Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Photo list source | Static manifest (`data/gallery.json`) + unsigned uploads (Approach A) | Zero backend/secrets; Cloudinary cloud name + unsigned preset are public by design. Admin-API routes (B) duplicate splitwisely's full-stack slot; list-by-tag endpoint (C) is a known footgun. |
| Upload model | Hybrid: curated set + visitor session uploads | Visitors exercise the real upload pipeline into a `sandbox/` folder without defacing the curated gallery. Session uploads merge client-side from localStorage. |
| Geodata | EXIF GPS via exifr, manual PinPicker fallback | "It knows where the photo was taken" demo magic; pin fallback because most social-export images have GPS stripped. Skippable — skipped photos appear in grid but not map. |
| Visual style | Photo-first gallery wall: near-black `#0c0c0e`, Inter, editorial whitespace | Distinct from keyflow (terminal) and dropfour (glassmorphism); photos carry the design. |
| Map library | react-leaflet, dynamically imported with `ssr: false` | Leaflet touches `window`; OSM tiles are free. |
| Persistence | localStorage only (session uploads + nothing else) | Same versioned-schema, safe-wrapper pattern as keyflow/dropfour. |
| Stack | Next.js App Router + TypeScript + Tailwind + Framer Motion + exifr + react-leaflet + Vitest | Portfolio-consistent; exifr is the EXIF story. |
| Commit dates | Only May 13, 17, 19, 21, 23 (2026), author `krunal85 <kp587372@gmail.com>`, no AI attribution | Project owner's instruction. |

## Architecture

```
app/layout.tsx            # Inter font, metadata, OG image, near-black theme
app/page.tsx              # view state: grid ⇄ map · lightbox overlay · upload flow
app/globals.css           # theme tokens (gallery-wall palette)
data/gallery.json         # curated manifest: publicId, title, w, h, lat, lng, takenAt
lib/cloudinary.ts         # PURE: URL builder — blurUrl (w_24,e_blur:200,q_auto),
                          # thumbUrl (w_600,c_limit,f_auto,q_auto), fullUrl (w_1600,...)
lib/manifest.ts           # PURE: validate gallery.json entries → Photo[]; invalid entries
                          # skipped with console.warn
lib/exif.ts               # exifr wrapper: File → { lat, lng, takenAt } | null
lib/upload.ts             # unsigned upload: XHR POST to
                          # api.cloudinary.com/v1_1/<cloud>/image/upload with progress callback;
                          # returns { publicId, width, height }
lib/session.ts            # localStorage (ONLY module touching it): visitor's uploads,
                          # versioned schema, safe wrapper
components/TopBar.tsx     # grid/map toggle, photo count, upload button
components/MasonryGrid.tsx# CSS-columns masonry; per-card blur-up; Framer Motion fade-up entrance
components/PhotoCard.tsx  # blur placeholder → thumb swap on load; click → lightbox
components/Lightbox.tsx   # full-screen: ←/→ navigate, Esc close, focus trap,
                          # full-res upgrade, caption/location footer
components/MapView.tsx    # react-leaflet map, markers with thumbnail popups,
                          # auto-fit bounds to photo set
components/UploadZone.tsx # drag-drop + file picker; per-file: EXIF parse → PinPicker if no
                          # GPS → upload with progress bar → append to session
components/PinPicker.tsx  # mini leaflet map; click drops a pin; skippable
tests/                    # Vitest: manifest, cloudinary, exif mapping, session (~22 tests)
.github/workflows/ci.yml  # test + build
```

**Photo type (shared):** `{ publicId, width, height, title?, lat?, lng?, takenAt?, source: 'curated' | 'session' }`.

**Data flow:** `manifest.ts` parses curated entries; `session.ts` loads visitor uploads; `page.tsx` merges both into one `Photo[]` consumed identically by grid, map, and lightbox. Upload: file → `exif.ts` → (PinPicker if no GPS) → `upload.ts` → Cloudinary publicId → `session.ts` append → re-render.

**Unit boundaries:** `lib/cloudinary.ts` and `lib/manifest.ts` are pure and fully unit-tested. `lib/exif.ts` wraps exifr behind a typed function (tested with fixture buffers). `lib/session.ts` is the only localStorage toucher. Components never build Cloudinary URLs by hand.

## Key behaviors

- Blur-up: card renders the 24px blurred variant as an instant placeholder, swaps to the 600px thumb on load; lightbox upgrades to 1600px. All variants are CDN transforms of one master.
- Masonry via CSS columns (no JS measurement); cards fade-up on first appearance; `prefers-reduced-motion` disables entrance animation and uses instant swaps
- Lightbox: ←/→ cycles the merged photo array, Esc closes, focus trapped, background scroll locked; shows title + location + date when known
- Map: one marker per geo-tagged photo; popup shows thumbnail + title, click opens lightbox; bounds auto-fit; session uploads appear immediately
- Upload: whole-page drag-over highlight; multiple files queued; per-file progress; image-type and ≤10MB validation client-side
- Grid/map toggle preserves state (no remount of uploaded data); deep state stays in `page.tsx`

## Error handling / edge cases

- Upload failure (network/preset error) → inline retry on the queued card; file kept in memory
- EXIF parse failure or no GPS → PinPicker step; skipping leaves photo grid-only
- localStorage unavailable → uploads survive for the tab session only; small notice shown
- Leaflet/tile failure → map pane shows fallback message; grid unaffected
- Invalid manifest entry → skipped, rest renders
- Cloud name env missing at build → app renders with empty gallery + setup notice (no crash)

## Configuration

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` (both public-safe; baked via Vercel env)
- Owner setup (one-time): free Cloudinary account; unsigned preset `snapfolio_unsigned` → folder `sandbox/`, 10MB max; ~12 public-domain travel photos (Wikimedia Commons) uploaded to `curated/` with a script; `data/gallery.json` generated from them

## Testing (Vitest, ~22 tests)

- `manifest.ts`: valid entries parse; missing/extra fields; invalid entries skipped not fatal
- `cloudinary.ts`: exact URL strings for blur/thumb/full variants; cloud name injection
- `exif.ts`: GPS present → decimal lat/lng; no GPS → null; corrupt file → null (fixtures)
- `session.ts`: round-trip, corrupt JSON fallback, version check, storage-unavailable no-op

## Out of scope (v2 candidates)

Albums/collections, captions editing, delete/moderate uploads, marker clustering, image reordering, auth, Admin-API anything.

## Delivery

Public repo `KP-MobileTechie/snapfolio`, Vercel deploy, OG metadata, README with demo GIF placeholder, "How it works" (blur-up pipeline + EXIF parsing), "Decisions" (manifest over Admin API; CSS columns over JS masonry; unsigned preset trade-off). Lighthouse ≥ 95 target. Commits only on May 13/17/19/21/23 2026: day 1 docs+scaffold, day 2 lib TDD, day 3 grid+lightbox, day 4 upload+map, day 5 polish+ship.
