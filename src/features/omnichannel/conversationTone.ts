import { CONVERSATION_STAGE, type ConversationStage, type ConversationSummaryDto } from '../../lib/api/omnichannel';
import { isAgentTurn } from './conversationAge';
import { URGENT_HINT } from './stageRules';

// Konuşmanın durum TONU: gelen kutusu satırı ve pano kartı bu tek fonksiyonla çok soluk bir arka
// planla boyanır, renkli rozet tekrarına gerek kalmaz. En önemli durum kazanır:
// acil → sıra bizde → müşteriyi bekliyoruz → sipariş akışı → tamamlandı → eski. Botun yürüttüğü
// sıradan konuşma boyanmaz (her satır renkli olsaydı hiçbiri fark edilmezdi).

export type ConversationTone = 'urgent' | 'ourTurn' | 'customerTurn' | 'order' | 'done' | 'dormant';

type ToneFields = Pick<ConversationSummaryDto, 'isUrgent' | 'pendingConsultation' | 'stage'>;

const ORDER_STAGES: ReadonlySet<ConversationStage> = new Set<ConversationStage>([
  CONVERSATION_STAGE.OrderCollecting, CONVERSATION_STAGE.OrderAwaitingConfirmation, CONVERSATION_STAGE.AwaitingPayment,
]);

const DONE_STAGES: ReadonlySet<ConversationStage> = new Set<ConversationStage>([
  CONVERSATION_STAGE.OrderPlaced, CONVERSATION_STAGE.Shipped, CONVERSATION_STAGE.Resolved,
]);

export function conversationTone(conversation: ToneFields): ConversationTone | null {
  const { stage } = conversation;
  if (conversation.isUrgent) return 'urgent';
  if (conversation.pendingConsultation || isAgentTurn(conversation)) return 'ourTurn';
  if (stage === undefined) return null;
  if (stage === CONVERSATION_STAGE.AwaitingCustomer) return 'customerTurn';
  if (ORDER_STAGES.has(stage)) return 'order';
  if (DONE_STAGES.has(stage)) return 'done';
  return stage === CONVERSATION_STAGE.Dormant ? 'dormant' : null;
}

interface ToneStyle {
  label: string;
  hint: string;
  // Satır/kart arka planı (üzerine gelince bir kademe koyulaşır). Tema token'ları koyu modu kendisi çözer;
  // turuncunun token'ı olmadığından paletten light/dark çifti yazılır.
  surface: string;
  // Açıklama (legend) noktası.
  dot: string;
}

export const CONVERSATION_TONE_STYLES: Record<ConversationTone, ToneStyle> = {
  urgent: {
    label: 'Acil', hint: URGENT_HINT,
    surface: 'bg-danger-soft/50 hover:bg-danger-soft/80', dot: 'bg-danger',
  },
  ourTurn: {
    label: 'Sıra bizde', hint: 'Devredildi, temsilci cevabı ya da bot sorusu bekleniyor',
    surface: 'bg-orange-50/70 hover:bg-orange-100/70 dark:bg-orange-950/25 dark:hover:bg-orange-950/45', dot: 'bg-orange-500',
  },
  customerTurn: {
    label: 'Müşteri bekleniyor', hint: 'Müşterinin cevabı bekleniyor',
    surface: 'bg-warning-soft/50 hover:bg-warning-soft/80', dot: 'bg-warning',
  },
  order: {
    label: 'Sipariş', hint: 'Sipariş bilgisi, onayı ya da ödemesi sürüyor',
    surface: 'bg-info-soft/50 hover:bg-info-soft/80', dot: 'bg-info',
  },
  done: {
    label: 'Tamamlandı', hint: 'Sipariş alındı, kargoda ya da çözüldü',
    surface: 'bg-success-soft/50 hover:bg-success-soft/80', dot: 'bg-success',
  },
  dormant: {
    label: 'Eski', hint: 'Uzun süredir hareket yok',
    surface: 'bg-bg-subtle/60 hover:bg-bg-subtle', dot: 'bg-fg-subtle',
  },
};

export const CONVERSATION_TONE_ORDER: readonly ConversationTone[] = [
  'urgent', 'ourTurn', 'customerTurn', 'order', 'done', 'dormant',
];

const UNTINTED_SURFACE = 'bg-transparent hover:bg-card-hover';

// Seçili olmayan satırın/kartın arka planı.
export function conversationSurface(conversation: ToneFields, untinted: string = UNTINTED_SURFACE): string {
  const tone = conversationTone(conversation);
  return tone === null ? untinted : CONVERSATION_TONE_STYLES[tone].surface;
}
