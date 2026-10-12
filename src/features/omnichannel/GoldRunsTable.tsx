import type { GoldRunSummaryDto } from '../../lib/api/omnichannel-gold';
import { GoldScoreDelta } from './GoldScoreDelta';
import { formatGoldScore, GOLD_RUN_STATUS_LABELS, goldRunStatus, goldVersionLabel, type GoldRunStatus } from './goldSetRules';
import { shortDate } from './overviewRules';

interface Props {
  runs: readonly GoldRunSummaryDto[];
  selectedRunId: number | null;
  onSelect: (runId: number) => void;
}

const STATUS_CLASS: Record<GoldRunStatus, string> = {
  running: 'bg-bg-subtle text-fg-muted',
  passed: 'bg-success-soft text-success',
  blocked: 'bg-danger-soft text-danger',
};

// Son koşular: ortalama, önceki koşuya göre fark ve kapı durumu. Satıra basınca koşu ayrıntısı açılır (P35).
export function GoldRunsTable({ runs, selectedRunId, onSelect }: Props) {
  if (runs.length === 0) {
    return <p className="m-0 text-ui-xs text-fg-muted">Henüz koşu yok. "Şimdi koştur" ile ilk koşuyu başlatın.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-soft bg-card">
      <table className="w-full min-w-[520px] border-collapse text-left text-ui-xs">
        <thead>
          <tr className="border-b border-border-soft text-fg-muted">
            <th className="px-3 py-2 font-semibold">Tarih</th>
            <th className="px-3 py-2 font-semibold">Sürüm</th>
            <th className="px-3 py-2 text-right font-semibold">Ortalama</th>
            <th className="px-3 py-2 text-right font-semibold">Fark</th>
            <th className="px-3 py-2 text-right font-semibold">Senaryo</th>
            <th className="px-3 py-2 font-semibold">Kapı</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const status = goldRunStatus(run);
            return (
              <tr
                key={run.id} onClick={() => onSelect(run.id)} aria-selected={run.id === selectedRunId}
                className={`cursor-pointer border-b border-border-soft last:border-b-0 hover:bg-bg-subtle ${
                  run.id === selectedRunId ? 'bg-bg-subtle' : ''
                }`}
              >
                <td className="px-3 py-2 text-fg">{shortDate(run.startedAt)}</td>
                <td className="max-w-40 truncate px-3 py-2 text-fg-muted">{goldVersionLabel(run)}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-fg">{formatGoldScore(run.averageScore)}</td>
                <td className="px-3 py-2 text-right"><GoldScoreDelta delta={run.delta} /></td>
                <td className="px-3 py-2 text-right tabular-nums text-fg-muted">
                  {run.scenarioCount}
                  {run.judgeFailedCount > 0 && <span title="Yargıcı cevap vermeyen senaryo"> ({run.judgeFailedCount} puansız)</span>}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 font-semibold ${STATUS_CLASS[status]}`}>{GOLD_RUN_STATUS_LABELS[status]}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
