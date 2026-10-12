'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { BaseCoverageCategory, BaseCoverageRow } from '../../lib/api/base-catalog';

const ROW_HEIGHT = 36;
const LABEL_WIDTH = 220;
const CELL_WIDTH = 92;

interface CoverageMatrixProps {
  categories: BaseCoverageCategory[];
  rows: BaseCoverageRow[];
  onCellClick: (row: BaseCoverageRow, category: BaseCoverageCategory) => void;
}

export function CoverageMatrix({ categories, rows, onCellClick }: CoverageMatrixProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 450 satır x 34 kategori = 15.300 hücre. Sanallaştırma olmadan ilk boyama saniyeler sürer.
  // React Compiler bu bileşeni optimize etmeden geçiyor (@tanstack/react-virtual fonksiyon
  // döndürüyor) — bilgilendirme, hata değil; bkz. VirtualizedPreviewTable'daki aynı not.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  if (rows.length === 0) {
    return <p className="px-2 py-4 text-sm text-[var(--fg-muted)]">Filtreye uyan satır yok.</p>;
  }

  // min-w-0 ZORUNLU: esnek ögenin varsayılan min-width:auto değeri, 3348px genişliğindeki
  // matris içeriği yüzünden bu kutunun küçülmesini engelliyor ve yan paneli ekranın dışına
  // itiyordu (hücreye tıklanınca panel açılıyor ama görünmüyordu).
  return (
    <div ref={scrollRef} className="min-h-0 min-w-0 flex-1 overflow-auto rounded-[4px] border border-[var(--border-soft)]">
      <div style={{ width: LABEL_WIDTH + categories.length * CELL_WIDTH }}>
        <div className="sticky top-0 z-20 flex bg-[var(--card)]">
          <div
            className="sticky left-0 z-30 shrink-0 border-b border-r border-[var(--border-soft)] bg-[var(--card)] px-2 py-2 text-[11px] font-semibold text-[var(--fg-muted)]"
            style={{ width: LABEL_WIDTH }}
          >
            Marka / Model
          </div>
          {categories.map((category) => (
            <div
              key={category.id}
              title={category.nameEn ?? category.name}
              className="shrink-0 border-b border-r border-[var(--border-soft)] px-2 py-2 text-[11px] font-semibold leading-tight text-[var(--fg-muted)]"
              style={{ width: CELL_WIDTH }}
            >
              {category.name}
            </div>
          ))}
        </div>

        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={`${row.make}__${row.model}`}
                className="absolute left-0 flex"
                style={{ top: virtualRow.start, height: ROW_HEIGHT, width: '100%' }}
              >
                <div
                  className="sticky left-0 z-10 flex shrink-0 items-center gap-1 border-b border-r border-[var(--border-soft)] bg-[var(--card)] px-2 text-xs"
                  style={{ width: LABEL_WIDTH }}
                >
                  <span className="truncate font-medium text-[var(--fg)]">{row.make}</span>
                  <span className="truncate text-[var(--fg-muted)]">{row.model}</span>
                </div>

                {categories.map((category) => {
                  const count = row.counts[String(category.id)] ?? 0;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => onCellClick(row, category)}
                      className={[
                        'shrink-0 cursor-pointer border-b border-r border-[var(--border-soft)] text-xs transition hover:bg-[var(--bg-subtle)]',
                        count > 0 ? 'font-semibold text-[var(--fg)]' : 'text-[var(--fg-subtle)]',
                      ].join(' ')}
                      style={{ width: CELL_WIDTH }}
                    >
                      {count > 0 ? count : '·'}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
