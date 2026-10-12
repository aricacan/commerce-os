import {
  ERP_MATCH_FILTER, ERP_READINESS,
  type ErpMatchFilter, type ErpMatchRowDto, type ErpMatchSummaryDto, type ErpReadiness,
} from '../../lib/api/shopify-erp-match';
import type { ExportRow } from '../../components/ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import type { BadgeTone } from '../shared/design';

// ERP eşleştirme ekranının saf kuralları (test edilir). Karşılaştırmanın kendisi sunucuda yapılır.

export const ERP_MATCH_PAGE_SIZE = 50;
export const ERP_MATCH_EXPORT_LIMIT = 5000;
export const DEFAULT_PRICE_TOLERANCE_PERCENT = 1;
export const DEFAULT_STOCK_TOLERANCE = 0;
const PERCENT = 100;

export const ERP_MATCH_FILTER_OPTIONS: { value: ErpMatchFilter; label: string }[] = [
  { value: ERP_MATCH_FILTER.All, label: 'Tümü' },
  { value: ERP_MATCH_FILTER.Matched, label: 'Eşleşenler' },
  { value: ERP_MATCH_FILTER.ShopifyOnly, label: 'Yalnız Shopify\'da' },
  { value: ERP_MATCH_FILTER.ErpOnly, label: 'Yalnız ERP\'de' },
  { value: ERP_MATCH_FILTER.Conflict, label: 'SKU çakışmaları' },
  { value: ERP_MATCH_FILTER.NearMatch, label: 'Neredeyse eşleşenler' },
  { value: ERP_MATCH_FILTER.PriceDiff, label: 'Fiyat farkı olanlar' },
  { value: ERP_MATCH_FILTER.StockDiff, label: 'Stok farkı olanlar' },
  { value: ERP_MATCH_FILTER.Normalize, label: 'Yazımı düzeltilecekler' },
];

const KIND_LABELS: Partial<Record<ErpMatchFilter, string>> = {
  [ERP_MATCH_FILTER.Matched]: 'Eşleşti',
  [ERP_MATCH_FILTER.ShopifyOnly]: 'Yalnız Shopify',
  [ERP_MATCH_FILTER.ErpOnly]: 'Yalnız ERP',
  [ERP_MATCH_FILTER.Conflict]: 'Çakışma',
  [ERP_MATCH_FILTER.NearMatch]: 'Neredeyse',
};

const KIND_TONES: Partial<Record<ErpMatchFilter, BadgeTone>> = {
  [ERP_MATCH_FILTER.Matched]: 'success',
  [ERP_MATCH_FILTER.ShopifyOnly]: 'warning',
  [ERP_MATCH_FILTER.ErpOnly]: 'neutral',
  [ERP_MATCH_FILTER.Conflict]: 'danger',
  [ERP_MATCH_FILTER.NearMatch]: 'warning',
};

export const kindLabel = (kind: ErpMatchFilter): string => KIND_LABELS[kind] ?? kind;
export const kindTone = (kind: ErpMatchFilter): BadgeTone => KIND_TONES[kind] ?? 'neutral';

export const READINESS_META: Record<ErpReadiness, { label: string; tone: BadgeTone }> = {
  [ERP_READINESS.Ready]: { label: 'ERP\'ye çevirmeye hazır', tone: 'success' },
  [ERP_READINESS.Risky]: { label: 'Riskli: önce düzeltin', tone: 'warning' },
  [ERP_READINESS.NotReady]: { label: 'Hazır değil', tone: 'danger' },
};

// 0.9523 → "%95,2" (tr-TR).
export function formatMatchRate(rate: number): string {
  return `%${(rate * PERCENT).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`;
}

// Eşik alanı: boş/geçersiz/negatif değer varsayılana düşer (sunucu da doğrular).
export function parseTolerance(raw: string, fallback: number): number {
  const value = Number(raw.replace(',', '.'));
  return raw.trim() !== '' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function totalPages(totalRows: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalRows / pageSize));
}

// "Sonuç sayısı kartta" için: kartta gösterilen riskli sayıların toplamı.
export function riskCount(summary: ErpMatchSummaryDto): number {
  return summary.conflictCount + summary.nearMatchCount + summary.shopifyWithoutSkuCount;
}

export const ERP_MATCH_CSV_COLUMNS: ExportColumn[] = [
  { key: 'sku', header: 'SKU', type: 'text' },
  { key: 'tur', header: 'Tür', type: 'text' },
  { key: 'shopifyUrun', header: 'Shopify ürün', type: 'text' },
  { key: 'erpUrun', header: 'ERP ürün', type: 'text' },
  { key: 'erpKaynak', header: 'ERP kaynak', type: 'text' },
  { key: 'shopifyFiyat', header: 'Shopify fiyat', type: 'decimal' },
  { key: 'erpFiyat', header: 'ERP fiyat', type: 'decimal' },
  { key: 'shopifyStok', header: 'Shopify stok', type: 'int' },
  { key: 'erpStok', header: 'ERP stok', type: 'int' },
  { key: 'fiyatFarki', header: 'Fiyat farkı', type: 'text' },
  { key: 'stokFarki', header: 'Stok farkı', type: 'text' },
  { key: 'onerilenSku', header: 'Önerilen SKU', type: 'text' },
  { key: 'not', header: 'Not', type: 'text' },
];

const yesNo = (value: boolean): string => (value ? 'Evet' : 'Hayır');
const cell = (value: string | number | null): string | number => value ?? '';

export function toCsvRows(rows: ErpMatchRowDto[]): ExportRow[] {
  return rows.map((r) => ({
    sku: r.sku,
    tur: kindLabel(r.kind),
    shopifyUrun: cell(r.shopifyTitle),
    erpUrun: cell(r.erpName),
    erpKaynak: cell(r.erpSource),
    shopifyFiyat: cell(r.shopifyPrice),
    erpFiyat: cell(r.erpPrice),
    shopifyStok: cell(r.shopifyStock),
    erpStok: cell(r.erpStock),
    fiyatFarki: yesNo(r.priceDiffers),
    stokFarki: yesNo(r.stockDiffers),
    onerilenSku: cell(r.suggestedSku),
    not: cell(r.note),
  }));
}
