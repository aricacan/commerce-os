'use client';

import { ShieldCheck } from 'lucide-react';
import { ApprovedAnswersSection } from './ApprovedAnswersSection';
import { useOmnichannelNav } from './OmnichannelNavContext';
import { LexiconSection } from './LexiconSection';
import { QualityCandidatesSection } from './QualityCandidatesSection';
import { QUALITY_SECTIONS, resolveQualitySection } from './qualityCenterRules';
import { QualityOverviewSection } from './QualityOverviewSection';
import { QualityRunsSection } from './QualityRunsSection';
import { QualityScenariosSection } from './QualityScenariosSection';
import { QualityShadowSection } from './QualityShadowSection';
import { SubTabBar } from './SubTabBar';
import { useIsOmnichannelAdmin } from './useIsOmnichannelAdmin';

interface Props {
  onOpenConversation: (conversationId: number) => void;
}

// Kalite Merkezi (FAZ 7.5, eski adı Altın Set): botun kalitesini ölçmenin, karşılaştırmanın ve iyileştirmenin tek yeri.
// Bölüm adreste (?sub=) durur: bağlantı paylaşılır, yenilemede kaybolmaz. Yalnız yönetici.
export function QualityCenterTab({ onOpenConversation }: Props) {
  const isAdmin = useIsOmnichannelAdmin();
  const { view, go } = useOmnichannelNav();
  if (!isAdmin) return <p className="p-4 text-ui-sm text-fg-muted">Kalite Merkezi yalnızca yöneticilere açıktır.</p>;

  const section = resolveQualitySection(view.sub);
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <header className="flex flex-col gap-1 px-4 pt-4 sm:px-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-fg-muted" aria-hidden />
          <h2 className="m-0 text-sm font-bold text-fg">Kalite Merkezi</h2>
        </div>
        <p className="m-0 text-ui-xs text-fg-muted">
          Değerlendirme koşuları, canlı trafik kalitesi, otomatik adaylar ve onaylı cevaplar tek yerde.
        </p>
      </header>
      <SubTabBar tabs={QUALITY_SECTIONS} active={section} ariaLabel="Kalite Merkezi bölümleri" onChange={(key) => go({ sub: key })} />
      <div className="flex w-full min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5">
        {section === 'summary' && <QualityOverviewSection />}
        {section === 'runs' && <QualityRunsSection onOpenConversation={onOpenConversation} />}
        {section === 'candidates' && <QualityCandidatesSection onOpenConversation={onOpenConversation} />}
        {section === 'scenarios' && <QualityScenariosSection onOpenConversation={onOpenConversation} />}
        {section === 'shadow' && <QualityShadowSection />}
        {section === 'answers' && <ApprovedAnswersSection />}
        {section === 'lexicon' && <LexiconSection />}
      </div>
    </div>
  );
}
