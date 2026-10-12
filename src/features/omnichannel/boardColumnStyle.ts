import { BOARD_COLUMN, type BoardColumnKey } from '../../lib/api/omnichannel';

// Sütun başlığındaki küçük durum noktası: "burada bir şey bekliyor" sütunları (cevap, ödeme) sıcak,
// sipariş akışı mavi, biten yeşil, sıradan sütunlar nötr. Yalnız tema durum renkleri.
export const BOARD_COLUMN_DOT: Record<BoardColumnKey, string> = {
  [BOARD_COLUMN.BotAndNew]: 'bg-fg-subtle',
  [BOARD_COLUMN.AwaitingReply]: 'bg-warning',
  [BOARD_COLUMN.AwaitingCustomer]: 'bg-fg-subtle',
  [BOARD_COLUMN.OrderInProgress]: 'bg-info',
  [BOARD_COLUMN.AwaitingPayment]: 'bg-warning',
  [BOARD_COLUMN.Completed]: 'bg-success',
};
