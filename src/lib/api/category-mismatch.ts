import { request } from './core';

// ─── Category Mismatch (salt okunur bilgi paneli) ──────────────────────────────
// ERP'deki ham kategori adı ile bizim düzelttiğimiz kategori adı arasındaki farkları
// gösterir. Veri, günlük "category-mismatch-check" Hangfire job'u tarafından üretilir —
// bu domain dosyasının yazma/tetikleme metodu yoktur (bkz. CategoryMismatchController).
export interface CategoryMismatchItem {
  id: number;
  platformId: number;
  platformName: string;
  erpRawCategoryId: number;
  erpCategoryName: string;
  internalCategoryId: number;
  internalCategoryName: string;
  accountCode: string;
  storeDisplayName: string;
  affectedProductCount: number;
  checkedAtUtc: string;
}

export interface CategoryMismatchListResponse {
  items: CategoryMismatchItem[];
  lastCheckedAtUtc: string | null;
}

export interface CategoryMismatchProduct {
  id: number;
  name: string;
  supplierSKU: string;
}

// Olu esleme: ham kategori id'si ERP'nin canli agacinda HIC YOK — uyusmazliktan farkli bir
// arizadir (karsilastirilacak ad bile yoktur), bu yuzden ayri uctan gelir ve ayri gosterilir.
// Tum alanlar opsiyonel: frontend backend'den ONCE yayina cikar, eski API bu ucu bilmez.
export interface DeadCategoryMappingItem {
  id: number;
  mappingId?: number;
  platformId?: number;
  platformName?: string;
  erpRawCategoryId?: string;
  internalCategoryId?: number;
  internalCategoryName?: string;
  mappingAccountCode?: string;
  checkedAccountCodes?: string;
  storeDisplayName?: string;
  affectedProductCount?: number;
  checkedAtUtc?: string;
}

export interface DeadCategoryMappingListResponse {
  items?: DeadCategoryMappingItem[];
  lastCheckedAtUtc?: string | null;
}

export const categoryMismatchApi = {
  list: () => request<CategoryMismatchListResponse>('/category-mismatch'),
  getAffectedProducts: (id: number, limit = 50) =>
    request<CategoryMismatchProduct[]>(`/category-mismatch/${id}/products?limit=${limit}`),
  listDead: () => request<DeadCategoryMappingListResponse>('/category-mismatch/dead'),
  deleteDead: (id: number) =>
    request<void>(`/category-mismatch/dead/${id}`, { method: 'DELETE' }),
};
