'use client';

import { HelpCircle } from 'lucide-react';
import { getPageHelp } from './help-registry';
import { useTourStore } from './tour-store';

interface SidebarHelpIconProps {
  href: string;
}

export function SidebarHelpIcon({ href }: SidebarHelpIconProps) {
  const help = getPageHelp(href);
  const openHelpModal = useTourStore((s) => s.openHelpModal);

  if (!help) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openHelpModal(help);
      }}
      title={`${help.title} — ${help.description}`}
      aria-label={`${help.title} yardımı`}
      className="ml-auto inline-flex items-center justify-center w-4 h-4 rounded-[2px] opacity-35 hover:opacity-100 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-opacity flex-shrink-0 cursor-pointer"
    >
      <HelpCircle size={11} />
    </button>
  );
}
