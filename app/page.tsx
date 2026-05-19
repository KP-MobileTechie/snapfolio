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
