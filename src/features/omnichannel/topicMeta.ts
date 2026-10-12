import { CONVERSATION_TOPIC, type ConversationTopic } from '../../lib/api/omnichannel';

// Konu etiketlerinin renkleri tema durum renklerinden gelir (rastgele renk yok): satış yeşil,
// kargo mavi, satış sonrası turuncu, şikayet kırmızı; etiketsiz/diğer nötr.
export const TOPIC_TONE: Record<ConversationTopic, string> = {
  [CONVERSATION_TOPIC.None]: 'bg-bg-subtle text-fg-subtle',
  [CONVERSATION_TOPIC.Purchase]: 'bg-success-soft text-success',
  [CONVERSATION_TOPIC.Shipping]: 'bg-info-soft text-info',
  [CONVERSATION_TOPIC.AfterSales]: 'bg-warning-soft text-warning',
  [CONVERSATION_TOPIC.Complaint]: 'bg-danger-soft text-danger',
  [CONVERSATION_TOPIC.Other]: 'bg-bg-subtle text-fg-muted',
};

// Filtre çubuğundaki sıra: en sık kullanılanlar önde, "Etiketsiz" (AI henüz bakmadı) sonda.
export const FILTER_TOPICS: ConversationTopic[] = [
  CONVERSATION_TOPIC.Purchase,
  CONVERSATION_TOPIC.Shipping,
  CONVERSATION_TOPIC.AfterSales,
  CONVERSATION_TOPIC.Complaint,
  CONVERSATION_TOPIC.Other,
  CONVERSATION_TOPIC.None,
];
