import type { MessageDto } from '../../lib/api/omnichannel';
import { senderKindOf } from './messageSender';

// Sunucudaki kuralın aynısı: sistem/otomatik not mesajları ve metni olmayanlar çevrilmez;
// geçici (negatif id) balon henüz sunucuda yok.
export function isTranscriptTranslatable(message: MessageDto): boolean {
  return message.id > 0 && !!message.body?.trim() && senderKindOf(message) !== 'system';
}

// Çeviri bir kez alındıktan SONRA gelen mesajlar otomatik çevrilmez; kullanıcıya kaç tanesinin
// bekletildiği söylenir. Sunucunun kestiği eski mesajlar (en eski çevrilmiş id'nin altı) sayılmaz.
export function countUntranslated(messages: MessageDto[], translatedIds: ReadonlySet<number>): number {
  if (translatedIds.size === 0) return 0;
  const oldestTranslatedId = Math.min(...translatedIds);
  return messages.filter(
    (message) => isTranscriptTranslatable(message) && message.id > oldestTranslatedId && !translatedIds.has(message.id),
  ).length;
}

// Çeviri aslıyla aynıysa (mesaj zaten hedef dilde) ikinci bir kutu göstermek gürültüdür.
export function differsFromOriginal(original: string | null, translated: string): boolean {
  return (original ?? '').trim().toLowerCase() !== translated.trim().toLowerCase();
}
