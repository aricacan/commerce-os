import type { CustomerLanguageCode, OutgoingTranslationDto } from '../../lib/api/omnichannel';

// Giden mesajın çeviri kararı (Gelen Kutusu v2 §4) — React'ten bağımsız, test edilebilir.
//
// KATI KURAL: çeviri açıkken temsilcinin Türkçe metni Arnavutça/İngilizce yazan müşteriye
// çevrilmeden gitmez. Dil henüz bilinmiyorsa (yükleniyor ya da okunamadı) çeviri ucu yine
// çağrılır — müşteri Türkçeyse sunucu modelsiz "değişmedi" döner, metin olduğu gibi gider.

export interface OutgoingPreview {
  // Temsilcinin yazdığı Türkçe metin (yazma alanında kalır).
  source: string;
  // Müşteriye gidecek, temsilcinin düzenleyebildiği çeviri.
  translated: string;
  targetLanguage: CustomerLanguageCode;
}

export type OutgoingPlan =
  | { kind: 'send'; body: string }
  | { kind: 'preview'; preview: OutgoingPreview };

export type TranslateOutgoing = (conversationId: number, text: string) => Promise<OutgoingTranslationDto>;

// Taslağın dili: temsilcinin Türkçesi mi, yoksa zaten müşterinin dilinde mi (yanıt önerisi,
// bot taslağı, dilli hazır cevap, çevrilip gönderilemeyen mesajın tekrarı)?
export type DraftOrigin = 'agent' | 'customerLanguage';

// Kesin olarak Türkçe yazan müşteri dışında her durum (bilinmeyen dil dahil) çeviri ister.
export function needsOutgoingTranslation(customerLanguage: CustomerLanguageCode | null): boolean {
  return customerLanguage !== 'tr';
}

// Bilinen yabancı dil — gelen mesajları Türkçeye çevirme ve özet kartı için.
export function isForeignLanguage(customerLanguage: CustomerLanguageCode | null): customerLanguage is CustomerLanguageCode {
  return customerLanguage !== null && customerLanguage !== 'tr';
}

// Çeviri yalnız anahtar açıkken, müşteri Türkçe değilken ve metin Türkçe yazılmışken devreye girer.
export function shouldTranslateOutgoing(
  enabled: boolean, customerLanguage: CustomerLanguageCode | null, origin: DraftOrigin,
): boolean {
  return enabled && origin === 'agent' && needsOutgoingTranslation(customerLanguage);
}

// Taslak kaynağı: açıkça verilen kaynak kazanır; yazma alanı boşalınca temsilcinin
// Türkçesine döner; temsilci müşteri dilindeki metni düzenlerse kaynak değişmez.
export function nextDraftOrigin(current: DraftOrigin, value: string, explicit?: DraftOrigin): DraftOrigin {
  if (explicit) return explicit;
  return value.trim() === '' ? 'agent' : current;
}

// Dili belirtilmiş, Türkçe olmayan hazır cevap zaten müşteri dilindedir.
export function cannedReplyOrigin(replyLanguage: string | null): DraftOrigin {
  return replyLanguage && replyLanguage.trim().toLowerCase() !== 'tr' ? 'customerLanguage' : 'agent';
}

// Önizleme yalnız ŞU ANKİ taslağın çevirisiyse geçerlidir; taslak değiştiyse gösterilmez/gönderilmez.
export function currentPreview(preview: OutgoingPreview | null, draft: string): OutgoingPreview | null {
  return preview !== null && preview.source === draft.trim() ? preview : null;
}

// Çeviri gerekmiyorsa metin doğrudan gider; gerekiyorsa ÖNİZLEME döner — çeviri temsilci
// "Çeviriyi gönder" demeden asla müşteriye gitmez. Sunucu "değişmedi" derse (müşteri
// Türkçe yazıyor) önizleme gereksiz, metin olduğu gibi gönderilir.
export async function planOutgoing(
  conversationId: number, text: string, translate: boolean, translateOutgoing: TranslateOutgoing,
): Promise<OutgoingPlan> {
  if (!translate) return { kind: 'send', body: text };

  const result = await translateOutgoing(conversationId, text);
  if (result.unchanged) return { kind: 'send', body: text };

  return {
    kind: 'preview',
    preview: { source: text, translated: result.translatedText, targetLanguage: result.targetLanguage },
  };
}
