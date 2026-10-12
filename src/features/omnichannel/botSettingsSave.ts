import { omnichannelApi, type BotSettingsDto } from '../../lib/api/omnichannel';
import type { BotFeatureFlag } from '../../lib/api/omnichannel-flags';
import { httpStatusOf } from '../../lib/errors';
import { withGlobalFlag } from './featureFlagMatrix';

// Bot ayarlarını kaydetmenin iki yolu da "kayıp güncelleme"ye karşı korunur: Özellikler'de açılan bir anahtar,
// Bot ayarları sekmesinde eski kopyayla basılan Kaydet ile geri kapanmamalı (ve tersi).

// Tek uç yoksa (frontend backend'den önce yayına çıkar) eski sunucu 404/405 döner.
const MISSING_ENDPOINT_STATUSES = new Set([404, 405]);

/** Özellikler sekmesinin Genel anahtarı: yalnız o bayrak yazılır. Eski backend'de en güncel ayarlar okunup PUT edilir. */
export async function saveGlobalFlag(flag: BotFeatureFlag, enabled: boolean): Promise<void> {
  try {
    await omnichannelApi.updateBotFeatureFlag(flag, enabled);
  } catch (e) {
    if (!MISSING_ENDPOINT_STATUSES.has(httpStatusOf(e) ?? 0)) throw e;
    const latest = await omnichannelApi.getBotSettings();
    await omnichannelApi.updateBotSettings(withGlobalFlag(latest, flag, enabled));
  }
}

/** Yalnız bu formda değiştirilen alanlar sunucudaki en güncel ayarların üzerine yazılır. */
export function mergeEdits(original: BotSettingsDto, edited: BotSettingsDto, latest: BotSettingsDto): BotSettingsDto {
  const merged: BotSettingsDto = { ...latest };
  for (const key of Object.keys(edited) as (keyof BotSettingsDto)[]) {
    if (edited[key] !== original[key]) Object.assign(merged, { [key]: edited[key] });
  }
  return merged;
}

/** Bot ayarları formunun Kaydet'i: sunucuyu yeniden okur, yalnız düzenlenen alanları yazar. */
export async function saveEditedSettings(original: BotSettingsDto, edited: BotSettingsDto): Promise<BotSettingsDto> {
  const latest = await omnichannelApi.getBotSettings();
  return omnichannelApi.updateBotSettings(mergeEdits(original, edited, latest));
}
