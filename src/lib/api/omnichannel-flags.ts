import { request } from './core';

// ─── Omnichannel › Özellikler: marka × ülke bayrakları (P32) ───────────────────
//
// Bayrak adları API'de metin olarak gelir/gider (sayı değil). Genel değerler Bot ayarlarındadır;
// buradaki satırlar onları belirli bir marka/ülke için geçersiz kılar.

export const BOT_FEATURE_FLAGS = [
  'EnableOrders',
  'EnableFollowUps',
  'FollowUpAutoSend',
  'PilotMode',
  'EnableCrossSell',
  'EnableBankMatch',
  'EnableMediaUnderstanding',
  'EnableAgentConsult',
] as const;
export type BotFeatureFlag = (typeof BOT_FEATURE_FLAGS)[number];

export interface FeatureFlagInfoDto {
  flag: BotFeatureFlag;
  globalValue: boolean;
  /** false = kiracı genelinde çalışır; yalnız Genel değiştirilebilir. */
  overridable: boolean;
}

/** Aktif kanallarda gerçekten bulunan (marka, ülke) çifti — matris sütunu. */
export interface FeatureFlagScopeDto {
  brandId: number | null;
  brandName: string | null;
  country: string | null;
}

export interface FeatureFlagOverrideDto {
  id: number;
  flag: BotFeatureFlag;
  brandId: number | null;
  country: string | null;
  enabled: boolean;
}

export interface FeatureFlagMatrixDto {
  flags: FeatureFlagInfoDto[];
  scopes: FeatureFlagScopeDto[];
  overrides: FeatureFlagOverrideDto[];
}

export interface FeatureFlagSaveDto {
  flag: BotFeatureFlag;
  brandId: number | null;
  country: string | null;
  enabled: boolean;
}

export const featureFlagsApi = {
  get: () => request<FeatureFlagMatrixDto>('/omnichannel/feature-flags'),
  save: (body: FeatureFlagSaveDto) =>
    request<FeatureFlagOverrideDto>('/omnichannel/feature-flags', { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/omnichannel/feature-flags/${id}`, { method: 'DELETE' }),
};
