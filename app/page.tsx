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
