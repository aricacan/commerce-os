import { badgeBase, badgeTone } from '../shared/design';
import type { BadgeTone } from '../shared/design';

interface Props {
  label: string;
  tone: BadgeTone;
}

export function StatusBadge({ label, tone }: Props) {
  return <span className={`${badgeBase} ${badgeTone[tone]}`}>{label}</span>;
}
