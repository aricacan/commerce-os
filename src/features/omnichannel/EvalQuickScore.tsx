import type { EvalQuickScoreDto } from '../../lib/api/omnichannel-eval';
import { EVAL_SCORE_DIMENSIONS, formatScore, scoreOf, scorePercent } from './evalRules';
import { meterClass } from './meterClass';

const FULL_SCALE = 100;

// Sunucunun hızlı puanı: tur başarısı + yedi boyut, ince çubuk ve yüzde. Değer yoksa "—".
export function EvalQuickScore({ score }: { score: EvalQuickScoreDto | null }) {
  if (!score) return <p className="m-0 text-ui-2xs text-fg-subtle">Hızlı puan henüz yok.</p>;

  return (
    <ul aria-label="Hızlı puan" className="m-0 grid list-none grid-cols-4 gap-x-3 gap-y-2 p-0 sm:grid-cols-8">
      {EVAL_SCORE_DIMENSIONS.map(({ key, short, label }) => {
        const value = scoreOf(score, key);
        return (
          <li key={key} title={label} className="flex min-w-0 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-ui-2xs font-semibold text-fg-muted">{short}</span>
              <span className="text-ui-2xs font-semibold tabular-nums text-fg">{formatScore(value)}</span>
            </div>
            <progress
              value={scorePercent(value) ?? 0} max={FULL_SCALE} aria-label={`${label}: ${formatScore(value)}`}
              className={`h-1 ${meterClass}`}
            />
          </li>
        );
      })}
    </ul>
  );
}
