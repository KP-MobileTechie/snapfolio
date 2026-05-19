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
