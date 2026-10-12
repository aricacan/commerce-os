'use client';

import { EvalComparePanel } from './EvalComparePanel';
import { EvalRunsSection } from './EvalRunsSection';
import { useEvalRuns } from './useEvalRuns';

interface Props {
  onOpenConversation: (conversationId: number) => void;
}

// Kalite Merkezi › Koşular: iki koşunun tur tur karşılaştırması (üstte) ve değerlendirme koşuları listesi. Koşu listesi
// tek kez okunur, ikisi de aynı listeyi kullanır.
export function QualityRunsSection({ onOpenConversation }: Props) {
  const runs = useEvalRuns();
  return (
    <>
      <EvalComparePanel runs={runs.runs} onOpenConversation={onOpenConversation} />
      <EvalRunsSection runs={runs} />
    </>
  );
}
