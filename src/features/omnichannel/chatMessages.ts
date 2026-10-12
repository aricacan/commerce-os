import {
  DELIVERY_STATUS, MESSAGE_DIRECTION, type MessageDto, type MessageStatusChangedDto,
} from '../../lib/api/omnichannel';

// Sohbet mesaj listesi üzerindeki saf işlemler — React'ten bağımsız, test edilebilir.

// Optimistic (henüz sunucuya ulaşmamış) balonlar negatif geçici id taşır.
export const isOptimistic = (message: MessageDto) => message.id < 0;

// Aynı id iki kez listeye girmesin: gönderim yanıtı ile SignalR yankısı yarışır. Yankı
// önce gelirse gerçek mesaj zaten listededir — geçici balon kaldırılır, ikinci kopya eklenmez.
export function replaceOptimistic(messages: MessageDto[], optimisticId: number, saved: MessageDto): MessageDto[] {
  const alreadyEchoed = messages.some((m) => m.id === saved.id);
  return alreadyEchoed
    ? messages.filter((m) => m.id !== optimisticId)
    : messages.map((m) => (m.id === optimisticId ? saved : m));
}

export function appendUnique(messages: MessageDto[], incoming: MessageDto[]): MessageDto[] {
  const seen = new Set(messages.map((m) => m.id));
  const fresh = incoming.filter((m) => !seen.has(m.id));
  return fresh.length === 0 ? messages : [...messages, ...fresh];
}

// REST'ten yeniden yükleme ekrandakini EZMEZ: yüklenen pencereden yeni gelen canlı mesajlar
// ve bekleyen/başarısız optimistic balonlar korunur (sona eklenir).
export function mergeLoadedMessages(loaded: MessageDto[], current: MessageDto[]): MessageDto[] {
  const loadedIds = new Set(loaded.map((m) => m.id));
  const newestLoadedId = loaded.reduce((max, m) => Math.max(max, m.id), 0);
  const newerLive = current.filter((m) => !isOptimistic(m) && m.id > newestLoadedId && !loadedIds.has(m.id));
  const pending = current.filter(isOptimistic);
  return [...loaded, ...newerLive, ...pending];
}

// Tik ilerlemesi. Aynı güncellemeyi tekrar uygulamak zararsız (idempotent).
export function applyStatusChanges(
  messages: MessageDto[], changes: MessageStatusChangedDto[], conversationId: number,
): MessageDto[] {
  const relevant = changes.filter((s) => s.conversationId === conversationId);
  if (relevant.length === 0) return messages;
  const latest = new Map(relevant.map((s) => [s.messageId, s]));
  return messages.map((m) => {
    const change = latest.get(m.id);
    return change
      ? {
          ...m,
          deliveryStatus: change.deliveryStatus,
          deliveredAt: change.deliveredAt,
          readAt: change.readAt,
          failureReason: change.failureReason,
          failureHint: change.failureHint,
        }
      : m;
  });
}

export function markFailed(messages: MessageDto[], id: number, reason: string): MessageDto[] {
  return messages.map((m) => (m.id === id ? { ...m, deliveryStatus: DELIVERY_STATUS.Failed, failureReason: reason } : m));
}

// Dil yeniden sorulsun diye: son müşteri mesajının id'si (yoksa null).
export function lastInboundId(messages: MessageDto[]): number | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.direction === MESSAGE_DIRECTION.Inbound && !isOptimistic(m)) return m.id;
  }
  return null;
}

// Canlı akış yalnız açık konuşmanınkini ve en fazla `cap` kaydı tutar — sınırsız büyümesin.
export function appendBounded<T extends { conversationId: number }>(
  items: T[], item: T, conversationId: number | null, cap: number,
): T[] {
  if (item.conversationId !== conversationId) return items;
  const next = [...items, item];
  return next.length > cap ? next.slice(next.length - cap) : next;
}
