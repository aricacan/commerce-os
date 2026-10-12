import type {
  ChannelEffectiveSettingsDto, ChannelFlagDto, FlagScopeLevel, PaymentScopeLevel,
} from '../../lib/api/omnichannel-channel-settings';
import type { ShopifyStoreDto } from '../../lib/api/shopify';
import type { CellMode } from './featureFlagMatrix';

// Kanal Merkezi'nin saf kuralları: kapsam rozet metinleri, bir bayrağın bu kanalın KENDİ kapsamında
// geçersiz kılınıp kılınmadığı ve uyarı metinleri. Etkin değerin kendisi sunucudan gelir; burada hesaplanmaz.

export const FLAG_SCOPE_LABELS: Readonly<Record<FlagScopeLevel, string>> = {
  Global: 'Genel',
  Country: 'Ülke',
  Brand: 'Marka',
  BrandCountry: 'Marka + ülke',
};

export const PAYMENT_LEVEL_LABELS: Readonly<Record<PaymentScopeLevel, string>> = {
  Channel: 'Bu kanala özel',
  CatalogProfile: 'Katalog profili',
  BrandCountry: 'Marka + ülke',
  Brand: 'Marka (tüm ülkeler)',
  Country: 'Ülke',
  General: 'Genel (tüm ülkeler)',
  BuiltInDefault: 'Yerleşik varsayılan',
};

/**
 * Bu kanal için yazılacak bayrak satırının kapsamı: kanalın markası ve ülkesi neyse o.
 * Marka ve ülke yoksa satır yazılamaz (null) — o durum Genel ayarın kendisidir.
 */
export function ownFlagScope(settings: Pick<ChannelEffectiveSettingsDto, 'brandId' | 'country'>): FlagScopeLevel | null {
  if (settings.brandId !== null && settings.country !== null) return 'BrandCountry';
  if (settings.brandId !== null) return 'Brand';
  if (settings.country !== null) return 'Country';
  return null;
}

/** Hücrenin durumu: değeri kanalın KENDİ kapsamındaki satır veriyorsa açık/kapalı, değilse üst kapsamı devralır. */
export function flagCellMode(flag: ChannelFlagDto, own: FlagScopeLevel | null): CellMode {
  if (own === null || flag.scope !== own) return 'inherit';
  return flag.value ? 'on' : 'off';
}

/** "Değer nereden geliyor?" cümlesi. */
export function flagSourceText(flag: ChannelFlagDto): string {
  if (!flag.overridable) return 'Tüm hesap için çalışır; marka/ülke bazında değiştirilemez.';
  if (flag.scope === 'Global') return 'Genel ayardan geliyor.';
  return `${FLAG_SCOPE_LABELS[flag.scope]} satırından geliyor (Genel: ${flag.globalValue ? 'açık' : 'kapalı'}).`;
}

/** Aynı marka+ülkeyi paylaşan başka kanal varsa değişikliğin onları da etkilediğini söyler. */
export function sharedScopeWarning(otherChannels: readonly string[]): string | null {
  if (otherChannels.length === 0) return null;
  return `Bu değişiklik aynı marka ve ülkedeki diğer kanalları da etkiler: ${otherChannels.join(', ')}.`;
}

const isSameCountry = (a: string | null, b: string | null) =>
  (a ?? '').toUpperCase() === (b ?? '').toUpperCase();

/** Kanalın ülkesi ve markasıyla uyuşan Shopify mağazası; yoksa null (kart gösterilmez). */
export function shopifyStoreFor(
  stores: readonly ShopifyStoreDto[], channel: { country: string | null; brandName: string | null },
): ShopifyStoreDto | null {
  if (!channel.country) return null;
  const sameCountry = stores.filter((store) => isSameCountry(store.countryCode, channel.country));
  const sameBrand = sameCountry.filter((store) => store.brandName !== null && store.brandName === channel.brandName);
  return sameBrand[0] ?? (sameCountry.length === 1 ? sameCountry[0] : null);
}
