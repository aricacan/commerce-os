'use client';

import { GoldScenarioPanel } from './GoldScenarioPanel';
import { QualityDatasetsPanel } from './QualityDatasetsPanel';

interface Props {
  onOpenConversation: (conversationId: number) => void;
}

// Kalite Merkezi › Senaryolar ve veri setleri: değerlendirme veri setleri (canlıdan kur, yükle, indir, sürümle, koşuya
// gönder) ve altın senaryolar + deploy kapısı.
export function QualityScenariosSection({ onOpenConversation }: Props) {
  return (
    <>
      <QualityDatasetsPanel onOpenConversation={onOpenConversation} />
      <GoldScenarioPanel />
    </>
  );
}
