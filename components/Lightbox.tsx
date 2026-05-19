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

  // Focus + scroll lock on mount
  useEffect(() => {
    containerRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Window-level so navigation survives focus moving to the image/backdrop
  // (clicking a non-focusable element can move focus outside the container).
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, onClose]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab') {
      // simple focus trap across the buttons
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
