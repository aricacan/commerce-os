import { formatGoldDelta, goldDeltaTone, type GoldDeltaTone } from './goldSetRules';

const TONE_CLASS: Record<GoldDeltaTone, string> = {
  up: 'text-success',
  down: 'text-danger',
  flat: 'text-fg-muted',
};

// Puan farkı: yükseliş yeşil, düşüş kırmızı, değişmedi soluk (P35).
export function GoldScoreDelta({ delta }: { delta: number | null }) {
  return <span className={`tabular-nums ${TONE_CLASS[goldDeltaTone(delta)]}`}>{formatGoldDelta(delta)}</span>;
}
