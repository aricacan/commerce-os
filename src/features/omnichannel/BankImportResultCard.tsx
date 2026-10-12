import type { BankImportResultDto } from '../../lib/api/omnichannel-bank';
import { bankImportSummary, bankMatchSummary } from './bankMatchRules';

// İçe aktarma sonucu: eklenen/tekrar/giden özeti, eşleşme özeti ve okunamayan satırlar (satır no + neden).
export function BankImportResultCard({ result }: { result: BankImportResultDto }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 text-[11px]">
      <p className="font-semibold text-[var(--fg)]">{bankImportSummary(result)}</p>
      {result.imported > 0 && <p className="text-[var(--fg-muted)]">{bankMatchSummary(result.match)}</p>}
      {result.badRows.length > 0 && (
        <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto text-rose-600 dark:text-rose-400">
          {result.badRows.map((row) => (
            <li key={row.row}>Satır {row.row}: {row.reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
