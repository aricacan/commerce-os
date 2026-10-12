import { request } from './core';

// ─── Cannibalization Analytics ────────────────────────────────────────────────
export const cannibalizationApi = {
  matrix:    () => request<import('../../types/api').CannibalizationMatrix>('/cannibalization/matrix'),
  trigger:   () => request<{ jobId: string }>('/cannibalization/trigger', { method: 'POST' }),
  jobStatus: (jobId: string) => request<import('../../types/api').JobStatusResponse>(`/cannibalization/job-status/${jobId}`),
};
