import { BASE, request, throwIfNotOk, uploadHeaders } from './core';

export const ProductDraftStatus = {
  Draft: 0,
  AwaitingApproval: 1,
  Approved: 2,
  Rejected: 3,
  Cancelled: 4,
  ReadyToDispatch: 5,
  Queued: 6,
  Completed: 7,
  Failed: 8,
} as const;

export const ErpOperationTarget = {
  Local: 0,
  ExternalErp: 1,
} as const;

export const ErpOperationStatus = {
  Draft: 0,
  AwaitingApproval: 1,
  Approved: 2,
  DispatchDisabled: 3,
  Queued: 4,
  Processing: 5,
  Succeeded: 6,
  PartiallySucceeded: 7,
  Failed: 8,
  Rejected: 9,
  Cancelled: 10,
  ReadyToDispatch: 11,
} as const;

export interface SaveProductDraft {
  storeId: number;
  name: string;
  brand?: string;
  model?: string;
  modelYear?: string;
  supplierSku?: string;
  barcode?: string;
  internalCategoryId?: number;
  boxId?: number;
  price: number;
  currency: string;
  stockQuantity: number;
  vatRate?: number;
  desi: number;
  description?: string;
  imageUrls: string[];
  note?: string;
  keepLocally: boolean;
  targetDataSourceIds: number[];
}

export interface ProductDraft {
  id: string;
  draftNumber: string;
  storeId: number;
  storeName: string;
  status: number;
  name: string;
  brand: string | null;
  model: string | null;
  modelYear: string | null;
  supplierSku: string;
  barcode: string | null;
  internalCategoryId: number | null;
  categoryName: string | null;
  boxId: number | null;
  boxName: string | null;
  price: number;
  currency: string;
  stockQuantity: number;
  vatRate: number | null;
  desi: number;
  description: string | null;
  imageUrls: string[];
  note: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  localProductId: number | null;
  createdAt: string;
  updatedAt: string;
  destinations: Array<{
    target: number;
    dataSourceId: number | null;
    name: string;
    status: number;
    idempotencyKey: string;
  }>;
}

export interface ProductDraftContext {
  externalDispatchEnabled: boolean;
  dispatchNotice: string;
  stores: Array<{
    id: number;
    name: string;
    // Bkz. manual-orders.ts — opsiyonel, yoksa "destekleniyor" varsayilir.
    erpSources: Array<{ id: number; name: string; connectorType: string; country: string; supportsDispatch?: boolean }>;
  }>;
  categories: Array<{ id: number; name: string }>;
  boxes: Array<{ id: number; boxCode: string; name: string }>;
}

export interface BroadcastStoreTarget {
  storeId: number;
  keepLocally: boolean;
  targetDataSourceIds: number[];
}

export interface BroadcastProductDraft {
  name: string;
  brand?: string;
  model?: string;
  modelYear?: string;
  supplierSku?: string;
  barcode?: string;
  internalCategoryId?: number;
  boxId?: number;
  price: number;
  currency: string;
  stockQuantity: number;
  vatRate?: number;
  desi: number;
  description?: string;
  imageUrls: string[];
  note?: string;
  storeTargets: BroadcastStoreTarget[];
}

export interface BroadcastProductDraftResult {
  storeId: number;
  success: boolean;
  draft: ProductDraft | null;
  error: string | null;
}

export interface ProductDraftImportRowResult {
  rowNumber: number;
  success: boolean;
  draftNumber: string | null;
  error: string | null;
}

export interface ProductDraftImportResult {
  created: number;
  failed: number;
  rows: ProductDraftImportRowResult[];
}

export const productDraftApi = {
  context: () => request<ProductDraftContext>('/product-drafts/context'),
  list: () => request<ProductDraft[]>('/product-drafts'),
  get: (id: string) => request<ProductDraft>(`/product-drafts/${id}`),
  create: (body: SaveProductDraft) => request<ProductDraft>('/product-drafts', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: SaveProductDraft) => request<ProductDraft>(`/product-drafts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  submit: (id: string) => request<ProductDraft>(`/product-drafts/${id}/submit`, { method: 'POST' }),
  approve: (id: string) => request<ProductDraft>(`/product-drafts/${id}/approve`, { method: 'POST' }),
  reject: (id: string, reason: string) => request<ProductDraft>(`/product-drafts/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  dispatch: (id: string) => request<ProductDraft>(`/product-drafts/${id}/dispatch`, { method: 'POST' }),
  cancel: (id: string, reason: string) => request<ProductDraft>(`/product-drafts/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reopen: (id: string) => request<ProductDraft>(`/product-drafts/${id}/reopen`, { method: 'POST' }),
  broadcast: (body: BroadcastProductDraft) =>
    request<BroadcastProductDraftResult[]>('/product-drafts/broadcast', { method: 'POST', body: JSON.stringify(body) }),
  importExcel: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${BASE}/product-drafts/import-excel`, { method: 'POST', headers: uploadHeaders(), body: form });
    await throwIfNotOk(response);
    return response.json() as Promise<ProductDraftImportResult>;
  },
};
