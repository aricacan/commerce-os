import { request } from './core';

// Base Ürün Takibi paneli — SADECE Base (BaseLinker) kaynaklı ürünler. Mağaza/ERP seçiciden
// bağımsız (bkz. BaseProductTrackingController) — bu yüzden storeOverrideHeaders KULLANILMAZ.
export const baseProductTrackingApi = {
  list: (params?: {
    search?: string;
    marketplaces?: string[];
    matchMode?: 'contains' | 'excludes';
    sortBy?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.search)     q.set('search', params.search);
    if (params?.matchMode)  q.set('matchMode', params.matchMode);
    if (params?.sortBy)     q.set('sortBy', params.sortBy);
    if (params?.page)       q.set('page', String(params.page));
    if (params?.pageSize)   q.set('pageSize', String(params.pageSize));
    (params?.marketplaces ?? []).forEach((m) => q.append('marketplaces', m));
    return request<import('../../types/api').PaginatedResult<import('../../types/api').BaseProductTrackingItem>>(
      `/base-product-tracking?${q}`
    );
  },
  marketplaces: () => request<string[]>('/base-product-tracking/marketplaces'),
};
