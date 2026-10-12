import { Timer } from 'lucide-react';
import { badgeBase, badgeTone, type BadgeTone } from '../shared/design';
import { slaCountdown, type SlaState } from './handoffRules';

interface Props {
  dueAt: string | null | undefined;
  breachedAt: string | null | undefined;
  now: number;
}

const TONE: Record<Exclude<SlaState, 'none'>, BadgeTone> = { ok: 'neutral', soon: 'warning', overdue: 'danger' };

// İlk cevap SLA geri sayımı (mesai saatine göre vade sunucudan gelir). Vade yoksa hiçbir şey çizilmez.
export function SlaBadge({ dueAt, breachedAt, now }: Props) {
  const countdown = slaCountdown(dueAt, breachedAt, now);
  if (countdown.state === 'none') return null;
  return (
    <span className={`${badgeBase} ${badgeTone[TONE[countdown.state]]} tabular-nums`} title="İlk cevap süresi (mesai saatine göre)">
      <Timer size={11} aria-hidden />
      {countdown.label}
    </span>
  );
}
