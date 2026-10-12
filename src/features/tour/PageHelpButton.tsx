'use client';

import { usePathname } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
import { getPageHelp } from './help-registry';
import { useTourStore } from './tour-store';

interface PageHelpButtonProps {
  pageId?: string;
  className?: string;
  label?: string;
}

export function PageHelpButton({ pageId, className = '', label = 'Rehber' }: PageHelpButtonProps) {
  const pathname = usePathname();
  const targetId = pageId || pathname;
  const helpData = getPageHelp(targetId);
  const openHelpModal = useTourStore((s) => s.openHelpModal);

  if (!helpData) return null;

  return (
    <button
      type="button"
      onClick={() => openHelpModal(helpData)}
      aria-label={`${helpData.title} Rehberi`}
      title={`${helpData.title}: ${helpData.description}`}
      className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[4px] border border-zinc-300 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-2.5 text-xs font-semibold transition-colors shadow-xs ${className}`}
    >
      <HelpCircle size={13} className="text-zinc-500 dark:text-zinc-400" />
      <span>{label}</span>
    </button>
  );
}
