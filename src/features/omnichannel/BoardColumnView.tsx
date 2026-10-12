'use client';

import { useDroppable } from '@dnd-kit/core';
import { Inbox } from 'lucide-react';
import type { BoardColumnDto, BoardColumnKey, ConversationSummaryDto } from '../../lib/api/omnichannel';
import { motionFast } from '../shared/design';
import { BoardCard } from './BoardCard';
import { BOARD_COLUMN_DOT } from './boardColumnStyle';
import { BOARD_COLUMNS, dropDeniedReason } from './boardColumns';

interface Props {
  column: BoardColumnDto;
  brandNames: Map<number, string>;
  selectedId: number | null;
  // Sürüklenen kart (yoksa null): sütun bırakılabilir mi diye kendini boyar.
  dragged: ConversationSummaryDto | null;
  // Telefonda sütun ekran genişliğindedir (kaydırma sütun sütun oturur) ve sürükleme kapalıdır.
  isMobile: boolean;
  onSelect: (conversation: ConversationSummaryDto) => void;
  onMove: (conversation: ConversationSummaryDto, target: BoardColumnKey) => void;
}

// Sürükleme sırasında sütunun aldığı üç durum: üzerinde (bırakılırsa girer), aday (bırakılabilir),
// yasak (bırakılamaz, soluklaşır). Sürükleme yokken sütun sakin durur.
function dropStateClass(droppable: boolean, isOver: boolean, denied: boolean): string {
  if (droppable && isOver) return 'border-fg/50 bg-fg/5 ring-2 ring-fg/15';
  if (droppable) return 'border-dashed border-fg-subtle';
  if (denied) return 'border-border-soft opacity-50';
  return 'border-border-soft';
}

// Bir pano sütunu (P30): başlık + kısa açıklama + toplam + kartlar. Sütun toplamı gösterilenden
// büyükse (ilk 50 kart) "daha fazlası" notu çıkar; filtreler sütunu daraltır.
export function BoardColumnView({ column, brandNames, selectedId, dragged, isMobile, onSelect, onMove }: Props) {
  const meta = BOARD_COLUMNS.find((m) => m.key === column.column);
  const { setNodeRef, isOver } = useDroppable({ id: column.column });
  const denied = dragged ? dropDeniedReason(dragged.stage, column.column) : null;
  const droppable = dragged !== null && denied === null;
  // Telefonda kaydırma kutusu sütunun kendisi değil, onu saran tam genişlikli yuva: boşluk yuvanın içinde.
  const slotClass = isMobile ? 'flex w-full shrink-0 snap-center snap-always p-3' : 'flex shrink-0';

  return (
    <div className={slotClass}>
      <section
        ref={setNodeRef}
        aria-label={meta?.title}
        title={dragged && denied ? denied : undefined}
        className={`flex min-h-0 flex-col rounded-2xl border bg-bg-subtle/60 ${isMobile ? 'w-full' : 'w-[300px]'} ${motionFast} ${dropStateClass(droppable, isOver, denied !== null)}`}
      >
        <header className="flex flex-col gap-0.5 px-4 pb-2 pt-3">
          <div className="flex items-center gap-2">
            <span aria-hidden className={`size-2 shrink-0 rounded-full ${BOARD_COLUMN_DOT[column.column]}`} />
            <h3 className="m-0 min-w-0 flex-1 truncate text-ui-sm font-bold text-fg">{meta?.title}</h3>
            <span
              className="rounded-full bg-card px-2 py-0.5 text-ui-xs font-semibold tabular-nums text-fg-muted shadow-[var(--shadow-xs)]"
              aria-label={`${column.total} konuşma`}
            >
              {column.total}
            </span>
          </div>
          {meta?.hint && <p className="m-0 truncate pl-4 text-ui-xs text-fg-muted" title={meta.hint}>{meta.hint}</p>}
        </header>
        <div className="flex min-h-[96px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
          {column.conversations.length === 0 && <EmptyColumn dropTarget={droppable} />}
          {column.conversations.map((c) => (
            <BoardCard
              key={c.id}
              conversation={c}
              brandName={brandNames.get(c.channelId)}
              selected={c.id === selectedId}
              dragDisabled={isMobile}
              onSelect={onSelect}
              onMove={onMove}
            />
          ))}
          {column.total > column.conversations.length && (
            <p className="m-0 px-1 py-2 text-center text-ui-xs text-fg-muted">
              +{column.total - column.conversations.length} konuşma daha — filtreyle daraltın
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyColumn({ dropTarget }: { dropTarget: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-6 text-center text-fg-subtle">
      <Inbox size={16} aria-hidden />
      <p className="m-0 text-ui-xs">{dropTarget ? 'Buraya bırakın' : 'Bu sütunda konuşma yok'}</p>
    </div>
  );
}
