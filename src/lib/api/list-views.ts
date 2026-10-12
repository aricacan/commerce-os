import { request } from './core';

export interface SavedListView {
  id: number;
  pageKey: string;
  name: string;
  /** Normalize edilmiş filtre — `page` içermez. */
  queryString: string;
  columns: string[] | null;
  isShared: boolean;
  isDefault: boolean;
  /** false ise başkasının paylaştığı görünüm: uygulanabilir ama düzenlenemez. */
  isOwn: boolean;
}

export interface UpsertListViewBody {
  pageKey: string;
  name: string;
  queryString: string;
  columns: string[] | null;
  isShared: boolean;
  isDefault: boolean;
}

// ─── Kayıtlı liste görünümleri (FAZ 6) ────────────────────────────────────────
// Görünüm = pageKey + querystring. Liste uçlarının hiçbiri değişmez; ekran sadece
// kaydedilmiş query string'e gider.
export const listViewsApi = {
  list: (pageKey: string) =>
    request<SavedListView[]>(`/list-views?pageKey=${encodeURIComponent(pageKey)}`),

  create: (body: UpsertListViewBody) =>
    request<SavedListView>('/list-views', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: number, body: UpsertListViewBody) =>
    request<SavedListView>(`/list-views/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  remove: (id: number) => request<void>(`/list-views/${id}`, { method: 'DELETE' }),
};
