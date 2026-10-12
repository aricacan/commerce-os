import { request } from './core';

export const ProductGapMatchType = {
  Sku: 0,
  Barcode: 1,
} as const;

export const ProductGapCandidateStatus = {
  Pending: 0,
  Sent: 1,
  Resolved: 2,
  Ignored: 3,
  // Ürün karşı tarafta eksik ama hedef ERP'nin zorunlu tuttuğu bir alan bizde boş —
  // gönderilirse reddedilirdi. "Düzelt" ile tamamlanınca gönderilebilir hale gelir.
  Incomplete: 4,
} as const;

// Eksik alan adı → formdaki etiket. Backend taslak payload adlarını döndürür.
export const MISSING_FIELD_LABELS: Record<string, { tr: string; en: string }> = {
  name: { tr: 'Ürün adı', en: 'Product name' },
  sku: { tr: 'SKU', en: 'SKU' },
  price: { tr: 'Satış fiyatı', en: 'Sale price' },
  purchasePrice: { tr: 'Alış fiyatı', en: 'Purchase price' },
  currency: { tr: 'Para birimi', en: 'Currency' },
  barcode: { tr: 'Barkod', en: 'Barcode' },
  // Ürün alanı değil, hedef ERP hesabının deposu: o hesaptan hiç ürün senkronlanmadıysa
  // depo kimliği çözülemez. Çözümü ürün formu değil, hedef ERP'nin bir kez senkronlanması.
  warehouse: { tr: 'Hedef ERP deposu (senkron gerekli)', en: 'Target ERP warehouse (sync needed)' },
};

// ErpOperationStatus (backend) — gönderilen adayın dış kuyruktaki gerçek durumu.
export const ErpDispatchStatus = {
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

export interface ProductGapScanPair {
  id: number;
  dataSourceAId: number;
  dataSourceAName: string;
  dataSourceBId: number;
  dataSourceBName: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateProductGapScanPair {
  dataSourceAId: number;
  dataSourceBId: number;
}

export interface UpdateProductGapScanPair {
  dataSourceAId: number;
  dataSourceBId: number;
  isActive: boolean;
}

export interface ProductGapCandidate {
  id: number;
  scanPairId: number;
  existingProductId: number;
  productName: string;
  productSku: string | null;
  productBarcode: string | null;
  productPrice: number;
  productPurchasePrice: number | null;
  productCurrency: string;
  productStockQuantity: number;
  productVatRate: number | null;
  productDesi: number;
  productBrand: string | null;
  productModel: string | null;
  productModelYear: string | null;
  productDescription: string | null;
  productInternalCategoryId: number | null;
  productImageCount: number;
  existingDataSourceId: number;
  existingDataSourceName: string;
  missingDataSourceId: number;
  missingDataSourceName: string;
  matchKey: string;
  matchType: number;
  status: number;
  /** status=Incomplete iken doldurulması gereken alan adları. */
  missingFields: string[];
  productDraftId: string | null;
  dispatchStatus: number | null;
  dispatchError: string | null;
  /** Hedef ERP'de oluşan ürünün kendi kimliği (Sentos: product.id). */
  dispatchExternalId: string | null;
  detectedAt: string;
  resolvedAt: string | null;
  ignoredReason: string | null;
}

export interface ProductGapScanRunResult {
  pairsScanned: number;
  candidatesFound: number;
  candidatesResolved: number;
}

export interface ProductGapSendResult {
  candidateId: number;
  success: boolean;
  productDraftId: string | null;
  error: string | null;
}

/** Boş bırakılan her alan kaynak üründen olduğu gibi kopyalanır (birebir gönderim). */
export interface ProductGapSendOverrides {
  name?: string;
  brand?: string;
  model?: string;
  modelYear?: string;
  supplierSku?: string;
  barcode?: string;
  internalCategoryId?: number;
  price?: number;
  purchasePrice?: number;
  currency?: string;
  stockQuantity?: number;
  vatRate?: number;
  desi?: number;
  description?: string;
}

export interface SendProductGapOptions {
  includeImages: boolean;
  overrides?: ProductGapSendOverrides;
}

/** Gönderim geçmişi satırı: ne, kimden nereye, kim, hangi bilgilerle, sonuç ne oldu. */
export interface ProductGapDispatchLog {
  id: number;
  candidateId: number | null;
  productId: number;
  productName: string;
  productSku: string | null;
  sourceName: string;
  targetName: string;
  sentByUserId: number;
  sentByName: string;
  sentAt: string;
  wasEdited: boolean;
  includedImages: boolean;
  sentFields: Record<string, string | null>;
  dispatchStatus: number | null;
  dispatchError: string | null;
  erpExternalId: string | null;
  deletedFromErpAt: string | null;
  canRetry: boolean;
  canDeleteFromErp: boolean;
}

export const productGapApi = {
  dispatchLog: (take = 200) => request<ProductGapDispatchLog[]>(`/product-gap/dispatch-log?take=${take}`),
  pairs: () => request<ProductGapScanPair[]>('/product-gap/pairs'),
  createPair: (body: CreateProductGapScanPair) =>
    request<ProductGapScanPair>('/product-gap/pairs', { method: 'POST', body: JSON.stringify(body) }),
  updatePair: (id: number, body: UpdateProductGapScanPair) =>
    request<ProductGapScanPair>(`/product-gap/pairs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePair: (id: number) => request<void>(`/product-gap/pairs/${id}`, { method: 'DELETE' }),
  scan: (pairId?: number) =>
    request<ProductGapScanRunResult>(`/product-gap/scan${pairId ? `?pairId=${pairId}` : ''}`, { method: 'POST' }),
  candidates: (pairId?: number, status?: number) => {
    const params = new URLSearchParams();
    if (pairId !== undefined) params.set('pairId', String(pairId));
    if (status !== undefined) params.set('status', String(status));
    const qs = params.toString();
    return request<ProductGapCandidate[]>(`/product-gap/candidates${qs ? `?${qs}` : ''}`);
  },
  send: (id: number, options: SendProductGapOptions) =>
    request<ProductGapSendResult>(`/product-gap/candidates/${id}/send`, { method: 'POST', body: JSON.stringify(options) }),
  sendBulk: (ids: number[], includeImages: boolean) =>
    request<ProductGapSendResult[]>('/product-gap/candidates/bulk-send', {
      method: 'POST',
      body: JSON.stringify({ ids, includeImages }),
    }),
  /** Hedef ERP'deki kaydı KALICI siler (yalnızca bu panelden gönderilmiş ürünler). */
  deleteFromErp: (id: number) =>
    request<ProductGapSendResult>(`/product-gap/candidates/${id}/delete-from-erp`, { method: 'POST' }),
  ignore: (id: number, reason: string) =>
    request<ProductGapCandidate>(`/product-gap/candidates/${id}/ignore`, { method: 'POST', body: JSON.stringify({ reason }) }),
};
