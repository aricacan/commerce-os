import { BOARD_COLUMN, CONVERSATION_STAGE, type BoardColumnKey, type ConversationStage } from '../../lib/api/omnichannel';

// Kanban sütunları (P30). Hangi aşamanın hangi sütuna düştüğü backend InboxViews.BoardColumns
// tablosunun aynasıdır; sütun içeriğini sunucu doldurur, bu tablo yalnız kartın "şu an nerede" ve
// "buraya bırakılabilir mi" sorularını cevaplar.

export interface BoardColumnMeta {
  key: BoardColumnKey;
  title: string;
  // Sütun başlığının altında görünen kısa açıklama: "bu sütundaki konuşmalar ne demek?"
  hint: string;
}

export const BOARD_COLUMNS: BoardColumnMeta[] = [
  { key: BOARD_COLUMN.BotAndNew, title: 'Yeni / Bot\'ta', hint: 'Bot ilgileniyor; işlem gerekmez' },
  { key: BOARD_COLUMN.AwaitingReply, title: 'Cevap bekliyor', hint: 'Müşteriye dönmemiz gereken' },
  { key: BOARD_COLUMN.AwaitingCustomer, title: 'Müşteri bekleniyor', hint: 'Son sözü biz söyledik; müşteri yazacak' },
  { key: BOARD_COLUMN.OrderInProgress, title: 'Sipariş hazırlanıyor', hint: 'Sipariş bilgisi ya da onayı toplanıyor' },
  { key: BOARD_COLUMN.AwaitingPayment, title: 'Ödeme bekliyor', hint: 'Havale onaylandı, ödeme gelmedi' },
  { key: BOARD_COLUMN.Completed, title: 'Tamamlandı', hint: 'Son 7 günde biten konuşmalar' },
];

const STAGE_TO_COLUMN: Partial<Record<ConversationStage, BoardColumnKey>> = {
  [CONVERSATION_STAGE.New]: BOARD_COLUMN.BotAndNew,
  [CONVERSATION_STAGE.BotHandling]: BOARD_COLUMN.BotAndNew,
  [CONVERSATION_STAGE.AwaitingAgent]: BOARD_COLUMN.AwaitingReply,
  [CONVERSATION_STAGE.Handoff]: BOARD_COLUMN.AwaitingReply,
  [CONVERSATION_STAGE.AwaitingCustomer]: BOARD_COLUMN.AwaitingCustomer,
  [CONVERSATION_STAGE.OrderCollecting]: BOARD_COLUMN.OrderInProgress,
  [CONVERSATION_STAGE.OrderAwaitingConfirmation]: BOARD_COLUMN.OrderInProgress,
  [CONVERSATION_STAGE.AwaitingPayment]: BOARD_COLUMN.AwaitingPayment,
  [CONVERSATION_STAGE.OrderPlaced]: BOARD_COLUMN.Completed,
  [CONVERSATION_STAGE.Shipped]: BOARD_COLUMN.Completed,
  [CONVERSATION_STAGE.Resolved]: BOARD_COLUMN.Completed,
};

export const columnOfStage = (stage: ConversationStage | undefined): BoardColumnKey | null =>
  (stage === undefined ? null : STAGE_TO_COLUMN[stage] ?? null);

const OPEN_ORDER_STAGES: ReadonlySet<ConversationStage> = new Set<ConversationStage>([
  CONVERSATION_STAGE.OrderCollecting, CONVERSATION_STAGE.OrderAwaitingConfirmation, CONVERSATION_STAGE.AwaitingPayment,
]);

// null = bırakılabilir; metin = reddedilme nedeni (backend BoardMoveRules ile aynı kararlar).
export function dropDeniedReason(stage: ConversationStage | undefined, target: BoardColumnKey): string | null {
  const current = columnOfStage(stage);
  if (stage === undefined || current === null) return 'Bu konuşma panoda gösterilmiyor.';
  if (current === target) return 'Kart zaten bu sütunda.';
  if (current === BOARD_COLUMN.Completed) return 'Kapanan konuşma panodan yeniden açılamaz.';
  if (target === BOARD_COLUMN.AwaitingReply) return null;
  if (target !== BOARD_COLUMN.Completed) return 'Aşama sohbetin gidişatından otomatik belirlenir; elle taşınamaz.';
  return OPEN_ORDER_STAGES.has(stage)
    ? 'Açık siparişi olan konuşma kapatılamaz; önce siparişi tamamlayın ya da iptal edin.'
    : null;
}

// Karttaki hızlı eylem düğmeleri (mobilde sürükleme yok) — izinli hedefler.
export const CARD_MOVE_TARGETS: { target: BoardColumnKey; label: string }[] = [
  { target: BOARD_COLUMN.AwaitingReply, label: 'Devral' },
  { target: BOARD_COLUMN.Completed, label: 'Kapat' },
];
