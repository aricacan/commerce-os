'use client';

import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useOmnichannelNav } from './OmnichannelNavContext';
import type { NavigationTarget } from './useOmnichannelNavigation';

interface Props {
  target: NavigationTarget;
  children: ReactNode;
  className?: string;
}

// Başka bir ayar ekranına giden metin bağlantısı (Kanal Merkezi'nden "tüm kanallar" görünümüne vb.).
export function SettingsLink({ target, children, className = '' }: Props) {
  const { go } = useOmnichannelNav();
  return (
    <button
      type="button"
      onClick={() => go(target)}
      className={`inline-flex cursor-pointer items-center gap-1 text-left text-[11px] font-semibold text-[var(--fg)] underline-offset-2 hover:underline ${className}`}
    >
      {children}
      <ArrowUpRight size={11} aria-hidden className="shrink-0" />
    </button>
  );
}
