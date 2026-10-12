import type { PaymentOptionDto } from '../../lib/api/omnichannel';

// Ödeme yöntemi satırının kapsamı. Sunucuda ayrı bir alan yok; kanal/profil/marka/ülke
// alanlarının hangisinin dolu olduğundan çıkarılır (bkz. ChatPaymentOptions).
export const PAYMENT_SCOPE = {
  General: 'general',
  Country: 'country',
  Brand: 'brand',
  BrandCountry: 'brandCountry',
  Profile: 'profile',
  Channel: 'channel',
} as const;
export type PaymentScopeKind = (typeof PAYMENT_SCOPE)[keyof typeof PAYMENT_SCOPE];

// Sunucudaki PaymentOption.AnyCountry.
export const ANY_COUNTRY = '*';

// En özelden en genele: üstteki kapsamda satır varsa alttakiler o müşteri için hiç bakılmaz.
export const PAYMENT_SCOPE_ORDER: readonly PaymentScopeKind[] = [
  PAYMENT_SCOPE.Channel, PAYMENT_SCOPE.Profile, PAYMENT_SCOPE.BrandCountry,
  PAYMENT_SCOPE.Brand, PAYMENT_SCOPE.Country, PAYMENT_SCOPE.General,
];

export const PAYMENT_SCOPE_LABELS: Record<PaymentScopeKind, string> = {
  [PAYMENT_SCOPE.Channel]: 'Kanal',
  [PAYMENT_SCOPE.Profile]: 'Katalog profili',
  [PAYMENT_SCOPE.BrandCountry]: 'Marka + ülke',
  [PAYMENT_SCOPE.Brand]: 'Marka (tüm ülkeler)',
  [PAYMENT_SCOPE.Country]: 'Ülke',
  [PAYMENT_SCOPE.General]: 'Genel (tüm ülkeler)',
};

// Formun "hangi kapsam hangisini ezer" açıklaması.
export const PAYMENT_SCOPE_EXPLANATION =
  'Bir müşteri için ilk satırı bulunan kapsam geçerlidir: Kanal > Katalog profili > Marka + ülke > Marka > Ülke > Genel. ' +
  'Üstteki kapsamda satır varsa (pasif olsa bile) alttakiler o müşteri için hiç kullanılmaz. ' +
  "Hiçbir kapsamda satır yoksa Kosova'da (KS) kapıda ödeme, diğer ülkelerde hiçbir yöntem sunulmaz.";

interface ScopeFields {
  country: boolean;
  brand: boolean;
  profile: boolean;
  channel: boolean;
}

// Kapsam seçilince forma hangi alanların geleceği.
export const PAYMENT_SCOPE_FIELDS: Record<PaymentScopeKind, ScopeFields> = {
  [PAYMENT_SCOPE.General]: { country: false, brand: false, profile: false, channel: false },
  [PAYMENT_SCOPE.Country]: { country: true, brand: false, profile: false, channel: false },
  [PAYMENT_SCOPE.Brand]: { country: false, brand: true, profile: false, channel: false },
  [PAYMENT_SCOPE.BrandCountry]: { country: true, brand: true, profile: false, channel: false },
  [PAYMENT_SCOPE.Profile]: { country: false, brand: false, profile: true, channel: false },
  [PAYMENT_SCOPE.Channel]: { country: false, brand: false, profile: false, channel: true },
};

type ScopeSource = Pick<PaymentOptionDto, 'brandId' | 'country' | 'channelId' | 'catalogProfileId'>;

export function scopeOf(option: ScopeSource): PaymentScopeKind {
  if (option.channelId != null) return PAYMENT_SCOPE.Channel;
  if (option.catalogProfileId != null) return PAYMENT_SCOPE.Profile;
  const anyCountry = option.country === ANY_COUNTRY;
  if (option.brandId != null) return anyCountry ? PAYMENT_SCOPE.Brand : PAYMENT_SCOPE.BrandCountry;
  return anyCountry ? PAYMENT_SCOPE.General : PAYMENT_SCOPE.Country;
}
