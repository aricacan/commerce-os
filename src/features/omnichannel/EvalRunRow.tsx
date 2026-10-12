import type { EvalRunDto } from '../../lib/api/omnichannel-eval';
import { formatTraceTime } from './botTraceRules';
import { EvalQuickScore } from './EvalQuickScore';
import { EvalRunActions } from './EvalRunActions';
import { evalProgressPercent, evalRunStatusChip, evalRunTitle, isEvalRunActive } from './evalRules';
import { meterClass } from './meterClass';
import { ToneChip } from './ToneChip';

const FULL_SCALE = 100;

interface Props {
  run: EvalRunDto;
  // Dış yargıç paketinde kişisel veri maskelensin mi (bölüm başlığındaki seçim).
  maskPii: boolean;
  onChanged: () => Promise<void>;
}

const count = (value: number) => value.toLocaleString('tr-TR');

// Tek koşu kartı: ad, sürüm, durum; ilerleme çubuğu ve hatalı tur sayısı; hata sebebi; hızlı puan; eylemler.
export function EvalRunRow({ run, maskPii, onChanged }: Props) {
  const percent = evalProgressPercent(run);
  const pulse = isEvalRunActive(run) ? 'animate-pulse motion-reduce:animate-none' : '';

  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-xl border border-border-soft bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-ui-sm font-bold text-fg">{evalRunTitle(run)}</span>
            <ToneChip chip={evalRunStatusChip(run.status)} />
            {run.pipelineVersion && (
              <span className="rounded-md bg-bg-subtle px-1.5 py-0.5 text-ui-2xs font-semibold text-fg-muted">{run.pipelineVersion}</span>
            )}
          </div>
          <span className="text-ui-2xs text-fg-subtle">
            {formatTraceTime(run.createdAt)}{run.createdByName ? ` · ${run.createdByName}` : ''} · {count(run.conversations)} konuşma
          </span>
        </div>
        <EvalRunActions run={run} maskPii={maskPii} onChanged={onChanged} />
      </div>

      <div className="flex flex-col gap-1">
        <progress value={percent} max={FULL_SCALE} aria-label={`İlerleme %${percent}`} className={`h-1.5 ${meterClass} ${pulse}`} />
        <div className="flex flex-wrap items-center justify-between gap-2 text-ui-2xs tabular-nums text-fg-muted">
          <span>{count(run.turnsDone)} / {count(run.turnsTotal)} tur · %{percent}</span>
          {run.turnsFailed > 0 && <span className="font-semibold text-danger">{count(run.turnsFailed)} tur hatalı</span>}
        </div>
      </div>

      {run.error && <p role="alert" className="m-0 text-ui-xs text-danger">{run.error}</p>}

      <EvalQuickScore score={run.quickScore} />
    </li>
  );
}
