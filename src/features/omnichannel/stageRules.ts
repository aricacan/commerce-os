import {
  CONVERSATION_FILTER, CONVERSATION_STAGE, type ConversationFilter, type ConversationStage,
} from '../../lib/api/omnichannel';

// Konuşma aşaması (P22) için saf eşlemeler: etiket, renk, listede görünürlük ve canlı filtre eşleşmesi.

export const CONVERSATION_STAGE_LABELS: Record<ConversationStage, string> = {
  [CONVERSATION_STAGE.New]: 'Yeni',
  [CONVERSATION_STAGE.BotHandling]: 'Bot ilgileniyor',
  [CONVERSATION_STAGE.AwaitingCustomer]: 'Müşteri bekleniyor',
  [CONVERSATION_STAGE.AwaitingAgent]: 'Cevap bekliyor',
  [CONVERSATION_STAGE.Handoff]: 'Devredildi',
  [CONVERSATION_STAGE.OrderCollecting]: 'Sipariş: bilgi',
  [CONVERSATION_STAGE.OrderAwaitingConfirmation]: 'Sipariş: onay bekliyor',
  [CONVERSATION_STAGE.AwaitingPayment]: 'Ödeme bekliyor',
  [CONVERSATION_STAGE.OrderPlaced]: 'Sipariş alındı',
  [CONVERSATION_STAGE.Shipped]: 'Kargoda',
  [CONVERSATION_STAGE.Resolved]: 'Çözüldü',
  [CONVERSATION_STAGE.Dormant]: 'Eski',
};

// Rozet açıklamaları (fare üstü). "Acil" aşama değil, konuşma bayrağıdır; ipucu burada tek kaynaktır.
export const URGENT_HINT = 'Acil: insan cevabı gecikti ya da şikâyet';
export const STAGE_HINTS: Partial<Record<ConversationStage, string>> = {
  [CONVERSATION_STAGE.Handoff]: 'Devredildi: bot temsilciye bıraktı, temsilci bekleniyor',
};

// Renkler tema durum renklerinden (topicMeta ile aynı dil): insan bekleyen kırmızı/turuncu,
// sipariş akışı mavi, tamamlanan satış yeşil, sıradan/pasif aşamalar nötr.
const NEUTRAL_TONE = 'bg-bg-subtle text-fg-muted';

export const STAGE_TONE: Record<ConversationStage, string> = {
  [CONVERSATION_STAGE.New]: NEUTRAL_TONE,
  [CONVERSATION_STAGE.BotHandling]: NEUTRAL_TONE,
  [CONVERSATION_STAGE.AwaitingCustomer]: NEUTRAL_TONE,
  [CONVERSATION_STAGE.AwaitingAgent]: 'bg-warning-soft text-warning',
  [CONVERSATION_STAGE.Handoff]: 'bg-danger-soft text-danger',
  [CONVERSATION_STAGE.OrderCollecting]: 'bg-info-soft text-info',
  [CONVERSATION_STAGE.OrderAwaitingConfirmation]: 'bg-info-soft text-info',
  [CONVERSATION_STAGE.AwaitingPayment]: 'bg-warning-soft text-warning',
  [CONVERSATION_STAGE.OrderPlaced]: 'bg-success-soft text-success',
  [CONVERSATION_STAGE.Shipped]: 'bg-success-soft text-success',
  [CONVERSATION_STAGE.Resolved]: NEUTRAL_TONE,
  [CONVERSATION_STAGE.Dormant]: NEUTRAL_TONE,
};

// Listede rozetsiz aşamalar: sıradan durumlar her satırda yazsa hiçbiri fark edilmezdi.
// "Bot ilgileniyor" zaten satırdaki "Bot açık" rozetiyle görünüyor.
const QUIET_IN_LIST: ReadonlySet<ConversationStage> = new Set<ConversationStage>([
  CONVERSATION_STAGE.New, CONVERSATION_STAGE.BotHandling, CONVERSATION_STAGE.Resolved,
]);

export const showStageInList = (stage: ConversationStage | undefined): stage is ConversationStage =>
  stage !== undefined && !QUIET_IN_LIST.has(stage);

// Aşamaya bağlı durum haplarının kapsamı — backend InboxViews.StagesFor'un aynası (canlı eşleşme için).
export const STATUS_FILTER_STAGES: Partial<Record<ConversationFilter, readonly ConversationStage[]>> = {
  [CONVERSATION_FILTER.WaitingReply]: [CONVERSATION_STAGE.AwaitingAgent, CONVERSATION_STAGE.Handoff],
  [CONVERSATION_FILTER.InOrder]: [CONVERSATION_STAGE.OrderCollecting, CONVERSATION_STAGE.OrderAwaitingConfirmation],
  [CONVERSATION_FILTER.AwaitingPayment]: [CONVERSATION_STAGE.AwaitingPayment],
  [CONVERSATION_FILTER.BotRunning]: [CONVERSATION_STAGE.BotHandling, CONVERSATION_STAGE.AwaitingCustomer],
  [CONVERSATION_FILTER.Closed]: [CONVERSATION_STAGE.Resolved, CONVERSATION_STAGE.Dormant],
};

// Filtre menüsündeki sıra: akış sırası (enum sırası).
export const FILTER_STAGES = Object.values(CONVERSATION_STAGE) as ConversationStage[];

export function toConversationStage(value: string): ConversationStage | null {
  const stage = FILTER_STAGES.find((s) => String(s) === value);
  return stage ?? null;
}

// Canlı güncellemede aşama filtresi. Eski backend aşama göndermezse istemci karar veremez.
export function matchStageFilter(
  stage: ConversationStage | undefined, filter: ConversationStage | null,
): 'match' | 'mismatch' | 'unknown' {
  if (filter === null) return 'match';
  if (stage === undefined) return 'unknown';
  return stage === filter ? 'match' : 'mismatch';
}
