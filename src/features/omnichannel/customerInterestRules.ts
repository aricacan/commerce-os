import { INTEREST_STATUS, type CustomerInterestDto, type InterestStatus } from '../../lib/api/customer-crm';
import type { TagColor } from '../../lib/api/customers';
import { formatOrderMoney } from './chatOrderRules';

// "İlgilendiği ürünler" satırının saf kuralları: durum etiketi, rengi (etiket paletinden) ve fiyat.

export const INTEREST_STATUS_LABELS: Record<InterestStatus, string> = {
  [INTEREST_STATUS.Asked]: 'Sordu',
  [INTEREST_STATUS.Quoted]: 'Fiyat verildi',
  [INTEREST_STATUS.OutOfStock]: 'Stokta yok',
  [INTEREST_STATUS.NotInCatalog]: 'Katalogda yok',
  [INTEREST_STATUS.Ordered]: 'Sipariş verdi',
  [INTEREST_STATUS.Lost]: 'Kayıp',
};

// Mavi = süreç sürüyor, amber = engel (stok/katalog), yeşil = kazanıldı, gül = kaybedildi.
export const INTEREST_STATUS_TONES: Record<InterestStatus, TagColor> = {
  [INTEREST_STATUS.Asked]: 'neutral',
  [INTEREST_STATUS.Quoted]: 'blue',
  [INTEREST_STATUS.OutOfStock]: 'amber',
  [INTEREST_STATUS.NotInCatalog]: 'amber',
  [INTEREST_STATUS.Ordered]: 'green',
  [INTEREST_STATUS.Lost]: 'rose',
};

// Temsilcinin seçebileceği durumlar (menü sırası = satış hunisi sırası).
export const INTEREST_STATUS_OPTIONS = Object.values(INTEREST_STATUS) as InterestStatus[];

// Bilinmeyen (ileride eklenmiş) durum çökertmesin: nötr "Sordu" gibi gösterilir.
export function interestStatusLabel(status: number): string {
  return INTEREST_STATUS_LABELS[status as InterestStatus] ?? INTEREST_STATUS_LABELS[INTEREST_STATUS.Asked];
}

export function interestStatusTone(status: number): TagColor {
  return INTEREST_STATUS_TONES[status as InterestStatus] ?? 'neutral';
}

export function formatInterestPrice(interest: Pick<CustomerInterestDto, 'lastQuotedPrice' | 'currency'>): string | null {
  if (interest.lastQuotedPrice === null) return null;
  return formatOrderMoney(interest.lastQuotedPrice, interest.currency ?? '');
}

// Açık ilgiler (karar verilmemiş) üstte, sonra en son sorulan.
const CLOSED_STATUSES: readonly InterestStatus[] = [INTEREST_STATUS.Ordered, INTEREST_STATUS.Lost];

export function sortInterests(items: readonly CustomerInterestDto[]): CustomerInterestDto[] {
  return [...items].sort((a, b) => {
    const closedDiff = Number(CLOSED_STATUSES.includes(a.status)) - Number(CLOSED_STATUSES.includes(b.status));
    return closedDiff !== 0 ? closedDiff : b.lastAskedAt.localeCompare(a.lastAskedAt);
  });
}
