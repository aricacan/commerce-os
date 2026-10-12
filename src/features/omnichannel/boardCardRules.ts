import type { ConversationSummaryDto } from '../../lib/api/omnichannel';
import type { BadgeTone } from '../shared/design';
import { waitBadgeOf } from './conversationAge';
import { URGENT_HINT } from './stageRules';

// Pano kartı yalnız üç şey söyler: kim, ne dedi, ne kadar acil. Aciliyet TEK rozettir; en önemli
// durum kazanır: şikâyet (acil) → bot soru soruyor → cevap bekleme süresi. Hiçbiri yoksa rozet yok,
// kartta yalnız son mesajın zamanı görünür. Acil / soru rozeti nötrdür: renk kartın durum tonundan
// (conversationTone) gelir, rozet aynı rengi tekrar etmez. Bekleme süresinin tonu ise ayrı bilgidir, kalır.

export type BoardCardPriorityKind = 'urgent' | 'consultation' | 'wait';

export interface BoardCardPriority {
  kind: BoardCardPriorityKind;
  tone: BadgeTone;
  label: string;
  title: string;
}

type PriorityFields = Pick<ConversationSummaryDto, 'isUrgent' | 'pendingConsultation' | 'stage' | 'lastMessageAt'>;

export function boardCardPriority(conversation: PriorityFields, now: number = Date.now()): BoardCardPriority | null {
  if (conversation.isUrgent) {
    return { kind: 'urgent', tone: 'neutral', label: 'Acil', title: URGENT_HINT };
  }
  if (conversation.pendingConsultation) {
    return { kind: 'consultation', tone: 'neutral', label: 'Soru bekliyor', title: 'Bot sana bir soru sordu — cevabını bekliyor' };
  }
  const wait = waitBadgeOf(conversation, now);
  return wait ? { kind: 'wait', tone: wait.tone, label: wait.label, title: wait.title } : null;
}
