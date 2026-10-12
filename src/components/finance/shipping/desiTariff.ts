import type { ShippingRate, ShippingRateBandBody } from '../../../types/api';
import { zoneColumnLabel } from '../../../lib/shipping-labels';
import { nextRuleKey, parseAmount, type ZonePrices } from './policyDraft';

// Desi tarifesi ızgarasının saf kuralları: sunucu satırları (bant × bölge) ↔ düzenlenebilir
// bantlar ↔ Excel. Excel biçimi: "Min Desi" | "Max Desi" | her bölge için bir fiyat sütunu.

export interface DesiBandDraft {
  key: string;
  minDesi: string;
  maxDesi: string;
  prices: ZonePrices;
}

export const MIN_DESI_HEADER = 'Min Desi';
export const MAX_DESI_HEADER = 'Max Desi';

/** Taşıyıcının satırlarını bantlara toplar; bölgesiz eski satır her bölge sütununda görünür. */
export function toBandDrafts(rates: ShippingRate[], zones: string[]): DesiBandDraft[] {
  const bands = new Map<string, ShippingRate[]>();
  for (const rate of rates) {
    const key = `${rate.minDesi}|${rate.maxDesi}`;
    bands.set(key, [...(bands.get(key) ?? []), rate]);
  }

  return [...bands.values()]
    .sort((a, b) => a[0].minDesi - b[0].minDesi)
    .map((group) => {
      const anyZone = group.find((r) => r.zone === '');
      return {
        key: nextRuleKey(),
        minDesi: String(group[0].minDesi),
        maxDesi: String(group[0].maxDesi),
        prices: Object.fromEntries(zones.map((zone) => {
          const rate = group.find((r) => r.zone === zone) ?? anyZone;
          return [zone, rate ? String(rate.price) : ''];
        })),
      };
    });
}

export type BandValidation = { bands: ShippingRateBandBody[]; error: null } | { bands: null; error: string };

export function toBandBodies(drafts: DesiBandDraft[], zones: string[]): BandValidation {
  const bands: ShippingRateBandBody[] = [];
  for (const draft of drafts) {
    const blank = !draft.minDesi.trim() && !draft.maxDesi.trim() && zones.every((z) => !(draft.prices[z] ?? '').trim());
    if (blank) continue;

    const min = parseAmount(draft.minDesi);
    const max = parseAmount(draft.maxDesi);
    if (min === null || max === null || min < 0 || max < min)
      return { bands: null, error: `Geçersiz desi aralığı: ${draft.minDesi || '?'} – ${draft.maxDesi || '?'}.` };

    const prices: Record<string, number> = {};
    for (const zone of zones) {
      const text = draft.prices[zone] ?? '';
      if (!text.trim()) continue;
      const price = parseAmount(text);
      if (price === null || price < 0) return { bands: null, error: `${min}–${max} desi: geçersiz fiyat.` };
      prices[zone] = price;
    }
    if (Object.keys(prices).length === 0) return { bands: null, error: `${min}–${max} desi bandına fiyat girin.` };
    bands.push({ minDesi: min, maxDesi: max, prices });
  }

  const sorted = [...bands].sort((a, b) => a.minDesi - b.minDesi);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].minDesi <= sorted[i - 1].maxDesi)
      return { bands: null, error: `Desi bantları çakışıyor: ${sorted[i - 1].minDesi}–${sorted[i - 1].maxDesi} ve ${sorted[i].minDesi}–${sorted[i].maxDesi}.` };
  }
  return { bands: sorted, error: null };
}

/** Excel'e yazılacak satırlar (şablon için drafts boş verilir). */
// Boş hücre "" — Excel'de 0 yazılırsa "fiyat yok" ile "ücretsiz" karışır.
const cell = (text: string): string | number => parseAmount(text) ?? '';

export function toExcelRows(drafts: DesiBandDraft[], zones: string[]): Record<string, string | number>[] {
  return drafts.map((draft) => ({
    [MIN_DESI_HEADER]: cell(draft.minDesi),
    [MAX_DESI_HEADER]: cell(draft.maxDesi),
    ...Object.fromEntries(zones.map((zone) => [zoneColumnLabel(zone), cell(draft.prices[zone] ?? '')])),
  }));
}

export const excelHeaders = (zones: string[]) => [MIN_DESI_HEADER, MAX_DESI_HEADER, ...zones.map(zoneColumnLabel)];

const normalizeHeader = (text: string) => text.trim().toLocaleLowerCase('tr-TR');

/**
 * Excel'den okunan satırlar (başlık → hücre metni) → bantlar. Sütunlar başlık adından bulunur;
 * sıra önemli değil. Eksik bölge sütunu boş fiyat demektir.
 */
export function fromExcelRows(rows: Record<string, string>[], zones: string[]): { drafts: DesiBandDraft[]; error: string | null } {
  if (rows.length === 0) return { drafts: [], error: 'Dosyada satır yok.' };

  const headers = Object.keys(rows[0]);
  const find = (label: string) => headers.find((h) => normalizeHeader(h) === normalizeHeader(label));
  const minHeader = find(MIN_DESI_HEADER);
  const maxHeader = find(MAX_DESI_HEADER);
  if (!minHeader || !maxHeader) return { drafts: [], error: `"${MIN_DESI_HEADER}" ve "${MAX_DESI_HEADER}" sütunları bulunamadı — şablonu indirip kullanın.` };

  const zoneHeaders = zones.map((zone) => [zone, find(zoneColumnLabel(zone))] as const);
  if (zoneHeaders.every(([, header]) => !header))
    return { drafts: [], error: `Fiyat sütunu bulunamadı (beklenen: ${zones.map(zoneColumnLabel).join(', ')}).` };

  const drafts = rows
    .map((row) => ({
      key: nextRuleKey(),
      minDesi: (row[minHeader] ?? '').trim(),
      maxDesi: (row[maxHeader] ?? '').trim(),
      prices: Object.fromEntries(zoneHeaders.map(([zone, header]) => [zone, header ? (row[header] ?? '').trim() : ''])),
    }))
    .filter((d) => d.minDesi || d.maxDesi);
  return { drafts, error: null };
}
