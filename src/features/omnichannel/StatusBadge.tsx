import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { badgeBase, badgeTone, type BadgeTone } from '../shared/design';

interface Props {
  tone: BadgeTone;
  Icon?: LucideIcon;
  title?: string;
  children: ReactNode;
}

// Gelen kutusu ve pano rozetlerinin tek biçimi: sakin, küçük, yalnız tema durum renkleri.
export function StatusBadge({ tone, Icon, title, children }: Props) {
  return (
    <span title={title} className={`${badgeBase} ${badgeTone[tone]}`}>
      {Icon && <Icon size={10} aria-hidden />}
      {children}
    </span>
  );
}
