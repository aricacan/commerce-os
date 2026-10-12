import { request, BASE, uploadHeaders, throwIfNotOk } from './core';

// ─── Fitment Paneli ─────────────────────────────────────────────────────────

export interface FitmentBatch {
  id: number; fileName: string; status: string;
  totalRows: number; matchedRows: number; unmatchedRows: number; approvedRows: number;
  errorMessage: string | null; uploadedAt: string;
}

export type FitmentResolutionStatus = 'Unresolved' | 'Resolved' | 'Suggested' | 'NotFound' | 'Manual';

// Bir uyumlu araç + bizdeki çözümlenmiş kardeş ürün
export interface FitmentVehicle {
  id: number; vehicleMake: string; vehicleModel: string | null; startYear: number | null; endYear: number | null;
  resolvedProductId: number | null; resolvedSku: string | null; resolvedName: string | null;
  score: number | null; status: FitmentResolutionStatus;
}

export interface FitmentRow {
  id: number; batchId: number; rowNumber: number;
  picture: string | null; category: string | null; sku: string; barcode: string | null;
  brand: string | null; model: string | null; year: string | null; sourceStatus: string | null; type: string | null;
  description: string | null; pieceOfOrder: string | null;
  suitableModelsRaw: string | null; colorOptionRaw: string | null;
  matchedProductId: number | null; matchedProductName: string | null;
  rowStatus: 'Unmatched' | 'Matched' | 'Approved' | 'Rejected';
  vehicles: FitmentVehicle[]; parsedColorsPreview: string[];
}

export interface UpdateFitmentRowBody {
  category?: string | null; barcode?: string | null; brand?: string | null; model?: string | null; year?: string | null;
  sourceStatus?: string | null; type?: string | null; description?: string | null; pieceOfOrder?: string | null;
  suitableModelsRaw?: string | null; colorOptionRaw?: string | null;
}

export interface FitmentEntry {
  id: number; vehicleMake: string; vehicleModel: string | null; startYear: number | null; endYear: number | null;
  resolvedProductId: number | null; resolvedSku: string | null; resolvedName: string | null;
}

export interface ProductColorItem { id: number; color: string; }

export interface FitmentProduct {
  productId: number; sku: string; barcode: string | null; name: string;
  brand: string | null; category: string | null; fitmentCount: number; colorCount: number;
}

export interface FitmentProductSearchItem {
  productId: number; sku: string; name: string; category: string | null;
}

export interface FitmentCategoryMap {
  id: number; supplierCategory: string; internalCategoryId: number; internalCategoryName: string; isAutoLearned: boolean;
}

// "Bu ürünün araç listesini kopyala" toplu işleminin her hedef ürün için sonucu.
export interface BulkCopyFitmentsResult {
  targetProductId: number; added: number; skippedDuplicates: number;
}

