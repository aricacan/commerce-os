import type { HistoryImportResultDto } from '../../lib/api/omnichannel';
import { historyImportSummary } from './historyImportSummary';
import type { ImportState } from './useHistoryImport';

const VISIBLE_WARNING_COUNT = 3;

// Geçmiş aktarma ilerlemesi / sonucu — kartın altında, menüden başlatılan işin geri bildirimi.
export function HistoryImportStatus({ state }: { state: ImportState }) {
  if (state.kind === 'idle') return null;
  if (state.kind === 'running') {
    return (
      <p className="text-ui-xs text-[var(--fg-muted)]" role="status">
        {state.progress ?? 'Geçmiş aktarılıyor…'}
      </p>
    );
  }
  if (state.kind === 'failed') return <p className="text-ui-xs text-[var(--danger)]">{state.message}</p>;
  return <HistoryImportResult result={state.result} />;
}

function HistoryImportResult({ result }: { result: HistoryImportResultDto }) {
  const extraWarnings = result.warnings.length - VISIBLE_WARNING_COUNT;
  return (
    <div className="flex flex-col gap-1 text-ui-xs text-[var(--fg-muted)]">
      <span>{historyImportSummary(result)}</span>
      {result.isPartial && (
        <span className="text-[var(--warning)]">
          Kısmen tamamlandı — eklenenler kaydedildi, tekrar çalıştırmak kalanı getirir.
          {result.partialReason && ` (${result.partialReason})`}
        </span>
      )}
      {result.warnings.slice(0, VISIBLE_WARNING_COUNT).map((warning) => (
        <span key={warning} className="text-[var(--warning)]">{warning}</span>
      ))}
      {extraWarnings > 0 && <span>+{extraWarnings} uyarı daha</span>}
    </div>
  );
}
