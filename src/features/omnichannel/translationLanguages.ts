// "Tüm sohbeti çevir" hedef dilleri — backend beyaz listesiyle (TranslationTargetLanguages) aynı kodlar.
// İlk üçü en sık kullanılanlardır (Türkçe, İngilizce, Arnavutça).
export const TRANSLATION_LANGUAGES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'İngilizce' },
  { code: 'sq', label: 'Arnavutça' },
  { code: 'de', label: 'Almanca' },
  { code: 'fr', label: 'Fransızca' },
  { code: 'es', label: 'İspanyolca' },
  { code: 'it', label: 'İtalyanca' },
  { code: 'nl', label: 'Felemenkçe' },
  { code: 'ru', label: 'Rusça' },
  { code: 'ar', label: 'Arapça' },
  { code: 'bg', label: 'Bulgarca' },
  { code: 'ro', label: 'Romence' },
  { code: 'el', label: 'Yunanca' },
  { code: 'sr', label: 'Sırpça' },
] as const;

export type TranslationLanguageCode = (typeof TRANSLATION_LANGUAGES)[number]['code'];

export const DEFAULT_TRANSLATION_LANGUAGE: TranslationLanguageCode = 'tr';

const STORAGE_KEY = 'omnichannel.transcriptTranslationLanguage';

export function translationLanguageLabel(code: string): string {
  return TRANSLATION_LANGUAGES.find((language) => language.code === code)?.label ?? code;
}

function isTranslationLanguage(value: string | null): value is TranslationLanguageCode {
  return TRANSLATION_LANGUAGES.some((language) => language.code === value);
}

// localStorage kapalı/bozuk olabilir (gizli pencere, engellenmiş site verisi): hata yutulur, varsayılan döner.
export function readRememberedLanguage(): TranslationLanguageCode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isTranslationLanguage(stored) ? stored : DEFAULT_TRANSLATION_LANGUAGE;
  } catch {
    return DEFAULT_TRANSLATION_LANGUAGE;
  }
}

export function rememberLanguage(code: TranslationLanguageCode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* hatırlanamaması çeviriyi engellemez */
  }
}
