import { request, BASE, uploadHeaders, throwIfNotOk } from './core';

// ─── Kategori Fiyat Karşılaştırma ──────────────────────────────────────────────
export const categoryPriceApi = {
  targets: () =>
    request<{ total: number; items: import('../../types/api').CategoryPriceTarget[] }>('/category-prices/targets'),

  upsertTarget: (internalCategoryId: number, body: { priceTl: number | null; priceGbp: number | null }) =>
    request<void>(`/category-prices/targets/${internalCategoryId}`, { method: 'PUT', body: JSON.stringify(body) }),

  parseExcel: async (file: File): Promise<import('../../types/api').CategoryPriceParseSummary> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/category-prices/targets/parse-excel`, { method: 'POST', headers: uploadHeaders(), body: formData });
    await throwIfNotOk(res);
    return res.json();
  },

  importRows: (rows: import('../../types/api').ApplyCategoryPriceRow[]) =>
    request<{ applied: number }>('/category-prices/targets/import-excel', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }),

  moderationQueue: () =>
    request<{ total: number; items: import('../../types/api').CategoryPriceModerationItem[] }>('/category-prices/moderation'),

  approveModeration: (id: number) =>
    request<void>(`/category-prices/moderation/${id}/approve`, { method: 'POST' }),

  rejectModeration: (id: number) =>
    request<void>(`/category-prices/moderation/${id}/reject`, { method: 'POST' }),

  tolerance: () => request<import('../../types/api').CategoryPriceTolerance>('/category-prices/tolerance'),

  setTolerance: (body: import('../../types/api').CategoryPriceTolerance) =>
    request<import('../../types/api').CategoryPriceTolerance>('/category-prices/tolerance', { method: 'PUT', body: JSON.stringify(body) }),

  // ERP kaynağı listesi (Sentos-StoreA, Sentos-StoreB, Base-StoreA, Base-StoreB, ...) mevcut
  // erpSourcesApi.list()'ten gelir — Topbar seçicisiyle aynı dinamik DataSources kataloğu,
  // yeni bir ERP eklendiğinde kod değişikliği gerekmeden burada da belirir.
  compare: (dataSourceId: number) =>
    request<import('../../types/api').CategoryPriceCompareResult>(`/category-prices/compare?dataSourceId=${dataSourceId}`),

  overLimit: (dataSourceId: number) =>
    request<import('../../types/api').OverLimitResult>(`/category-prices/over-limit?dataSourceId=${dataSourceId}`),
};

// Kept for backwards compatibility with any remaining callers
export interface AiMatchSuggestion {
  excelName: string;
  price: number;
  modelYear: string | null;
  productId: number;
  productName: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface ImportResult {
  matched: number;
  skipped: number;
  notFound: string[];
  aiSuggestions?: AiMatchSuggestion[];
}
