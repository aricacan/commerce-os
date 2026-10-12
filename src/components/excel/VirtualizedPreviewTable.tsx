'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

type PreviewRow = Record<string, unknown>;

interface VirtualizedPreviewTableProps {
  rows: PreviewRow[];
  columns: string[];
  accentColor?: string;
}

const ROW_HEIGHT = 34;
const VIRTUALIZATION_THRESHOLD = 50;

export function VirtualizedPreviewTable({ rows, columns }: VirtualizedPreviewTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // React Compiler bu bileseni optimize ETMEDEN geciyor: @tanstack/react-virtual
  // fonksiyon dondurdugu icin derleyici memoize edemiyor. Bir HATA degil, bilgilendirme —
  // ve sanallastirmayi birakmadan giderilemez (buyuk onizleme tablolarinda sart).
  // Kutuphane derleyici uyumlulugu eklediginde bu satir kaldirilabilir.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    enabled: rows.length > VIRTUALIZATION_THRESHOLD,
  });
  const gridTemplateColumns = `repeat(${columns.length}, minmax(140px, 1fr))`;
  const minimumWidth = Math.max(700, columns.length * 140);
  const virtualRows = rows.length > VIRTUALIZATION_THRESHOLD
    ? virtualizer.getVirtualItems()
    : rows.map((_, index) => ({ index, start: index * ROW_HEIGHT, size: ROW_HEIGHT, key: index }));
  const contentHeight = rows.length > VIRTUALIZATION_THRESHOLD
    ? virtualizer.getTotalSize()
    : rows.length * ROW_HEIGHT;

  return (
    <div
      ref={scrollRef}
      className="max-h-[480px] overflow-auto rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] text-xs shadow-xs"
    >
      <div style={{ minWidth: minimumWidth }}>
        <div
          style={{ gridTemplateColumns }}
          className="sticky top-0 z-10 grid border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/80 backdrop-blur-xs text-[10.5px] font-bold text-[var(--fg-muted)] uppercase tracking-wider"
        >
          {columns.map((column) => (
            <div key={column} role="columnheader" className="p-2.5 px-3 whitespace-nowrap truncate">
              {column}
            </div>
          ))}
        </div>
        <div role="rowgroup" style={{ height: contentHeight, position: 'relative' }}>
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                role="row"
                style={{
                  gridTemplateColumns,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`grid items-center border-b border-[var(--border-soft)] px-1 transition hover:bg-[var(--bg-subtle)]/40 ${
                  virtualRow.index % 2 === 1 ? 'bg-[var(--bg-subtle)]/15' : ''
                }`}
              >
                {columns.map((column) => {
                  const val = row ? row[column] : undefined;
                  const display = val === null || val === undefined ? '—' : String(val);
                  return (
                    <div key={column} role="cell" className="p-1 px-3 text-xs text-[var(--fg)] truncate">
                      {display}
                    </div>
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
