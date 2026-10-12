import { request } from './core';

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  summary: () => request<import('../../types/api').DashboardSummary>('/dashboard/summary'),
  dynamicChart: (body: import('../../types/api').DynamicChartRequest, signal?: AbortSignal) =>
    request<import('../../types/api').ChartDataPoint[]>('/dashboard/dynamic-chart', {
      method: 'POST', body: JSON.stringify(body), signal,
    }),
  brandCategoryBreakdown: (topBrands = 8, topCategories = 6, from?: string, to?: string, platformId?: number, categoryId?: number) => {
    const q = new URLSearchParams();
    q.set('topBrands', String(topBrands));
    q.set('topCategories', String(topCategories));
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (platformId) q.set('platformId', String(platformId));
    if (categoryId) q.set('categoryId', String(categoryId));
    return request<import('../../types/api').BrandCategoryBreakdown>(`/dashboard/brand-category-breakdown?${q}`);
  },
  storeComparison: (from?: string, to?: string, platformId?: number, categoryId?: number) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (platformId) q.set('platformId', String(platformId));
    if (categoryId) q.set('categoryId', String(categoryId));
    return request<import('../../types/api').StoreComparisonRow[]>(`/dashboard/store-comparison?${q}`);
  },
};
