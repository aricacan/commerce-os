import { request } from './core';
import type { CrossSellRuleDto, PaymentOptionDto } from './omnichannel';
import type { BotFeatureFlag } from './omnichannel-flags';
import type { ChannelBotSummaryDto } from './omnichannel-channel-bot';
import type { HandoffRouteEvent } from './omnichannel-handoff-routes';

// ─── Omnichannel › Kanal Merkezi: bir kanalda ŞU AN geçerli ayarlar ve kaynakları ──
//
// Sunucu, mevcut çözümleyicilerle (bayrak: marka+ülke > marka > ülke > Genel; ödeme: kanal > profil > …)
// etkin değeri ve kazanan kapsamı hesaplar. Ön yüz yeniden hesaplamaz, yalnız gösterir.

export type FlagScopeLevel = 'Global' | 'Country' | 'Brand' | 'BrandCountry';

export type PaymentScopeLevel =
  | 'Channel' | 'CatalogProfile' | 'BrandCountry' | 'Brand' | 'Country' | 'General' | 'BuiltInDefault';

export interface ChannelFlagDto {
  flag: BotFeatureFlag;
  globalValue: boolean;
  value: boolean;
  scope: FlagScopeLevel;
  /** false = kiracı genelinde çalışır; yalnız Genel değiştirilebilir. */
  overridable: boolean;
  /** Değeri veren satır (Genel'den geliyorsa null). */
  overrideId: number | null;
}

export interface ChannelFlagsDto {
  items: ChannelFlagDto[];
  /** Aynı marka+ülkeyi paylaşan diğer aktif kanallar: bu kanal için yazılan satır onları da etkiler. */
  otherChannelsInScope: string[];
}

export interface ChannelPaymentRowDto {
  option: PaymentOptionDto;
  /** false = pasif ya da eksik bilgili; müşteriye sunulmaz. */
  presented: boolean;
}

export interface ChannelPaymentDto {
  level: PaymentScopeLevel;
  rows: ChannelPaymentRowDto[];
  /** Bu kanala özel satırlar. */
  channelRowIds: number[];
  /** Kanalın katalog profiline özel satırlar. */
  profileRowIds: number[];
}

export interface ChannelCatalogSourceDto {
  id: number;
  name: string;
  kind: string;
  country: string;
  /** "Ürün" | "Fiyat" | "Stok" | "Link" | "Ülke varsayılanı" */
  role: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncStatus: string | null;
  lastError: string | null;
  isWebsite: boolean;
}

export interface ChannelCatalogDto {
  profileId: number | null;
  profileName: string | null;
  profileCountry: string | null;
  isCountryDefault: boolean;
  sources: ChannelCatalogSourceDto[];
}

export interface ChannelHandoffRuleDto {
  id: number;
  name: string;
  eventType: HandoffRouteEvent;
  isActive: boolean;
  targetCount: number;
}

export interface ChannelRulesDto {
  crossSell: CrossSellRuleDto[];
  handoff: ChannelHandoffRuleDto[];
}

export interface ChannelEffectiveSettingsDto {
  channelId: number;
  brandId: number | null;
  brandName: string | null;
  country: string | null;
  flags: ChannelFlagsDto;
  payment: ChannelPaymentDto;
  catalog: ChannelCatalogDto;
  rules: ChannelRulesDto;
  /** Kanala özel bot eşik/menü/metin özeti; eski sunucuda yok. */
  bot?: ChannelBotSummaryDto | null;
}

export const channelSettingsApi = {
  get: (channelId: number) =>
    request<ChannelEffectiveSettingsDto>(`/omnichannel/channels/${channelId}/effective-settings`),
};
