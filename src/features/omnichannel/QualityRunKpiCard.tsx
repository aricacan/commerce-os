import type { QualityRunKpiDto } from '../../lib/api/omnichannel-quality';
import { formatDuration, formatTraceTime } from './botTraceRules';
import { EvalQuickScore } from './EvalQuickScore';
import { formatScore } from './evalRules';
import { targetGapLabel } from './qualityCenterRules';

const count = (value: number) => value.toLocaleString('tr-TR');

// Bir sürümün son tamamlanmış koşusu: tur başarısı (hedefe uzaklık), yedi boyut ve iz göstergeleri.
export function QualityRunKpiCard({ run, target }: { run: QualityRunKpiDto; target: number }) {
  const success = run.quickScore?.turnSuccess ?? null;
  const onTarget = success !== null && success >= target;

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-border-soft bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-bg-subtle px-1.5 py-0.5 text-ui-2xs font-semibold text-fg-muted">{run.pipelineVersion}</span>
            <span className="truncate text-ui-sm font-bold text-fg">{run.name}</span>
          </div>
          <span className="text-ui-2xs text-fg-subtle">
            {run.completedAt ? formatTraceTime(run.completedAt) : '—'} · {count(run.turnsDone)} tur
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className={`text-ui-xl font-bold tabular-nums ${onTarget ? 'text-success' : 'text-fg'}`}>{formatScore(success)}</span>
          <span className="text-ui-2xs text-fg-muted">{targetGapLabel(success, target)}</span>
        </div>
      </div>

      <EvalQuickScore score={run.quickScore} />

      <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Devir oranı" value={formatScore(run.handoffRate)} />
        <Metric label="Bastırılan tekrar" value={count(run.duplicateSuppressed)} />
        <Metric label="Ort. gecikme" value={formatDuration(run.avgLatencyMs)} />
        <Metric label="Jeton / tur" value={run.tokensPerTurn === null ? '—' : count(run.tokensPerTurn)} />
      </dl>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-bg-subtle px-2.5 py-2">
      <dt className="text-ui-2xs font-semibold uppercase text-fg-muted">{label}</dt>
      <dd className="m-0 text-ui-sm font-bold tabular-nums text-fg">{value}</dd>
    </div>
  );
}
