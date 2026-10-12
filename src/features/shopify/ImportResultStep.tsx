'use client';

import { Download } from 'lucide-react';
import { IMPORT_OUTCOME, type ImportOutcome, type ShopifyImportResultDto } from '../../lib/api/shopify-import';
import { downloadCsvFile } from '../../lib/export';
import type { BadgeTone } from '../shared/design';
import { RESULT_COLUMNS, resultsToExportRows } from './importRules';
import { StatusBadge } from './StatusBadge';
import { ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  result: ShopifyImportResultDto;
  onDone: () => void;
}

const OUTCOME_META: Record<ImportOutcome, { label: string; tone: BadgeTone }> = {
  [IMPORT_OUTCOME.Applied]: { label: 'Başarılı', tone: 'success' },
  [IMPORT_OUTCOME.Skipped]: { label: 'Atlandı', tone: 'neutral' },
  [IMPORT_OUTCOME.Failed]: { label: 'Başarısız', tone: 'danger' },
};

const REPORT_FILE_NAME = 'shopify-ice-aktarma-sonucu.csv';

// Sonuç raporu: satır bazında başarılı / atlanan / başarısız; CSV olarak indirilebilir.
export function ImportResultStep({ result, onDone }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone="success" label={`${result.applied} başarılı`} />
        <StatusBadge tone="neutral" label={`${result.skipped} atlandı`} />
        <StatusBadge tone="danger" label={`${result.failed} başarısız`} />
      </div>
      <div className="max-h-80 overflow-auto rounded-md border border-border-soft">
        <table className="w-full min-w-[32rem] border-collapse text-left text-ui-xs">
          <thead className="sticky top-0 bg-bg-subtle text-ui-2xs text-fg-muted">
            <tr><th className="px-2 py-1.5">Satır</th><th className="px-2 py-1.5">SKU</th><th className="px-2 py-1.5">Sonuç</th><th className="px-2 py-1.5">Mesaj</th></tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.rowNumber} className="border-t border-border-soft align-top">
                <td className="px-2 py-1.5 text-fg-muted">{row.rowNumber}</td>
                <td className="px-2 py-1.5 font-semibold text-fg">{row.sku ?? '—'}</td>
                <td className="px-2 py-1.5"><StatusBadge label={OUTCOME_META[row.outcome].label} tone={OUTCOME_META[row.outcome].tone} /></td>
                <td className="break-words px-2 py-1.5">{row.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={ghostButtonClass} onClick={() => downloadCsvFile(REPORT_FILE_NAME, resultsToExportRows(result), RESULT_COLUMNS)}>
          <Download size={14} aria-hidden /> Raporu CSV indir
        </button>
        <button type="button" className={primaryButtonClass} onClick={onDone}>Yeni içe aktarma</button>
      </div>
    </div>
  );
}
