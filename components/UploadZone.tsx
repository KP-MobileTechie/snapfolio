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
          . Uploads land in a public sandbox and stay on this device&apos;s gallery only.
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
