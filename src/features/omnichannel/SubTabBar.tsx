'use client';

import { HorizontalScroller } from './HorizontalScroller';

export interface SubTabOption {
  key: string;
  label: string;
}

interface Props {
  tabs: readonly SubTabOption[];
  active: string;
  onChange: (key: string) => void;
  ariaLabel: string;
}

// Birleşik ayar sayfalarının alt sekmeleri. Dar ekranda yatay kayar, alt çizgi etkin sekmeyi gösterir.
export function SubTabBar({ tabs, active, onChange, ariaLabel }: Props) {
  return (
    <div className="min-w-0 border-b border-[var(--border-soft)] bg-[var(--card)] px-4 sm:px-5">
      <HorizontalScroller ariaLabel={ariaLabel} className="" fadeFromClass="from-[var(--card)]">
        <div role="tablist" aria-label={ariaLabel} className="flex items-center gap-1">
          {tabs.map((tab) => {
            const selected = tab.key === active;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onChange(tab.key)}
                className={`h-10 shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-3 text-xs font-semibold transition-colors ${
                  selected
                    ? 'border-[var(--fg)] text-[var(--fg)]'
                    : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </HorizontalScroller>
    </div>
  );
}
