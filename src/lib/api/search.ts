import { request } from './core';

// ─── Search ───────────────────────────────────────────────────────────────────
export const searchApi = {
  query: (q: string, signal?: AbortSignal) => request<import('../../types/api').SearchResult>(`/search?q=${encodeURIComponent(q)}`, { signal }),
};
