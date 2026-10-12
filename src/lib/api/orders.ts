import { request, storeOverrideHeaders } from './core';

// ─── Order / Claim ────────────────────────────────────────────────────────────
// ERP ile pazaryerinin aynı alan için farklı değer bildirdiği durum. Birleştirmede alanın
// sahibi kazanır, kaybeden değer atılmaz — bu tip o kaydı temsil eder.
export interface OrderSourceDiscrepancy {
  id: number;
  field: string;
  ownerValue: string | null;
  reportedValue: string | null;
  reportedBy: string;
  detectedAt: string;
}

export const orderApi = {
  sourceDiscrepancies: (orderId: number) =>
    request<OrderSourceDiscrepancy[]>(`/order/${orderId}/source-discrepancies`),

  stats: (from?: string, to?: string, compare?: boolean, platformId?: number, categoryId?: number, preset?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (compare) q.set('compare', 'true');
    if (platformId) q.set('platformId', String(platformId));
    if (categoryId) q.set('categoryId', String(categoryId));
    // "month" preset'inde backend takvim-ayı hizalı önceki dönem karşılaştırması yapar
    // (bkz. OrderController.GetStats) — diğer preset'lerde davranışı değiştirmiyor.
    if (preset) q.set('preset', preset);
    return request<import('../../types/api').OrderStatsWithComparison>(`/order/stats?${q}`);
  },
  // Pano giriş ekranı kartı: dört dönemlik ciro tek istekte.
  overview: () => request<import('../../types/api').DashboardOverview>('/order/overview'),

  statsSimple: (from?: string, to?: string, storeCode?: string, platformId?: number, categoryId?: number) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (platformId) q.set('platformId', String(platformId));
    if (categoryId) q.set('categoryId', String(categoryId));
    return request<import('../../types/api').OrderStats>(`/order/stats?${q}`, { headers: storeOverrideHeaders(storeCode) });
  },
  profitSummary: (from?: string, to?: string, platformId?: number, categoryId?: number, storeCode?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (platformId) q.set('platformId', String(platformId));
    if (categoryId) q.set('categoryId', String(categoryId));
    return request<import('../../types/api').ProfitSummary>(`/order/profit-summary?${q}`, { headers: storeOverrideHeaders(storeCode) });
  },
  // KPI kartlarındaki Brüt/Net Kâr "önceki döneme göre" yüzdesi için — mevcut
  // profitSummary()'nin dönüş tipini bozmamak adına ayrı bir metod (o zaten çok
  // yerde düz ProfitSummary bekliyor).
  profitSummaryCompare: (from?: string, to?: string, categoryId?: number, preset?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (categoryId) q.set('categoryId', String(categoryId));
    q.set('compare', 'true');
    if (preset) q.set('preset', preset);
    return request<import('../../types/api').ProfitSummaryWithComparison>(`/order/profit-summary?${q}`);
  },
  profitByProduct: (from?: string, to?: string, top = 8) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    q.set('top', String(top));
    return request<import('../../types/api').ProductProfitLeaderboard>(`/order/profit-by-product?${q}`);
  },
  list: (params?: { dateRange?: string; from?: string; to?: string; search?: string; categoryId?: number; platformId?: number; status?: string; page?: number; pageSize?: number; sortBy?: string; campaignUploadId?: number }, signal?: AbortSignal) => {
    const q = new URLSearchParams();
    if (params?.dateRange)  q.set('dateRange', params.dateRange);
    // from/to (YYYY-MM-DD) dateRange'in ÖNÜNE geçer — bkz. OrderController.GetOrders (P36).
    if (params?.from)       q.set('from', params.from);
    if (params?.to)         q.set('to', params.to);
    if (params?.search)     q.set('search', params.search);
    if (params?.categoryId) q.set('categoryId', String(params.categoryId));
    if (params?.platformId) q.set('platformId', String(params.platformId));
    if (params?.status)     q.set('status', params.status);
    if (params?.page)       q.set('page', String(params.page));
    if (params?.pageSize)   q.set('pageSize', String(params.pageSize));
    if (params?.sortBy)     q.set('sortBy', params.sortBy);
    if (params?.campaignUploadId) q.set('campaignUploadId', String(params.campaignUploadId));
    return request<import('../../types/api').PaginatedResult<import('../../types/api').OrderDetail>>(`/order?${q}`, { signal });
  },
  // "Tümünü çek" (dışa aktarma) senaryosu: backend pageSize üst sınırı (500) kadar SAYFALAYARAK
  // tüm sonuçları toplar. Tek dev pageSize=100000 sorgusu sunucuyu bellek olarak zorlamasın diye —
  // chunk boyutu backend maxPageSize ile uyumlu olmalı.
  listAll: async (params?: { dateRange?: string; from?: string; to?: string; search?: string; categoryId?: number; platformId?: number; status?: string; campaignUploadId?: number; limit?: number }) => {
    const pageSize = 500;
    const { limit, ...listParams } = params ?? {};
    const all: import('../../types/api').OrderDetail[] = [];
    for (let page = 1; page <= 2000; page++) { // 2000×500 = 1M güvenlik tavanı (sonsuz döngüye karşı)
      const res = await orderApi.list({ ...listParams, page, pageSize });
      const items = res?.items ?? [];
      all.push(...items);
      if (items.length < pageSize) break;
      // Dışa aktarımda "İlk N" seçilmişse yeterince sipariş toplandığında dur (ağ tasarrufu).
      // Sipariş başına ≥1 kalem satırı üretildiğinden N sipariş ≥ N çıktı satırı garanti eder.
      if (limit != null && all.length >= limit) break;
    }
    return all;
  },
  updateNote: (orderId: number, note: string | null) =>
    request<{ id: number; note: string | null }>(`/order/${orderId}/note`, {
      method: 'PUT', body: JSON.stringify({ note }),
    }),
  bulkUpdateNote: (orderIds: number[], note: string | null) =>
    request<{ updated: number; total: number; note: string | null }>(`/order/bulk/note`, {
      method: 'PUT', body: JSON.stringify({ orderIds, note }),
    }),
  cancelManual: (orderId: number, reason: string) =>
    request<{ orderId: number; orderNumber: string }>(`/manual-orders/local-order/${orderId}/cancel`, {
      method: 'POST', body: JSON.stringify({ reason }),
    }),
};
