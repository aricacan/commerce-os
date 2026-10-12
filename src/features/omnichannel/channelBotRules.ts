import type {
  BotThresholdKey, BotThresholdOverrides, ChannelBotOverrideDto, ChannelBotVersions,
} from '../../lib/api/omnichannel-channel-bot';

// Kanal Bot sekmesinin saf kuralları: hangi eşikler kanala özel olabilir, sınırları ve metin biçimi.
// Sınırlar sunucudaki BotSettingsLimits ile aynıdır (sunucu yine doğrular); burada kullanıcı hatayı
// kaydetmeden önce görsün diye tekrarlanır.

export type ThresholdKind = 'ratio' | 'count' | 'days';

export interface ThresholdField {
  key: BotThresholdKey;
  label: string;
  hint: string;
  kind: ThresholdKind;
  min: number;
  max: number;
  step: number;
}

export const THRESHOLD_FIELDS: readonly ThresholdField[] = [
  {
    key: 'autoAnswerThreshold', label: 'Doğru cevap eşiği', kind: 'ratio', min: 0.1, max: 1, step: 0.01,
    hint: 'Ürün eşleşmesi bu skorun üstündeyse bot doğrudan cevaplar.',
  },
  {
    key: 'ambiguityThreshold', label: 'Devir eşiği', kind: 'ratio', min: 0.1, max: 0.9, step: 0.01,
    hint: 'Bunun altında bot cevaplamaz, konuşmayı temsilciye devreder.',
  },
  {
    key: 'ambiguityGap', label: 'Belirsizlik aralığı', kind: 'ratio', min: 0.01, max: 0.3, step: 0.01,
    hint: 'İki aday bu farktan yakınsa bot “hangisi?” diye sorar.',
  },
  {
    key: 'photoMatchThreshold', label: 'Fotoğraf eşiği', kind: 'ratio', min: 0.5, max: 0.99, step: 0.01,
    hint: 'Fotoğraf eşleşmesinin güvenli sayılması için görsel benzerlik alt sınırı.',
  },
  {
    key: 'maxConsecutiveReplies', label: 'Art arda yanıt sayısı', kind: 'count', min: 1, max: 40, step: 1,
    hint: 'Müşteri araya girmeden bu kadar bot mesajından sonra konuşma insana bırakılır.',
  },
  {
    key: 'sessionGapDays', label: 'Oturum aralığı', kind: 'days', min: 1, max: 60, step: 1,
    hint: 'Müşteri bu kadar gün sonra yazarsa yeni oturum başlar ve karşılama menüsü yeniden gelir.',
  },
];

export const isThresholdCustom = (overrides: BotThresholdOverrides, key: BotThresholdKey): boolean =>
  overrides[key] !== null;

export const customThresholdCount = (overrides: BotThresholdOverrides): number =>
  THRESHOLD_FIELDS.filter((field) => isThresholdCustom(overrides, field.key)).length;

/** Yalnız `key` alanını değiştirir; null = hesap genelini izle. */
export const withThreshold = (
  overrides: BotThresholdOverrides, key: BotThresholdKey, value: number | null,
): BotThresholdOverrides => ({ ...overrides, [key]: value });

export function formatThreshold(field: ThresholdField, value: number): string {
  if (field.kind === 'ratio') return value.toFixed(2);
  return field.kind === 'days' ? `${value} gün` : String(value);
}

export type ThresholdParse = { value: number } | { error: string };

/** Girdiyi sayıya çevirir; virgül de kabul edilir. Sınır dışı ya da tam sayı olmayan değer hata verir. */
export function parseThresholdInput(field: ThresholdField, raw: string): ThresholdParse {
  const value = Number(raw.trim().replace(',', '.'));
  if (raw.trim() === '' || Number.isNaN(value)) return { error: 'Sayı girin.' };
  if (value < field.min || value > field.max) {
    return { error: `${formatThreshold(field, field.min)} ile ${formatThreshold(field, field.max)} arasında olmalı.` };
  }
  if (field.kind !== 'ratio' && !Number.isInteger(value)) return { error: 'Tam sayı girin.' };
  return { value };
}

/** Kanalın bot ayarında hesap geneliyle farklı olan bölümlerin kısa özeti (rozet metni). */
export function botOverrideSummary(summary: {
  thresholds: { overrides: BotThresholdOverrides }; menuIsCustom: boolean; customTextCount: number;
}): string[] {
  const parts: string[] = [];
  const thresholds = customThresholdCount(summary.thresholds.overrides);
  if (thresholds > 0) parts.push(`${thresholds} eşik`);
  if (summary.menuIsCustom) parts.push('menü');
  if (summary.customTextCount > 0) parts.push(`${summary.customTextCount} metin`);
  return parts;
}

// ── Bot hattı sürümleri (FAZ 2) ────────────────────────────────────────────────

/** Seçicideki "Varsayılan" (canlı) ve "Kapalı" (gölge) seçeneğinin değeri. */
export const VERSION_UNSET = '';

/** Sunucu sürüm alanlarını göndermiyorsa (eski backend) null: seçiciler gösterilmez. */
export function channelVersionsOf(dto: ChannelBotOverrideDto): ChannelBotVersions | null {
  if (dto.liveVersion === undefined) return null;
  return { liveVersion: dto.liveVersion ?? VERSION_UNSET, shadowVersion: dto.shadowVersion || null };
}

/** Seçici değerlerinden gövde: boş canlı = varsayılan, boş gölge = kapalı (null). */
export const toChannelVersions = (live: string, shadow: string): ChannelBotVersions =>
  ({ liveVersion: live, shadowVersion: shadow === VERSION_UNSET ? null : shadow });

/** Tek sürüm varken gölgenin karşılaştıracağı bir şey yoktur. */
export const canPickShadowVersion = (versions: readonly string[]): boolean => versions.length > 1;

/** Seçici seçenekleri: sunucunun sürümleri + kayıtlı ama listede artık olmayan sürüm (seçim sessizce kaybolmasın). */
export function versionOptions(known: readonly string[], current: ChannelBotVersions): string[] {
  const saved = [current.liveVersion, current.shadowVersion ?? VERSION_UNSET];
  const missing = saved.filter((version) => version !== VERSION_UNSET && !known.includes(version));
  return [...known, ...new Set(missing)];
}
