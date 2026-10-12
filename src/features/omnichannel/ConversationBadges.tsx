import { AlertTriangle, Archive, Bot, Clock, MessageCircleQuestion } from 'lucide-react';
import { CONVERSATION_STATE_LABELS, CONVERSATION_TOPIC, type ConversationSummaryDto } from '../../lib/api/omnichannel';
import { isDormant, waitBadgeOf } from './conversationAge';
import { StageBadge } from './StageBadge';
import { StatusBadge } from './StatusBadge';
import { TopicChip } from './TopicChip';
import { showStageInList, URGENT_HINT } from './stageRules';

interface Props {
  conversation: ConversationSummaryDto;
  // Panoda aşama zaten sütunun kendisi; kartta tekrar yazılmaz.
  showStage?: boolean;
  // Satır zaten durum tonuyla boyalıysa (conversationTone) Acil / Soru bekliyor / aşama rozetleri
  // rengi tekrar etmez, yalnız metinle durur. Sohbet başlığı boyalı değildir, renkli kalır.
  tinted?: boolean;
}

// Satır/kart rozetleri, önem sırasıyla: Acil → Soru bekliyor → aşama (ya da "Eski") → bekleme süresi → Bot → konu.
// Sıradan durumda rozet yok: her satırda etiket olsaydı hiçbiri fark edilmezdi.
export function ConversationBadges({ conversation: c, showStage = true, tinted = false }: Props) {
  const dormant = isDormant(c);
  const wait = waitBadgeOf(c);
  const legacyState = c.stage === undefined && c.state !== undefined ? CONVERSATION_STATE_LABELS[c.state] : undefined;

  return (
    <>
      {c.isUrgent && (
        <StatusBadge tone={tinted ? 'neutral' : 'danger'} Icon={AlertTriangle} title={URGENT_HINT}>Acil</StatusBadge>
      )}
      {c.pendingConsultation && (
        <StatusBadge tone={tinted ? 'neutral' : 'warning'} Icon={MessageCircleQuestion} title="Bot sana bir soru sordu — cevabını bekliyor">
          Soru bekliyor
        </StatusBadge>
      )}
      {dormant && <StatusBadge tone="neutral" Icon={Archive} title="Uzun süredir hareket yok">Eski</StatusBadge>}
      {showStage && !dormant && showStageInList(c.stage) && <StageBadge stage={c.stage} quiet={tinted} />}
      {showStage && legacyState && <StatusBadge tone="neutral">{legacyState}</StatusBadge>}
      {wait && <StatusBadge tone={wait.tone} Icon={Clock} title={wait.title}>{wait.label}</StatusBadge>}
      {c.isBotActive && !dormant && (
        <StatusBadge tone="bot" Icon={Bot} title="Bu konuşmaya bot cevap veriyor (son mesajı kimin yazdığını göstermez)">
          Bot açık
        </StatusBadge>
      )}
      {/* "Acil" zaten şikâyeti söylüyor; aynı şeyi iki rozetle yazmayalım. */}
      {!(c.isUrgent && c.topic === CONVERSATION_TOPIC.Complaint) && <TopicChip topic={c.topic} />}
    </>
  );
}
