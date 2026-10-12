import { request } from './core';
import type { BotMenuOptionDto, BotTextEntryDto, BotTextOverrideDto } from './omnichannel';

// ─── Omnichannel › Kanal Merkezi › Bot: kanal bazlı geçersiz kılmalar ─────────────
//
// Çözümleme sırası sunucuda: kanalın kendi değeri → hesap geneli → koddaki varsayılan. Ön yüz yeniden
// hesaplamaz; sunucunun verdiği etkin değeri ve "kanala özel mi?" bilgisini gösterir.

/** Kanalda geçersiz kılınabilen eşikler (hesap geneli BotSettings alanlarıyla aynı adlar). */
export interface BotThresholdValues {
  autoAnswerThreshold: number;
  ambiguityThreshold: number;
  ambiguityGap: number;
  photoMatchThreshold: number;
  maxConsecutiveReplies: number;
  sessionGapDays: number;
}

export type BotThresholdKey = keyof BotThresholdValues;

/** null = bu alan hesap genelini izler. */
export type BotThresholdOverrides = { [K in BotThresholdKey]: number | null };

export interface ChannelThresholdsDto {
  account: BotThresholdValues;
  overrides: BotThresholdOverrides;
  effective: BotThresholdValues;
}

export interface ChannelMenuDto {
  /** true = kanalın kendi menüsü var; false = hesap geneli menü kullanılıyor. */
  isCustom: boolean;
  /** Kanalda geçerli menü (özel ya da hesap geneli). */
  options: BotMenuOptionDto[];
  accountMenu: BotMenuOptionDto[];
}

/** Entries: varsayılan sütunları hesabın etkin metni, tr/en/sq sütunları kanalın özel metni. */
export interface ChannelTextsDto {
  customCount: number;
  entries: BotTextEntryDto[];
}

export interface ChannelBotOverrideDto {
  channelId: number;
  hasAny: boolean;
  version: number;
  updatedAt: string | null;
  thresholds: ChannelThresholdsDto;
  menu: ChannelMenuDto;
  texts: ChannelTextsDto;
  /** FAZ 2: canlı bot hattı sürümü ("" = varsayılan). Eski backend göndermez → undefined. */
  liveVersion?: string | null;
  /** FAZ 2: gölge sürüm (null = kapalı). Gölge cevap müşteriye gitmez, yalnız kıyas için izlenir. */
  shadowVersion?: string | null;
}

/** Kanalın bot hattı sürüm seçimi (FAZ 2). */
export interface ChannelBotVersions {
  liveVersion: string;
  shadowVersion: string | null;
}

/** effective-settings içindeki özet: rozet ve sayılar, menü/metin gövdesi yok. */
export interface ChannelBotSummaryDto {
  hasAny: boolean;
  thresholds: ChannelThresholdsDto;
  menuIsCustom: boolean;
  menuOptionCount: number;
  customTextCount: number;
}

const base = (channelId: number) => `/omnichannel/channels/${channelId}/bot-override`;
const put = (body: unknown) => ({ method: 'PUT', body: JSON.stringify(body) });

export const channelBotOverrideApi = {
  get: (channelId: number) => request<ChannelBotOverrideDto>(base(channelId)),
  // Sürüm alanları kanal ayarı gövdesinde eşiklerle birlikte gider (FAZ2-API.md); eşik kaydı mevcut sürüm
  // seçimini de taşır ki sunucu eksik alanı "kapalı" sanmasın. Eski backend sürümü bilmiyorsa versions null.
  saveThresholds: (channelId: number, body: BotThresholdOverrides, versions: ChannelBotVersions | null = null) =>
    request<ChannelBotOverrideDto>(`${base(channelId)}/thresholds`, put(versions ? { ...body, ...versions } : body)),
  saveMenu: (channelId: number, options: BotMenuOptionDto[]) =>
    request<ChannelBotOverrideDto>(`${base(channelId)}/menu`, put(options)),
  clearMenu: (channelId: number) =>
    request<ChannelBotOverrideDto>(`${base(channelId)}/menu`, { method: 'DELETE' }),
  saveTexts: (channelId: number, overrides: BotTextOverrideDto[]) =>
    request<ChannelBotOverrideDto>(`${base(channelId)}/texts`, put(overrides)),
  clearTexts: (channelId: number) =>
    request<ChannelBotOverrideDto>(`${base(channelId)}/texts`, { method: 'DELETE' }),
  clearAll: (channelId: number) =>
    request<ChannelBotOverrideDto>(base(channelId), { method: 'DELETE' }),
};
