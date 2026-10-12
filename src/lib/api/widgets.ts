import { request } from './core';

// ─── Widgets ──────────────────────────────────────────────────────────────────
export const widgetApi = {
  list: () => request<import('../../types/api').SavedWidget[]>('/widget'),
  listWithSignal: (signal: AbortSignal) => request<import('../../types/api').SavedWidget[]>('/widget', { signal }),
  create: (body: { title: string; chartType: string; configJson: string }) =>
    request<import('../../types/api').SavedWidget>('/widget', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { title: string; chartType: string; configJson: string }) =>
    request<import('../../types/api').SavedWidget>(`/widget/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: number) => request<void>(`/widget/${id}`, { method: 'DELETE' }),
  getLayout: () => request<{ layout: string }>('/widget/layout'),
  saveLayout: (layout: string) =>
    request<void>('/widget/layout', { method: 'PUT', body: JSON.stringify({ layout }) }),
};
