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
