import type { BotTextEntryDto, BotTextOverrideDto, CustomerLanguageCode } from '../../lib/api/omnichannel';

// Bot metni düzenleme kuralları. Alan varsayılan metinle DOLU gelir; null = dokunulmadı (varsayılan),
// '' = kullanıcı sildi (kaydedince varsayılan). Varsayılanla aynı ya da boş metin override sayılmaz.

export function defaultTextOf(entry: BotTextEntryDto, language: CustomerLanguageCode): string {
  if (language === 'tr') return entry.defaultTr;
  if (language === 'sq') return entry.defaultSq;
  return entry.defaultEn;
}

export function shownTextOf(entry: BotTextEntryDto, language: CustomerLanguageCode): string {
  return entry[language] ?? defaultTextOf(entry, language);
}

function overrideOf(entry: BotTextEntryDto, language: CustomerLanguageCode): string | null {
  const value = entry[language];
  if (value === null || value.trim() === '') return null;
  return value.trim() === defaultTextOf(entry, language).trim() ? null : value;
}

export function isLanguageCustomised(entry: BotTextEntryDto, language: CustomerLanguageCode): boolean {
  return overrideOf(entry, language) !== null;
}

export function isTextCustomised(entry: BotTextEntryDto): boolean {
  return overrideOf(entry, 'tr') !== null || overrideOf(entry, 'en') !== null || overrideOf(entry, 'sq') !== null;
}

// Sunucuya giden: yalnız gerçekten değiştirilen diller.
export function toTextOverride(entry: BotTextEntryDto): BotTextOverrideDto {
  return { key: entry.key, tr: overrideOf(entry, 'tr'), en: overrideOf(entry, 'en'), sq: overrideOf(entry, 'sq') };
}
