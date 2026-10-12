// Uygulama genelinde TEK tarih/saat format kaynağı — gün/ay/yıl sırası HER ZAMAN garanti
// edilir. İngilizce arayüzde 'en-US' YERİNE 'en-GB' kullanılır: en-US ay/gün/yıl sıralar
// (7/14/2026), en-GB ise gün/ay/yıl sıralar (14/07/2026) — dil değişince format kayması
// (ay-önce hatası) böyle önlenir. Önceden birden fazla dosyada tekrarlanan inline
// toLocaleDateString çağrıları buraya yönlendirilir (bkz. basetrack/shared.tsx, orders/page.tsx).

export type AppLang = 'tr' | 'en';

function toDate(value: Date | string): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

function localeFor(lang: AppLang): string {
  return lang === 'tr' ? 'tr-TR' : 'en-GB';
}

// Geçersiz/eksik tarihlerde sessizce yanlış bir şey göstermek yerine '—' döner.
export function formatDate(value: Date | string, lang: AppLang = 'tr', opts?: Intl.DateTimeFormatOptions): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(localeFor(lang), opts);
}

export function formatDateTime(value: Date | string, lang: AppLang = 'tr', opts?: Intl.DateTimeFormatOptions): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(localeFor(lang), opts);
}

// Kompakt liste görünümleri için: "14 Tem" gibi, yıl olmadan.
export function formatDateShort(value: Date | string, lang: AppLang = 'tr'): string {
  return formatDate(value, lang, { day: '2-digit', month: 'short' });
}

export function formatTime(value: Date | string, lang: AppLang = 'tr'): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(localeFor(lang), { hour: '2-digit', minute: '2-digit' });
}
