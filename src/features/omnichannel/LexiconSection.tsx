'use client';

import { useState } from 'react';
import { BookA } from 'lucide-react';
import { LEXICON_TABS, type LexiconTabKey } from './lexiconRules';
import { LexiconCandidatesPanel } from './LexiconCandidatesPanel';
import { LexiconTermsPanel } from './LexiconTermsPanel';

const chipClass = (active: boolean) =>
  `inline-flex h-7 items-center rounded-full border px-2.5 text-ui-xs font-semibold transition-colors ${
    active ? 'border-fg bg-fg text-bg' : 'border-border-soft text-fg-muted hover:bg-bg-subtle hover:text-fg'
  }`;

// Kalite Merkezi › Sözlük (FAZ 6.4): botun müşteri yazımlarını (ağız, yazım hatası, parça adı) öğrendiği sözlük.
// Adaylar konuşmalardan kendiliğinden toplanır; onaylanan aday hesabın sözlüğüne girer, bot bir sonraki turda kullanır.
export function LexiconSection() {
  const [tab, setTab] = useState<LexiconTabKey>('candidates');

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <BookA size={14} className="text-fg-muted" aria-hidden />
        <h3 className="m-0 text-ui-sm font-bold text-fg">Sözlük</h3>
      </div>
      <div role="tablist" aria-label="Sözlük bölümleri" className="flex flex-wrap gap-1.5">
        {LEXICON_TABS.map((item) => (
          <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className={chipClass(tab === item.key)} onClick={() => setTab(item.key)}>
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'candidates' ? <LexiconCandidatesPanel /> : <LexiconTermsPanel />}
    </section>
  );
}
