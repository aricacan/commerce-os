import { request, BASE, uploadHeaders, throwIfNotOk } from './core';

// ─── Campaign DSS ─────────────────────────────────────────────────────────────
export const campaignApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/campaign/upload`, {
      method: 'POST',
      headers: uploadHeaders(),
      body: formData,
    });
    await throwIfNotOk(res);
    return res.json() as Promise<import('../../types/api').CampaignUploadInfo>;
  },

  uploads: () =>
    request<import('../../types/api').CampaignUploadInfo[]>('/campaign/uploads'),

  deleteUpload: (id: number) =>
    request<void>(`/campaign/uploads/${id}`, { method: 'DELETE' }),

  analysis: (uploadId: number) =>
    request<import('../../types/api').CampaignAnalysis>(`/campaign/analysis/${uploadId}`),

  bestActions: () =>
    request<import('../../types/api').BestActionsResponse>('/campaign/best-actions'),

  tariff: () =>
    request<import('../../types/api').TariffReference>('/campaign/tariff'),

  productCosts: (params?: { page?: number; pageSize?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    if (params?.search) q.set('search', params.search);
    return request<import('../../types/api').PaginatedResult<import('../../types/api').ProductCostInfo>>(
      `/campaign/product-costs?${q}`
    );
  },

  upsertCost: (body: { productId: number; buyingPrice: number; packagingCost: number }) =>
    request<void>('/campaign/product-costs', { method: 'POST', body: JSON.stringify(body) }),

  bulkCosts: (costs: Array<{ productId: number; buyingPrice: number; packagingCost: number }>) =>
    request<{ inserted: number; updated: number }>('/campaign/product-costs/bulk', {
      method: 'POST',
      body: JSON.stringify(costs),
    }),

  importCostsExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/campaign/product-costs/import-excel`, {
      method: 'POST',
      headers: uploadHeaders(),
      body: formData,
    });
    await throwIfNotOk(res);
    return res.json() as Promise<{ inserted: number; updated: number; skipped: number }>;
  },
};
