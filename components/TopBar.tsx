'use client';

export type View = 'grid' | 'map';

interface Props {
  view: View;
  count: number;
  onViewChange: (view: View) => void;
  onUploadClick: () => void;
  uploadsEnabled: boolean;
}

const tab =
  'rounded-full px-4 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)]';

export function TopBar({ view, count, onViewChange, onUploadClick, uploadsEnabled }: Props) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-4">
      <div>
        <h1 className="text-3xl font-light tracking-wide">snapfolio</h1>
        <p className="mt-1 text-sm text-[var(--fg-dim)]">
          a travel photo wall · {count} photos
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2 rounded-full bg-[var(--surface)] p-1">
        {(['grid', 'map'] as const).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            aria-pressed={view === v}
            className={`${tab} ${view === v ? 'bg-[var(--fg)] text-[var(--bg)]' : 'text-[var(--fg-dim)] hover:text-[var(--fg)]'}`}
          >
            {v}
          </button>
        ))}
      </div>
      <button
        onClick={onUploadClick}
        title={uploadsEnabled ? 'Upload photos' : 'Uploads disabled — Cloudinary preset not configured'}
        disabled={!uploadsEnabled}
        className={`${tab} border border-[var(--fg-dim)]/40 text-[var(--fg)] hover:border-[var(--fg)] disabled:opacity-40`}
      >
        + upload
      </button>
    </div>
  );
}