export const fitmentApi = {
  upload: async (file: File): Promise<FitmentBatch> => {
    const formData = new FormData();
    formData.append('file', file);
    // uploadHeaders = getStoreHeaders() + authHeader() — diğer tüm upload'larla tutarlı, böylece
    // yüklenen fitment batch'i seçili mağazaya scope'lanır (StoreContextMiddleware X-Store'u okur).
    const res = await fetch(`${BASE}/fitment/upload`, { method: 'POST', headers: uploadHeaders(), body: formData });
    await throwIfNotOk(res);
    return res.json();
  },

  batches: (signal?: AbortSignal) => request<FitmentBatch[]>('/fitment/batches', { signal }),

  deleteBatch: (id: number) => request<void>(`/fitment/batches/${id}`, { method: 'DELETE' }),

  rows: (params?: { batchId?: number; status?: string; search?: string; page?: number; pageSize?: number }, signal?: AbortSignal) => {
    const q = new URLSearchParams();
    if (params?.batchId) q.set('batchId', String(params.batchId));
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    return request<{ items: FitmentRow[]; totalCount: number; page: number; pageSize: number }>(`/fitment/rows?${q}`, { signal });
  },

  updateRow: (id: number, body: UpdateFitmentRowBody) =>
    request<FitmentRow>(`/fitment/rows/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteRow: (id: number) => request<void>(`/fitment/rows/${id}`, { method: 'DELETE' }),

  rejectRow: (id: number) => request<void>(`/fitment/rows/${id}/reject`, { method: 'POST' }),

  approveRow: (id: number, newProductName?: string) =>
    request<FitmentRow>(`/fitment/rows/${id}/approve`, {
      method: 'POST', body: JSON.stringify({ newProductName: newProductName ?? null }),
    }),

  // Bir batch'teki tüm "Matched" (eşleşmiş ama onaylanmamış) satırları tek seferde onaylar —
  // "Ürün Fitmentleri" sekmesi sadece onaylanmış satırlardan beslendiği için bu olmadan
  // yüzlerce eşleşmiş satır tek tek onaylanmadıkça o sekme hep boş görünüyordu.
  approveMatchedBatch: (batchId: number) =>
    request<{ approvedCount: number; failedCount: number }>(`/fitment/batches/${batchId}/approve-matched`, { method: 'POST' }),

  // Bir satırın / batch'in kardeş SKU'larını yeniden çözümle
  resolveRow: (id: number) => request<FitmentRow>(`/fitment/rows/${id}/resolve`, { method: 'POST' }),
  resolveBatch: (id: number) => request<void>(`/fitment/batches/${id}/resolve`, { method: 'POST' }),

  // Bir aracın kardeş SKU'sunu elle belirle (productId) / öneriyi onayla (body boş) / temizle (clear)
  updateVehicle: (id: number, body: { resolvedProductId?: number | null; clear?: boolean }) =>
    request<FitmentVehicle>(`/fitment/vehicles/${id}`, {
      method: 'PUT', body: JSON.stringify({ resolvedProductId: body.resolvedProductId ?? null, clear: body.clear ?? false }),
    }),

  // Kardeş ürün seçimi için arama
  productSearch: (q: string, categoryId?: number, signal?: AbortSignal) => {
    const p = new URLSearchParams({ q });
    if (categoryId) p.set('categoryId', String(categoryId));
    return request<FitmentProductSearchItem[]>(`/fitment/product-search?${p}`, { signal });
  },

  products: (params?: { search?: string; page?: number; pageSize?: number }, signal?: AbortSignal) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    return request<{ items: FitmentProduct[]; totalCount: number; page: number; pageSize: number }>(`/fitment/products?${q}`, { signal });
  },

  productDetail: (productId: number, signal?: AbortSignal) =>
    request<{ fitments: FitmentEntry[]; colors: ProductColorItem[] }>(`/fitment/products/${productId}/fitments`, { signal }),

  addFitment: (productId: number, body: { vehicleMake: string; vehicleModel?: string | null; startYear?: number | null; endYear?: number | null; resolvedProductId?: number | null }) =>
    request<FitmentEntry>(`/fitment/products/${productId}/fitments`, { method: 'POST', body: JSON.stringify(body) }),

  deleteFitment: (id: number) => request<void>(`/fitment/fitments/${id}`, { method: 'DELETE' }),

  // Kaynak ürünün TÜM araç uyumluluklarını işaretlenen hedef ürünlere tek seferde kopyalar —
  // aynı marka+model+yıl aralığı hedefte zaten varsa o kayıt atlanır (backend tekilleştirir).
  bulkCopyFitments: (sourceProductId: number, targetProductIds: number[]) =>
    request<BulkCopyFitmentsResult[]>('/fitment/products/bulk-copy', {
      method: 'POST', body: JSON.stringify({ sourceProductId, targetProductIds }),
    }),

  addColor: (productId: number, color: string) =>
    request<ProductColorItem>(`/fitment/products/${productId}/colors`, { method: 'POST', body: JSON.stringify({ color }) }),

  deleteColor: (id: number) => request<void>(`/fitment/colors/${id}`, { method: 'DELETE' }),

  // Kategori haritası (tedarikçi kategorisi -> bizim InternalCategory)
  categoryMaps: (signal?: AbortSignal) => request<FitmentCategoryMap[]>('/fitment/category-maps', { signal }),
  upsertCategoryMap: (supplierCategory: string, internalCategoryId: number) =>
    request<void>('/fitment/category-maps', { method: 'POST', body: JSON.stringify({ supplierCategory, internalCategoryId }) }),
  deleteCategoryMap: (id: number) => request<void>(`/fitment/category-maps/${id}`, { method: 'DELETE' }),
};
