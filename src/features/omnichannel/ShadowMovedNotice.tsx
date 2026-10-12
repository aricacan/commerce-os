'use client';

import { ArrowRight, GitCompare } from 'lucide-react';
import { useOmnichannelNav } from './OmnichannelNavContext';
import { secondaryButtonClass } from './formClasses';

// İzleme'deki eski "Gölge karşılaştırma" yerinde kalan bağlantı: bölüm Kalite Merkezi › Gölge'ye taşındı (FAZ 7.5).
export function ShadowMovedNotice() {
  const { go } = useOmnichannelNav();
  return (
    <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-soft bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <GitCompare size={14} className="text-fg-muted" aria-hidden />
        <span className="text-ui-sm font-semibold text-fg">Gölge karşılaştırma</span>
        <span className="text-ui-xs text-fg-muted">Kalite Merkezi’ne taşındı.</span>
      </div>
      <button type="button" className={secondaryButtonClass} onClick={() => go({ tab: 'quality', sub: 'shadow' })}>
        Kalite Merkezi’nde aç <ArrowRight size={13} aria-hidden />
      </button>
    </section>
  );
}
