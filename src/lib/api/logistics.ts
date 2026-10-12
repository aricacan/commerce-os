import { request, storeOverrideHeaders } from './core';

// ─── Logistics ────────────────────────────────────────────────────────────────
export const logisticsApi = {
  map: (from?: string, to?: string, platformId?: number, categoryId?: number, storeCode?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (platformId) q.set('platformId', String(platformId));
    if (categoryId) q.set('categoryId', String(categoryId));
    return request<import('../../types/api').LogisticsMapData>(`/logistics/map?${q}`, { headers: storeOverrideHeaders(storeCode) });
  },
};
