'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { IMPORT_ROW_STATE, type ImportRowState, type ShopifyImportPreviewDto, type ShopifyImportRowPreviewDto } from '../../lib/api/shopify-import';
import type { BadgeTone } from '../shared/design';
import { StatusBadge } from './StatusBadge';
import { ghostButtonClass, primaryButtonClass } from './styles';
import { CheckboxField } from './FormControls';

interface Props {
  preview: ShopifyImportPreviewDto;
  busy: boolean;
  onApply: (confirmLargePriceChange: boolean) => void;
  onBack: () => void;
}

const STATE_META: Record<ImportRowState, { label: string; tone: BadgeTone }> = {
  [IMPORT_ROW_STATE.Unchanged]: { label: 'Değişmeyecek', tone: 'neutral' },
  [IMPORT_ROW_STATE.WillUpdate]: { label: 'Güncellenecek', tone: 'success' },
  [IMPORT_ROW_STATE.Invalid]: { label: 'Hatalı', tone: 'danger' },
  [IMPORT_ROW_STATE.UnmatchedSku]: { label: 'SKU bulunamadı', tone: 'warning' },
};

// Önizleme: her satır için mevcut → yeni fark. Fiyat güvenlik eşiğini aşan satırlar kırmızı; uygulama için açık onay gerekir.
export function ImportPreviewStep({ preview, busy, onApply, onBack }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const needsConfirmation = preview.requiringConfirmation > 0;
  const canApply = preview.willUpdate > 0 && (!needsConfirmation || confirmed);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone="success" label={`${preview.willUpdate} güncellenecek`} />
        <StatusBadge tone="neutral" label={`${preview.unchanged} değişmeyecek`} />
        <StatusBadge tone="warning" label={`${preview.unmatchedSku} SKU bulunamadı`} />
        <StatusBadge tone="danger" label={`${preview.invalid} hatalı`} />
      </div>

      {needsConfirmation && (
        <div role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-ui-xs text-danger">
          <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <strong>{preview.requiringConfirmation} satırda fiyat değişimi mağazanın güvenlik eşiğini aşıyor.</strong>
            <CheckboxField checked={confirmed} onChange={setConfirmed}>
              Kırmızı satırları kontrol ettim; büyük fiyat değişikliklerini onaylıyorum.
            </CheckboxField>
          </span>
        </div>
      )}

      <div className="max-h-96 overflow-auto rounded-md border border-border-soft">
        <table className="w-full min-w-[40rem] border-collapse text-left text-ui-xs">
          <thead className="sticky top-0 bg-bg-subtle text-ui-2xs text-fg-muted">
            <tr>
              <th className="px-2 py-1.5">Satır</th>
              <th className="px-2 py-1.5">SKU</th>
              <th className="px-2 py-1.5">Durum</th>
              <th className="px-2 py-1.5">Mevcut → yeni</th>
            </tr>
          </thead>
          <tbody>{preview.rows.map((row) => <PreviewRow key={row.rowNumber} row={row} />)}</tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButtonClass} disabled={busy || !canApply} onClick={() => onApply(confirmed)}>
          {preview.willUpdate} satırı uygula
        </button>
        <button type="button" className={ghostButtonClass} disabled={busy} onClick={onBack}>Eşlemeye dön</button>
      </div>
    </div>
  );
}

function PreviewRow({ row }: { row: ShopifyImportRowPreviewDto }) {
  const meta = STATE_META[row.state];
  return (
    <tr className={`border-t border-border-soft align-top ${row.requiresConfirmation ? 'bg-danger-soft' : ''}`}>
      <td className="px-2 py-1.5 text-fg-muted">{row.rowNumber}</td>
      <td className="px-2 py-1.5 font-semibold text-fg">
        {row.sku ?? '—'}
        {row.productTitle && <span className="block text-ui-2xs font-normal text-fg-muted">{row.productTitle}</span>}
      </td>
      <td className="px-2 py-1.5"><StatusBadge label={meta.label} tone={meta.tone} /></td>
      <td className="px-2 py-1.5">
        {row.message && <span className={row.requiresConfirmation ? 'text-danger' : 'text-fg-muted'}>{row.message}</span>}
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {row.changes.map((change) => (
            <li key={change.field} className="break-words">
              <span className="text-fg-muted">{change.field}:</span> {change.current ?? '—'} → <strong>{change.proposed ?? '—'}</strong>
            </li>
          ))}
        </ul>
      </td>
    </tr>
  );
}
