'use client';

import type { InsightFixRecordDto } from '../../lib/api';
import { InsightFixRecord } from './InsightFixRecord';
import { Panel } from './ui';

// Kısa geçmiş: sunucu son 30 günü verir, burada en yenileri. Tamamı Aktivite Akışı'nda.
const HISTORY_ROWS = 8;

interface Props {
  fixes: readonly InsightFixRecordDto[];
  onUndo: (fixId: number) => void;
  isUndoing: boolean;
}

export function InsightFixHistory({ fixes, onUndo, isUndoing }: Props) {
  if (fixes.length === 0) return null;

  return (
    <Panel title="Uygulanan düzeltmeler">
      <div className="flex flex-col gap-2 p-3">
        {fixes.slice(0, HISTORY_ROWS).map((fix) => (
          <InsightFixRecord key={fix.id} record={fix} onUndo={onUndo} isUndoing={isUndoing} showTitle />
        ))}
      </div>
    </Panel>
  );
}
