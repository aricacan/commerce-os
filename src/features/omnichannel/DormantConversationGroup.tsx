'use client';

import { useId, useState, type ReactNode } from 'react';
import { Archive, ChevronDown } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';

interface Props {
  count: number;
  // Seçili konuşma bu grupta: grup kapalı kalıp seçimi gizlemesin.
  containsSelected: boolean;
  children: ReactNode;
}

// Uykudaki ("Eski") konuşmaların katlı grubu. Varsayılan kapalı: canlı konuşmalar önce görünür,
// eskiler bir tıkla açılır.
export function DormantConversationGroup({ count, containsSelected, children }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const expanded = open || containsSelected;

  return (
    <section aria-label="Eski konuşmalar">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={`flex w-full cursor-pointer items-center gap-2 border-0 border-b border-border-soft bg-bg-subtle/50 px-4 py-2.5 text-left text-ui-sm font-semibold text-fg-muted hover:text-fg ${motionFast} ${focusRing} focus-visible:ring-inset`}
      >
        <Archive size={13} aria-hidden />
        <span className="flex-1">Eski konuşmalar</span>
        <span className="tabular-nums">{count}</span>
        <ChevronDown size={14} aria-hidden className={`transition-transform duration-150 motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <div id={panelId} hidden={!expanded}>{children}</div>
    </section>
  );
}
