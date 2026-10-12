import { request } from './core';

// ─── Cohort Analytics ─────────────────────────────────────────────────────────
export const cohortApi = {
  get: (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to)   q.set('to', params.to);
    return request<import('../../types/api').CohortAnalyticsResponse>(`/cohort-analytics?${q}`);
  },
};
