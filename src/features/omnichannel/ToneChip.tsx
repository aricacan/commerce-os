import { badgeBase, badgeTone } from '../shared/design';
import type { ChipStyle } from './evalRules';

// Durum çipi: etiket ve ton saf kurallardan gelir (koşu durumu, tur sonucu, mod).
export function ToneChip({ chip }: { chip: ChipStyle }) {
  return <span className={`${badgeBase} ${badgeTone[chip.tone]}`}>{chip.label}</span>;
}
