import { request } from './core';

// ─── Shopify Hub: toplu işlemler + stok uyarıları ───────────────────────────────────────────
//
// Toplu iptal/iade YOKTUR (geri dönüşü zor). Kayıtlar sunucuda sırayla işlenir; her kaydın sonucu ayrıdır.

// Sunucudaki ShopifyBulkLimits.MaxItems ile aynı.
export const SHOPIFY_BULK_MAX_ITEMS = 50;

export interface ShopifyBulkItemResultDto {
  id: number;
  applied: boolean;
  error: string | null;
}

export interface ShopifyBulkResultDto {
  total: number;
  succeeded: number;
  failed: number;
  items: ShopifyBulkItemResultDto[];
}

export interface ShopifyBulkTagsBody {
  ids: number[];
  tags: string[];
  remove: boolean;
}

export interface ShopifyBulkOrderNoteBody {
  ids: number[];
  note: string;
}

// trackingNumbers: boş = takipsiz, tek = hepsine aynı, ids ile aynı sayıda = sırayla her siparişe.
export interface ShopifyBulkFulfillBody {
  ids: number[];
  company?: string;
  trackingNumbers: string[];
  notifyCustomer: boolean;
}

export type ShopifyBulkProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface ShopifyBulkProductStatusBody {
  ids: number[];
  status: ShopifyBulkProductStatus;
}

export interface ShopifyStockAlertItemDto {
  id: number;
  title: string;
  totalInventory: number;
  imageUrl: string | null;
}

export interface ShopifyStockAlertsDto {
  threshold: number;
  outOfStockCount: number;
  lowStockCount: number;
  items: ShopifyStockAlertItemDto[];
}

const storePath = (storeId: number) => `/shopify/stores/${storeId}`;
const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const shopifyBulkApi = {
  tagOrders: (storeId: number, body: ShopifyBulkTagsBody) =>
    post<ShopifyBulkResultDto>(`${storePath(storeId)}/bulk/orders/tags`, body),
  noteOrders: (storeId: number, body: ShopifyBulkOrderNoteBody) =>
    post<ShopifyBulkResultDto>(`${storePath(storeId)}/bulk/orders/note`, body),
  fulfillOrders: (storeId: number, body: ShopifyBulkFulfillBody) =>
    post<ShopifyBulkResultDto>(`${storePath(storeId)}/bulk/orders/fulfill`, body),
  tagProducts: (storeId: number, body: ShopifyBulkTagsBody) =>
    post<ShopifyBulkResultDto>(`${storePath(storeId)}/bulk/products/tags`, body),
  setProductStatus: (storeId: number, body: ShopifyBulkProductStatusBody) =>
    post<ShopifyBulkResultDto>(`${storePath(storeId)}/bulk/products/status`, body),
  stockAlerts: (storeId: number) => request<ShopifyStockAlertsDto>(`${storePath(storeId)}/stock-alerts`),
};
