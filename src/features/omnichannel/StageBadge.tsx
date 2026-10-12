import type { ConversationStage } from '../../lib/api/omnichannel';
import { badgeBase, badgeTone } from '../shared/design';
import { CONVERSATION_STAGE_LABELS, STAGE_HINTS, STAGE_TONE } from './stageRules';

// Konuşma aşaması rozeti (P22). Hangi aşamada gösterileceğine çağıran karar verir
// (liste sıradan aşamaları gizler, sohbet başlığı hepsini gösterir). `quiet`: satır zaten
// durum tonuyla boyalı, rozet rengi tekrar etmesin.
export function StageBadge({ stage, quiet = false }: { stage: ConversationStage; quiet?: boolean }) {
  return (
    <span title={STAGE_HINTS[stage] ?? 'Konuşma aşaması'} className={`${badgeBase} ${quiet ? badgeTone.neutral : STAGE_TONE[stage]}`}>
      {CONVERSATION_STAGE_LABELS[stage]}
    </span>
  );
}
