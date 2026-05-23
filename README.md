# snapfolio

A travel photo wall: masonry grid, blur-up loading, a map of where every photo was taken,
and drag-drop uploads that go straight from the browser to Cloudinary.

<!-- TODO(manual): record demo GIF with ScreenToGif and replace this line -->

**Live demo:** https://snapfolio-eosin.vercel.app

## Features

- 🧱 **Masonry grid** (pure CSS columns) with **blur-up loading**: a 24px blurred
  placeholder renders instantly, the real thumb fades in over it
- 🗺 **Map view** (Leaflet): every geo-tagged photo gets a marker; popups link into the lightbox
- 📍 **EXIF GPS extraction** in the browser (exifr): photos that know where they were taken
  place themselves; a pin-picker covers the rest
- ⬆️ **Direct-to-CDN uploads** via an unsigned Cloudinary preset: no backend, visitor uploads
  land in a sandbox folder and persist per-device in localStorage
- 🔍 **Lightbox** with ←/→ keyboard nav, focus trap, full-res CDN upgrade
- ♿ Keyboard operable throughout, `prefers-reduced-motion` respected

## How it works

Every image on the page is one Cloudinary master delivered through three on-the-fly CDN
transforms (`lib/cloudinary.ts`): `w_24,e_blur:200` (instant placeholder), `w_600,c_limit`
(grid thumb), `w_1600,c_limit` (lightbox), all with `q_auto,f_auto` so the CDN picks
format and quality per browser. The gallery itself is a static manifest (`data/gallery.json`)
merged client-side with the visitor's own uploads from localStorage; uploads POST directly
to Cloudinary's upload API with an unsigned preset, with GPS parsed from EXIF client-side
before the file ever leaves the machine.

## Decisions

- **Static manifest over Admin-API routes**: the photo list changes when I curate it, which
  is a git commit, not a runtime query. Zero secrets, zero server code.
- **CSS-columns masonry over a JS layout engine**: no measurement, no layout thrash, works
  with SSR. Trade-off: items order top-to-bottom per column, acceptable for a photo wall.
- **Unsigned preset uploads**: visitor uploads are sandboxed to a folder with a size cap.
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

```bash
npm install
npm run dev    # http://localhost:3000
npm test       # lib test suite
```

## License

MIT
