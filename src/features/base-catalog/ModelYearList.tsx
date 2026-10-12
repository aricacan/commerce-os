'use client';

import type { ModelYearEntry } from './base-catalog-view';

interface ModelYearListProps {
  entries: ModelYearEntry[];
  selected: ModelYearEntry | null;
  onSelect: (entry: ModelYearEntry) => void;
}

export function ModelYearList({ entries, selected, onSelect }: ModelYearListProps) {
  if (entries.length === 0) {
    return <p className="px-2 py-4 text-sm text-[var(--fg-muted)]">Önce soldan bir marka seç.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-0.5 overflow-y-auto">
      {entries.map((entry) => {
        const active = selected?.model === entry.model && selected?.year === entry.year;
        return (
          <button
            key={`${entry.model}__${entry.year}`}
            type="button"
            onClick={() => onSelect(entry)}
            className={[
              'flex cursor-pointer items-center justify-between gap-3 rounded-[4px] px-2 py-1.5 text-left text-sm transition',
              active ? 'bg-[var(--bg-subtle)] font-semibold' : 'hover:bg-[var(--bg-subtle)]',
            ].join(' ')}
          >
            <span className={entry.modelIsBucket ? 'truncate text-[var(--fg-subtle)]' : 'truncate text-[var(--fg)]'}>
              {entry.model}
            </span>
            <span className={entry.yearIsBucket ? 'shrink-0 text-[11px] text-[var(--fg-subtle)]' : 'shrink-0 text-[11px] text-[var(--fg-muted)]'}>
              {entry.year} · {entry.productCount}
            </span>
          </button>
        );
      })}
    </div>
  );
}
