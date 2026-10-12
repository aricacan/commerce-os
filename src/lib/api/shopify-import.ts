import { request } from './core';

// ─── Shopify Hub toplu içe aktarma (Excel/CSV) ──────────────────────────────────
//
// Dosya tarayıcıda okunur; sunucuya sütun eşlemesi uygulanmış HAM METİN satırları gelir ve doğrulama sunucuda yapılır.
// Yalnız mevcut varyantlar SKU ile güncellenir (ürün oluşturulmaz). Backend enum'ları SAYI olarak gelir.

export const IMPORT_ROW_STATE = { Unchanged: 0, WillUpdate: 1, Invalid: 2, UnmatchedSku: 3 } as const;
export type ImportRowState = (typeof IMPORT_ROW_STATE)[keyof typeof IMPORT_ROW_STATE];

export const IMPORT_OUTCOME = { Applied: 0, Skipped: 1, Failed: 2 } as const;
export type ImportOutcome = (typeof IMPORT_OUTCOME)[keyof typeof IMPORT_OUTCOME];

// Sunucu sınırları (ShopifyImportLimits): önizleme tek istekte, uygulama küçük gruplarla.
export const IMPORT_MAX_ROWS = 500;
export const IMPORT_APPLY_CHUNK_SIZE = 50;

export interface ShopifyImportRowDto {
  rowNumber: number;
  sku: string;
  price?: string;
  stock?: string;
  title?: string;
  description?: string;
  status?: string;
}

export interface ShopifyImportRequest {
  rows: ShopifyImportRowDto[];
  confirmLargePriceChange?: boolean;
}

export interface ShopifyImportFieldChangeDto {
  field: string;
  current: string | null;
  proposed: string | null;
}

export interface ShopifyImportRowPreviewDto {
  rowNumber: number;
  sku: string | null;
  state: ImportRowState;
  productTitle: string | null;
  changes: ShopifyImportFieldChangeDto[];
  requiresConfirmation: boolean;
  message: string | null;
}

export interface ShopifyImportPreviewDto {
  rows: ShopifyImportRowPreviewDto[];
  unchanged: number;
  willUpdate: number;
  invalid: number;
  unmatchedSku: number;
  requiringConfirmation: number;
}

export interface ShopifyImportRowResultDto {
  rowNumber: number;
  sku: string | null;
  outcome: ImportOutcome;
  message: string;
}

export interface ShopifyImportResultDto {
  rows: ShopifyImportRowResultDto[];
  applied: number;
  skipped: number;
  failed: number;
}

const importPath = (storeId: number, action: 'preview' | 'apply') => `/shopify/stores/${storeId}/import/${action}`;

export const shopifyImportApi = {
  preview: (storeId: number, body: ShopifyImportRequest) =>
    request<ShopifyImportPreviewDto>(importPath(storeId, 'preview'), { method: 'POST', body: JSON.stringify(body) }),
  apply: (storeId: number, body: ShopifyImportRequest) =>
    request<ShopifyImportResultDto>(importPath(storeId, 'apply'), { method: 'POST', body: JSON.stringify(body) }),
};
