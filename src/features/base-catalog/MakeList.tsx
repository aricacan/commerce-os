'use client';

import { Search } from 'lucide-react';
import type { BaseCatalogMake } from '../../lib/api/base-catalog';

interface MakeListProps {
  makes: BaseCatalogMake[];
  selected: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (make: string) => void;
}

export function MakeList({ makes, selected, search, onSearchChange, onSelect }: MakeListProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Marka ara"
          className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] py-1.5 pl-7 pr-2 text-sm text-[var(--fg)] outline-none focus:border-[var(--fg-muted)]"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {makes.map((make) => {
          const active = make.make === selected;
          return (
            <button
              key={make.make}
              type="button"
              onClick={() => onSelect(make.make)}
              className={[
                'flex cursor-pointer items-center justify-between gap-2 rounded-[4px] px-2 py-1.5 text-left text-sm transition',
                active ? 'bg-[var(--bg-subtle)] font-semibold' : 'hover:bg-[var(--bg-subtle)]',
                make.isBucket ? 'text-[var(--fg-subtle)]' : 'text-[var(--fg)]',
              ].join(' ')}
            >
              <span className="truncate">{make.make}</span>
              <span className="shrink-0 rounded-[4px] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--fg-muted)]">
                {make.productCount}
              </span>
            </button>
          );
        })}

        {makes.length === 0 && (
          <p className="px-2 py-4 text-sm text-[var(--fg-muted)]">Eşleşen marka yok.</p>
        )}
      </div>
    </div>
  );
}
