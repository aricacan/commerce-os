'use client';

import { Undo2 } from 'lucide-react';
import type { InsightFixRecordDto } from '../../lib/api';
import { FIX_STATUS_LABELS, FIX_STATUS_TONES } from './insights';
import { formatRelative } from './format';
import { Pill, useNow } from './ui';

interface Props {
  record: InsightFixRecordDto;
  onUndo: (fixId: number) => void;
  isUndoing: boolean;
  /** Geçmiş listesinde düzeltmenin adı da gösterilir; kartta zaten bağlam var. */
  showTitle?: boolean;
}

// Uygulanan bir düzeltmenin sonucu: durum, sunucunun sonuç mesajı, kim/ne zaman ve (geri
// alınabiliyorsa) "Geri al". Kartta son sonuç, Öneriler'in altındaki geçmişte satır olarak.
export function InsightFixRecord({ record, onUndo, isUndoing, showTitle = false }: Props) {
  const now = useNow();

  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 py-2 text-xs sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={FIX_STATUS_TONES[record.status]}>{FIX_STATUS_LABELS[record.status]}</Pill>
          {showTitle ? <span className="min-w-0 break-words font-semibold text-[var(--fg)]">{record.title}</span> : null}
        </div>
        <p className="break-words text-[var(--fg)]">{record.message}</p>
        <p className="text-ui-2xs text-[var(--fg-muted)]">
          {record.appliedBy ? `${record.appliedBy} · ` : ''}
          {formatRelative(record.appliedAt, now)}
          {record.undoneAt ? ` · geri alındı ${formatRelative(record.undoneAt, now)}` : ''}
        </p>
      </div>
      {record.canUndo ? (
        <button
          type="button"
          onClick={() => onUndo(record.id)}
          disabled={isUndoing}
          className="flex h-8 shrink-0 items-center gap-1.5 self-start rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] disabled:opacity-60 sm:self-center"
        >
          <Undo2 size={13} /> Geri al
        </button>
      ) : null}
    </div>
  );
}
