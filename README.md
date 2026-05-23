# snapfolio

[![CI](https://github.com/KP-MobileTechie/snapfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/KP-MobileTechie/snapfolio/actions/workflows/ci.yml)

A travel photo wall. Masonry grid with blur-up loading, a full-screen lightbox, a map of
where every photo was taken, and drag-drop uploads that go straight from the browser to
Cloudinary. No backend, no database, no secrets.

<!-- TODO(manual): record demo GIF with ScreenToGif and replace this line -->

**Live demo:** https://snapfolio-eosin.vercel.app

## Features

| | |
|---|---|
| 🧱 **Masonry grid** | Pure CSS columns, responsive 1 to 4 columns, entrance animations |
| 🌫 **Blur-up loading** | A 24px blurred placeholder renders instantly; the real thumbnail fades in over it |
| 🔍 **Lightbox** | Full-resolution viewer with ←/→ keyboard navigation, focus trap, and Esc to close |
| 🗺 **Map view** | Every geo-tagged photo becomes a Leaflet marker; popups link back into the lightbox |
| 📍 **EXIF GPS extraction** | Photos that know where they were taken place themselves on the map; a pin-picker covers the rest |
| ⬆️ **Direct-to-CDN uploads** | Drag photos anywhere on the page; they POST straight to Cloudinary via an unsigned preset |
| 💾 **Per-device persistence** | Visitor uploads live in localStorage and survive reloads, scoped to that device only |
| ♿ **Accessible** | Fully keyboard operable, visible focus rings, `prefers-reduced-motion` respected |

## How it works

### One master image, three CDN transforms

Every image on the page is a single Cloudinary master delivered through on-the-fly
transformations (`lib/cloudinary.ts`):

| Variant | Transform | Used for |
|---|---|---|
| blur | `w_24,e_blur:200,q_auto,f_auto` | instant placeholder (~1 KB) |
| thumb | `w_600,c_limit,q_auto,f_auto` | masonry grid |
| full | `w_1600,c_limit,q_auto,f_auto` | lightbox |

`q_auto,f_auto` lets the CDN pick the best format (AVIF/WebP) and quality per browser.
The blurred placeholder is absolutely positioned under the thumbnail, which starts at
`opacity: 0` and fades in on its `load` event, so the layout never shifts and something
is always visible.

### The gallery data model

There is no server. The curated gallery is a static manifest (`data/gallery.json`)
validated at load by `lib/manifest.ts`. Visitor uploads are merged in client-side from
localStorage (`lib/session.ts`), deduplicated against the curated set, and rendered by
the exact same grid, map, and lightbox components.

### The upload pipeline

```
file dropped
   └─ validate (image type, ≤ 10 MB)            lib/upload.ts
       └─ parse EXIF GPS in the browser          lib/exif.ts (exifr)
           ├─ GPS found  → upload immediately
           └─ no GPS     → pin-picker mini map → upload (or skip the map)
               └─ XHR POST to Cloudinary with progress bar
                   └─ saved to localStorage, appears in grid/map instantly
```

GPS is parsed before the file ever leaves the machine, and uploads land in a sandboxed
`sandbox/` folder on Cloudinary, never mixing with the curated set.

## Decisions

- **Static manifest over Admin-API routes.** The photo list changes when I curate it,
  which is a git commit, not a runtime query. Zero secrets, zero server code, and the
  whole site stays statically deployable.
- **CSS-columns masonry over a JS layout engine.** No measurement, no layout thrash,
  works with SSR. Trade-off: items order top-to-bottom per column, which is acceptable
  for a photo wall.
- **Unsigned preset uploads.** The preset name being public is by design; the documented
  trade-off is abuse surface, and the mitigations are folder isolation, a 10 MB cap, and
  per-device session scoping so strangers' uploads never appear in anyone else's gallery.

## Project structure

```
app/page.tsx            view state: grid ⇄ map, lightbox, upload panel
data/gallery.json       curated manifest (publicId, dimensions, title, coords)
lib/cloudinary.ts       URL builder for the three CDN variants        (pure)
lib/manifest.ts         manifest validation                           (pure)
lib/exif.ts             EXIF GPS extraction (exifr)
lib/session.ts          localStorage session uploads (sole storage access)
lib/upload.ts           unsigned XHR upload with progress
components/             MasonryGrid · PhotoCard · Lightbox · MapView ·
                        UploadZone · PinPicker · TopBar
tests/lib/              19 Vitest tests (manifest, URLs, EXIF, session)
```

## Run locally

```bash
npm install
npm run dev    # http://localhost:3000
npm test       # lib test suite (19 tests)
```

## Use your own gallery

1. Create a free Cloudinary account and note your **cloud name**
2. Settings → Upload → add an **unsigned** preset named `snapfolio_unsigned`
   (folder `sandbox`, max 10 MB)
3. Upload your photos to a `curated/` folder and list them in `data/gallery.json`:
   `publicId`, `width`, `height`, and optional `title` / `lat` / `lng` / `takenAt`
4. Set the env vars in `.env.local` (and on Vercel):

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your-cloud-name>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=snapfolio_unsigned
```

Both values are public by design; nothing in this project needs a secret.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Framer Motion · exifr · Leaflet · Vitest

## License

[MIT](LICENSE)
