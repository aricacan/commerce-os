import type {
  BotFeatureFlag,
  FeatureFlagInfoDto,
  FeatureFlagOverrideDto,
  FeatureFlagScopeDto,
} from '../../lib/api/omnichannel-flags';
import type { BotSettingsDto } from '../../lib/api/omnichannel';

// Bayrak matrisinin saf yardımcıları (P32): etiketler, sütun kurma ve etkin değer hesabı.
// Etkin değer kuralı arka uçtaki FeatureFlagResolution ile AYNI: marka+ülke > marka > ülke > Genel.

export interface FlagText {
  label: string;
  hint: string;
}

export const FLAG_TEXTS: Readonly<Record<BotFeatureFlag, FlagText>> = {
  EnableOrders: { label: 'Sohbetten sipariş', hint: 'Bot müşteriden adres ve ödeme alıp sipariş açar.' },
  EnableFollowUps: { label: 'Takip görevleri', hint: 'Yarım kalan sipariş ve cevapsız müşteriler için görev açılır, ekip uyarıları çalışır.' },
  FollowUpAutoSend: { label: 'Otomatik takip mesajı', hint: 'Takip mesajı müşteriye kendiliğinden gider; kapalıyken temsilci onayı bekler.' },
  PilotMode: { label: 'Pilot modu', hint: 'Açıkken bot cevapları müşteriye gitmez, temsilci onayına düşer.' },
  EnableCrossSell: { label: 'Çapraz satış', hint: 'Sipariş özetinden önce tamamlayıcı ürün bir kez önerilir.' },
  EnableBankMatch: { label: 'Havale eşleşmesi', hint: 'Banka hareketi tutan havaleler siparişi kendiliğinden ödendi yapar. Tüm hesap için geçerlidir.' },
  EnableMediaUnderstanding: { label: 'Fotoğraf anlama', hint: 'Müşterinin gönderdiği ürün fotoğrafından en yakın ürün bulunur.' },
  EnableAgentConsult: { label: 'Devir sonrası temsilci yardımcısı', hint: 'Devredilen konuşmayı açan temsilciye özet, müşterinin sorusu ve botun araçlarla (fiyat/stok/link) hazırladığı cevap seçenekleri gösterilir. Hiçbir şey otomatik gönderilmez.' },
};

/** Bayrağın Genel değeri bot ayarlarındaki bu alandır (Özellikler sayfası oradan okur/yazar). */
type FlagSettingKey = 'enableOrders' | 'enableFollowUps' | 'followUpAutoSend' | 'pilotMode'
  | 'enableCrossSell' | 'enableBankMatch' | 'enableMediaUnderstanding' | 'enableAgentConsult';

export const FLAG_SETTING_KEY: Readonly<Record<BotFeatureFlag, FlagSettingKey>> = {
  EnableOrders: 'enableOrders',
  EnableFollowUps: 'enableFollowUps',
  FollowUpAutoSend: 'followUpAutoSend',
  PilotMode: 'pilotMode',
  EnableCrossSell: 'enableCrossSell',
  EnableBankMatch: 'enableBankMatch',
  EnableMediaUnderstanding: 'enableMediaUnderstanding',
  EnableAgentConsult: 'enableAgentConsult',
};

export function withGlobalFlag(settings: BotSettingsDto, flag: BotFeatureFlag, enabled: boolean): BotSettingsDto {
  return { ...settings, [FLAG_SETTING_KEY[flag]]: enabled };
}

/** Hücrenin üç durumu: satır yok (Genel'i izle), açık ya da kapalı satır. */
export type CellMode = 'inherit' | 'on' | 'off';

export interface FlagScope {
  brandId: number | null;
  brandName: string | null;
  country: string | null;
}

export function scopeKey(scope: Pick<FlagScope, 'brandId' | 'country'>): string {
  return `${scope.brandId ?? '*'}|${scope.country ?? '*'}`;
}

export function scopeLabel(scope: FlagScope): string {
  const brand = scope.brandId === null ? 'Tüm markalar' : (scope.brandName ?? `Marka #${scope.brandId}`);
  return scope.country === null ? `${brand} · tüm ülkeler` : `${brand} · ${scope.country}`;
}

/** Sütunlar: aktif kanalların gerçek çiftleri + (kanalı olmasa da) satırı bulunan kapsamlar. */
export function buildColumns(scopes: FeatureFlagScopeDto[], overrides: FeatureFlagOverrideDto[]): FlagScope[] {
  const byKey = new Map<string, FlagScope>();
  for (const scope of scopes) byKey.set(scopeKey(scope), scope);
  for (const row of overrides) {
    const key = scopeKey(row);
    if (byKey.has(key)) continue;
    const named = scopes.find((s) => s.brandId === row.brandId && s.brandName);
    byKey.set(key, { brandId: row.brandId, brandName: named?.brandName ?? null, country: row.country });
  }
  return [...byKey.values()].sort((a, b) => scopeLabel(a).localeCompare(scopeLabel(b), 'tr'));
}

export function findOverride(
  overrides: FeatureFlagOverrideDto[], flag: BotFeatureFlag, scope: Pick<FlagScope, 'brandId' | 'country'>,
): FeatureFlagOverrideDto | undefined {
  return overrides.find((o) => o.flag === flag && o.brandId === scope.brandId && o.country === scope.country);
}

export function modeOf(override: FeatureFlagOverrideDto | undefined): CellMode {
  if (!override) return 'inherit';
  return override.enabled ? 'on' : 'off';
}

const BRAND_WEIGHT = 2;
const COUNTRY_WEIGHT = 1;

function specificity(row: FeatureFlagOverrideDto): number {
  return (row.brandId === null ? 0 : BRAND_WEIGHT) + (row.country === null ? 0 : COUNTRY_WEIGHT);
}

/** Bir marka/ülke için etkin değer: en özel eşleşen satır, yoksa Genel. */
export function effectiveValue(
  info: FeatureFlagInfoDto, scope: Pick<FlagScope, 'brandId' | 'country'>, overrides: FeatureFlagOverrideDto[],
): boolean {
  if (!info.overridable) return info.globalValue;
  const winner = overrides
    .filter((o) => o.flag === info.flag && specificity(o) > 0
      && (o.brandId === null || o.brandId === scope.brandId)
      && (o.country === null || o.country === scope.country))
    .sort((a, b) => specificity(b) - specificity(a))[0];
  return winner ? winner.enabled : info.globalValue;
}

export function valueText(value: boolean): string {
  return value ? 'açık' : 'kapalı';
}
