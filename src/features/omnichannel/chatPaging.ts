import type { MessageDto } from '../../lib/api/omnichannel';
import { isOptimistic, mergeLoadedMessages } from './chatMessages';

// Sohbetin eski mesajlarını geriye doğru sayfalama kuralları. Saf fonksiyonlar — React'ten bağımsız, test edilebilir.
// Sunucu sözleşmesi (ConversationService.GetMessagesAsync + MessageOrdering): beforeId = ekrandaki en eski mesaj;
// yanıt o mesajdan (gönderim zamanı, sonra Id) DAHA ESKİ olanlardır, eskiden yeniye sıralı.

export const MESSAGE_PAGE_SIZE = 50;

// Dolu sayfa = devamı olabilir; eksik sayfa = konuşmanın başına gelindi.
export const hasMoreOlder = (pageLength: number, pageSize = MESSAGE_PAGE_SIZE): boolean => pageLength >= pageSize;

// İmleç: listedeki en eski KAYITLI mesaj. Optimistic balonun geçici (negatif) id'si sunucuda yoktur.
export function olderCursorId(messages: readonly MessageDto[]): number | null {
  return messages.find((m) => !isOptimistic(m))?.id ?? null;
}

// Eski sayfa listenin başına eklenir; ekranda zaten olan (ör. canlı gelen) mesaj ikinci kez girmez.
export function prependOlder(messages: MessageDto[], older: readonly MessageDto[]): MessageDto[] {
  const seen = new Set(messages.map((m) => m.id));
  const fresh = older.filter((m) => !seen.has(m.id));
  return fresh.length === 0 ? messages : [...fresh, ...messages];
}

// Sunucunun sıralamasıyla aynı anahtar: gönderim zamanı (yoksa oluşturulma), eşitlikte Id.
function isBefore(a: MessageDto, b: MessageDto): boolean {
  const at = Date.parse(a.sentAt ?? a.createdAt);
  const bt = Date.parse(b.sentAt ?? b.createdAt);
  return at < bt || (at === bt && a.id < b.id);
}

// Yeniden yükleme (son sayfa tekrar okunur): önceden yüklenmiş eski sayfalar başta korunur, gerisi
// mergeLoadedMessages kuralıyla (yeni canlı mesajlar + bekleyen balonlar sonda) birleşir.
export function mergeReloadKeepingOlder(loaded: MessageDto[], current: readonly MessageDto[]): MessageDto[] {
  const older = olderThanWindow(current, loaded);
  if (older.length === 0) return mergeLoadedMessages(loaded, [...current]);
  const olderIds = new Set(older.map((m) => m.id));
  return [...older, ...mergeLoadedMessages(loaded, current.filter((m) => !olderIds.has(m.id)))];
}

// Aynı konuşmanın, yüklenen pencereden daha eski ve onda olmayan mesajları.
function olderThanWindow(current: readonly MessageDto[], loaded: readonly MessageDto[]): MessageDto[] {
  const oldestLoaded = loaded[0];
  if (oldestLoaded === undefined) return [];
  const loadedIds = new Set(loaded.map((m) => m.id));
  return current.filter((m) => !isOptimistic(m)
    && m.conversationId === oldestLoaded.conversationId
    && !loadedIds.has(m.id)
    && isBefore(m, oldestLoaded));
}

// Kaydırma konumu korunmalı mı: listenin başına mesaj eklendi (önceki ilk mesaj hâlâ listede ama artık başta değil).
export function wasPrepended(previousFirstId: number | null, messages: readonly MessageDto[]): boolean {
  if (previousFirstId === null || messages.length === 0 || messages[0].id === previousFirstId) return false;
  return messages.some((m) => m.id === previousFirstId);
}
