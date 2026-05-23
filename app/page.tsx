'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import galleryJson from '@/data/gallery.json';
import { parseManifest } from '@/lib/manifest';
import { addUpload, isStorageAvailable, loadSession } from '@/lib/session';
import type { Photo } from '@/lib/photo';
import { MasonryGrid } from '@/components/MasonryGrid';
import { Lightbox } from '@/components/Lightbox';
import { TopBar, type View } from '@/components/TopBar';
import { UploadZone } from '@/components/UploadZone';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <p className="py-24 text-center text-sm text-[var(--fg-dim)]">Loading map…</p>
  ),
});

const curated = parseManifest(galleryJson);
const curatedIds = new Set(curated.map((p) => p.publicId));
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

  // Dedupe: re-uploading an identical file yields the same Cloudinary publicId,
  // which would collide with curated entries or earlier session uploads.
  const photos = [
    ...curated,
    ...session.filter(
      (p, i, arr) =>
        !curatedIds.has(p.publicId) && arr.findIndex((x) => x.publicId === p.publicId) === i,
    ),
  ];

  function handleUploaded(photo: Photo) {
    addUpload(photo);
    setSession((s) => (s.some((p) => p.publicId === photo.publicId) ? s : [...s, photo]));
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
        <MapView photos={photos} onOpen={setLightbox} />
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
