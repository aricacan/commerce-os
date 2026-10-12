'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BoardColumnDto } from '../../lib/api/omnichannel';
import { focusRing, motionFast } from '../shared/design';
import { BOARD_COLUMN_DOT } from './boardColumnStyle';
import { BOARD_COLUMNS } from './boardColumns';
import type { BoardScroller } from './useBoardScroller';

interface Props {
  columns: BoardColumnDto[];
  scroller: BoardScroller;
}

const ARROW_CLASS =
  `flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-fg shadow-[var(--shadow-xs)] hover:bg-bg-subtle disabled:cursor-default disabled:opacity-35 disabled:shadow-none ${motionFast} ${focusRing}`;

const titleOf = (column: BoardColumnDto | undefined) => BOARD_COLUMNS.find((m) => m.key === column?.column)?.title ?? '';

// Telefonda pano sütun sütun gezilir: her sütun ekran genişliğinde, yanlarda büyük oklar, ortada
// "2/6 · Cevap bekliyor" ve sütun noktaları (dokununca o sütuna atlar). Parmakla kaydırma da çalışır.
export function BoardMobilePager({ columns, scroller }: Props) {
  const current = columns[scroller.index];
  const previousTitle = titleOf(columns[scroller.index - 1]);
  const nextTitle = titleOf(columns[scroller.index + 1]);

  return (
    <nav aria-label="Pano sütunları" className="flex shrink-0 items-center gap-2 border-b border-border-soft bg-card px-3 py-2">
      <button
        type="button"
        onClick={() => scroller.step(-1)}
        disabled={scroller.atStart}
        aria-label={previousTitle ? `Önceki sütun: ${previousTitle}` : 'Önceki sütun'}
        className={ARROW_CLASS}
      >
        <ChevronLeft size={20} aria-hidden />
      </button>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
        <p aria-live="polite" className="m-0 flex min-w-0 max-w-full items-center gap-1.5 text-ui-sm">
          <span className="shrink-0 tabular-nums text-fg-muted">{scroller.index + 1}/{columns.length}</span>
          <span className="truncate font-bold text-fg">{titleOf(current)}</span>
        </p>
        <div className="flex items-center">
          {columns.map((column, i) => (
            <button
              key={column.column}
              type="button"
              onClick={() => scroller.goTo(i)}
              aria-label={`${titleOf(column)} sütununa git`}
              aria-current={i === scroller.index ? 'true' : undefined}
              className={`flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 ${focusRing}`}
            >
              <span
                aria-hidden
                className={`h-2 rounded-full transition-[width,background-color] duration-200 ease-out motion-reduce:transition-none ${
                  i === scroller.index ? `w-4 ${BOARD_COLUMN_DOT[column.column]}` : 'w-2 bg-border'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => scroller.step(1)}
        disabled={scroller.atEnd}
        aria-label={nextTitle ? `Sonraki sütun: ${nextTitle}` : 'Sonraki sütun'}
        className={ARROW_CLASS}
      >
        <ChevronRight size={20} aria-hidden />
      </button>
    </nav>
  );
}
