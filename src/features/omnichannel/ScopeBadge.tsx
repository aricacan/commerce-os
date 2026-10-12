import { badgeBase, badgeTone, type BadgeTone } from '../shared/design';

interface Props {
  label: string;
  tone?: BadgeTone;
  /** Fare üstünde: rozetin kaynağı. */
  title?: string;
}

// "Bu değer nereden geliyor?" rozeti (Genel / Marka + ülke / Bu kanala özel…).
export function ScopeBadge({ label, tone = 'neutral', title }: Props) {
  return <span className={`${badgeBase} ${badgeTone[tone]}`} title={title}>{label}</span>;
}
