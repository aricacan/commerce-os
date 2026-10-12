import type { ShippingCostOrigin, UkShippingZone } from './api/shipping-policies';

// Kargo bölgesi ve kargo tutarı kaynağının Türkçe etiketleri — kargo ekranı ve sipariş
// listesi aynı sözlüğü kullanır.

export const UK_ZONES: { key: UkShippingZone; label: string; short: string }[] = [
  { key: 'Mainland', label: 'İngiltere / Galler (Mainland)', short: 'Mainland' },
  { key: 'Scotland', label: 'İskoçya', short: 'İskoçya' },
  { key: 'NorthernIreland', label: 'Kuzey İrlanda', short: 'K. İrlanda' },
];

export const ZONE_LABELS: Record<string, string> = Object.fromEntries(UK_ZONES.map((z) => [z.key, z.label]));
export const ZONE_SHORT_LABELS: Record<string, string> = Object.fromEntries(UK_ZONES.map((z) => [z.key, z.short]));

// Fiyat tablosunun bölge sütun başlığı; tek bölgeli ülkede (bölge "") sütun yalnızca "Fiyat".
export const zoneColumnLabel = (zone: string) => (zone === '' ? 'Fiyat' : ZONE_SHORT_LABELS[zone] ?? zone);

// Bilinen bölge kodlarının okunur adı; listede olmayan yeni bir ülke kodu olduğu gibi gösterilir.
export const REGION_NAMES: Record<string, string> = { TR: 'Türkiye', UK: 'İngiltere' };

const CURRENCY_SYMBOLS: Record<string, string> = { TRY: '₺', GBP: '£', EUR: '€', USD: '$' };
export const currencySymbol = (currency: string) => CURRENCY_SYMBOLS[currency] ?? `${currency} `;

export const COST_ORIGIN_LABELS: Record<ShippingCostOrigin, string> = {
  Actual: 'Gerçek bedel',
  FreeShipping: 'Ücretsiz kargo',
  Product: 'Ürün kuralı',
  Category: 'Kategori kuralı',
  Default: 'Diğer / sabit fiyat',
  DesiBand: 'Desi tarifesi',
  Missing: 'Eksik',
};
