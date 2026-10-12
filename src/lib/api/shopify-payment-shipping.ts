import { request } from './core';
import type { ShopifyMoneyDto, ShopifyPageDto, ShopifyWriteResultDto } from './shopify-explorer';

// ─── Shopify Hub: ödeme linkleri (taslak sipariş), kargolama, kargo firmaları ───────────────
//
// Ödeme linki = Shopify taslak siparişinin fatura sayfası (invoiceUrl); müşteri ödeyene kadar gerçek sipariş olmaz.
// Kalem SKU ile verilir, fiyatı Shopify belirler. Kargo firması listesi mağaza başınadır ve boş başlayabilir.

export interface ShopifyDraftLineDto {
  title: string;
  sku: string | null;
  quantity: number;
}

export interface ShopifyDraftOrderListItemDto {
  id: number;
  name: string;
  status: string;
  email: string | null;
  total: ShopifyMoneyDto | null;
  invoiceUrl: string | null;
  createdAt: string;
  lines: ShopifyDraftLineDto[];
}

export interface ShopifyDraftLineBody {
  sku: string;
  quantity: number;
}

export interface CreateShopifyDraftOrderBody {
  lines: ShopifyDraftLineBody[];
  email?: string;
  note?: string;
}

export interface ShopifyDraftOrderResultDto {
  applied: boolean;
  id: number | null;
  name: string | null;
  invoiceUrl: string | null;
  errors: string[];
}

export interface ShopifyFulfillableLineDto {
  id: number;
  fulfillmentOrderId: number;
  title: string;
  sku: string | null;
  remainingQuantity: number;
}

export interface ShopifyFulfillLineBody {
  fulfillableLineId: number;
  quantity: number;
}

// lines boş = kargolanabilir her şey; dolu = yalnız seçilen kalem/adet (kısmi kargolama).
export interface ShopifyFulfillBody {
  lines: ShopifyFulfillLineBody[];
  company?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  notifyCustomer: boolean;
}

export interface ShopifyCarrierDto {
  id: number;
  name: string;
  trackingUrlTemplate: string | null;
}

export interface SaveShopifyCarrierBody {
  name: string;
  trackingUrlTemplate?: string;
}

const storePath = (storeId: number) => `/shopify/stores/${storeId}`;

export const shopifyPaymentShippingApi = {
  draftOrders: (storeId: number, after: string | null) =>
    request<ShopifyPageDto<ShopifyDraftOrderListItemDto>>(
      `${storePath(storeId)}/draft-orders${after ? `?after=${encodeURIComponent(after)}` : ''}`,
    ),
  createDraftOrder: (storeId: number, body: CreateShopifyDraftOrderBody) =>
    request<ShopifyDraftOrderResultDto>(`${storePath(storeId)}/draft-orders`, { method: 'POST', body: JSON.stringify(body) }),
  deleteDraftOrder: (storeId: number, draftOrderId: number) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/draft-orders/${draftOrderId}`, { method: 'DELETE' }),
  sendInvoice: (storeId: number, draftOrderId: number, email?: string) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/draft-orders/${draftOrderId}/send-invoice`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  fulfillableLines: (storeId: number, orderId: number) =>
    request<ShopifyFulfillableLineDto[]>(`${storePath(storeId)}/orders/${orderId}/fulfillable-lines`),
  fulfillOrder: (storeId: number, orderId: number, body: ShopifyFulfillBody) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/orders/${orderId}/fulfill`, { method: 'POST', body: JSON.stringify(body) }),
  carriers: (storeId: number) => request<ShopifyCarrierDto[]>(`${storePath(storeId)}/carriers`),
  addCarrier: (storeId: number, body: SaveShopifyCarrierBody) =>
    request<ShopifyCarrierDto>(`${storePath(storeId)}/carriers`, { method: 'POST', body: JSON.stringify(body) }),
  deleteCarrier: (storeId: number, carrierId: number) =>
    request<void>(`${storePath(storeId)}/carriers/${carrierId}`, { method: 'DELETE' }),
};
