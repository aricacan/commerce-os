import { request } from './core';
import type { ShopifyStoreDto } from './shopify';

// ─── Shopify Hub gezgini (canlı okuma + yazma) ──────────────────────────────────
//
// Siparişler / ürünler / müşteriler Shopify'dan CANLI okunur; panelde kopya tutulmaz. Sayfalama cursor ile:
// yanıttaki endCursor bir sonraki istekte `after` olarak gönderilir. Yazma: sipariş iptali/güncelleme/ödendi, müşteri CRUD.
// Backend enum'ları SAYI olarak gelir; Shopify durum metinleri (PAID, UNFULFILLED…) olduğu gibi metin.

export interface ShopifyMoneyDto {
  amount: number;
  currency: string;
}

// Toplam kayıt (aynı süzgeçle sayılır). isLowerBound: Shopify sayım tavanına ulaştı, gerçek toplam "en az count".
// pageSize: sayfa sayısı = ceil(count / pageSize).
export interface ShopifyTotalDto {
  count: number;
  isLowerBound: boolean;
  pageSize: number;
}

export interface ShopifyPageDto<T> {
  items: T[];
  hasNextPage: boolean;
  endCursor: string | null;
  // Frontend backend'den önce yayınlanabildiği için opsiyonel okunur; null/yok = toplam bilinmiyor.
  total?: ShopifyTotalDto | null;
}

export interface ShopifyOrderListItemDto {
  id: number;
  name: string;
  createdAt: string;
  cancelledAt: string | null;
  financialStatus: string;
  fulfillmentStatus: string;
  total: ShopifyMoneyDto | null;
  itemCount: number;
  customerName: string | null;
  city: string | null;
  countryCode: string | null;
  paymentGateways: string[];
  tags: string[];
  chatOrderId: number | null;
}

export interface ShopifyOrderLineDto {
  title: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: ShopifyMoneyDto | null;
  id: number;
  // Satılan − daha önce iade edilen.
  refundableQuantity: number;
  // Mağazadaki varyant (sipariş düzenlemede kalemi tanımak için); özel kalemde null. Opsiyonel okunur (backend sırası).
  variantId?: number | null;
}

export interface ShopifyOrderAddressDto {
  name: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string | null;
  phone: string | null;
}

export interface ShopifyOrderTrackingDto {
  company: string | null;
  number: string | null;
  url: string | null;
}

export interface ShopifyOrderDetailDto {
  order: ShopifyOrderListItemDto;
  note: string | null;
  email: string | null;
  phone: string | null;
  cancelReason: string | null;
  shippingAddress: ShopifyOrderAddressDto | null;
  lines: ShopifyOrderLineDto[];
  subtotal: ShopifyMoneyDto | null;
  shipping: ShopifyMoneyDto | null;
  tax: ShopifyMoneyDto | null;
  refunded: ShopifyMoneyDto | null;
  tracking: ShopifyOrderTrackingDto[];
  adminUrl: string;
  // null = iptal edilebilir; doluysa edilemeyen sebep.
  cancelBlockedReason: string | null;
}

export interface ShopifyOrderFilters {
  search: string;
  status: string;
  financialStatus: string;
  fulfillmentStatus: string;
  from: string;
  to: string;
}

export const SHOPIFY_CANCEL_REASON = { Customer: 0, Staff: 1, Other: 2 } as const;
export type ShopifyCancelReason = (typeof SHOPIFY_CANCEL_REASON)[keyof typeof SHOPIFY_CANCEL_REASON];

export interface CancelShopifyOrderBody {
  reason: ShopifyCancelReason;
  restock: boolean;
  notifyCustomer: boolean;
  staffNote?: string;
}

export interface ShopifyCancelResultDto {
  applied: boolean;
  message: string | null;
}

export interface ShopifyVariantDto {
  sku: string | null;
  title: string | null;
  price: number | null;
  inventoryQuantity: number | null;
}

export interface ShopifyProductListItemDto {
  id: number;
  title: string;
  status: string;
  productType: string | null;
  vendor: string | null;
  imageUrl: string | null;
  totalInventory: number | null;
  variantCount: number;
  variants: ShopifyVariantDto[];
}

export interface ShopifyProductFilters {
  search: string;
  status: string;
  stock: string;
}

export interface ShopifyCustomerListItemDto {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  orderCount: number;
  createdAt: string;
}

// Yazma gövdeleri: boş / gönderilmeyen alan Shopify'da DEĞİŞMEZ.
export interface SaveShopifyCustomerBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  note?: string;
  tags?: string[];
}

export interface SaveShopifyOrderBody {
  note?: string;
  email?: string;
  phone?: string;
  tags?: string[];
}

// applied=false ise errors Shopify'ın doğrulama mesajlarıdır.
export interface ShopifyWriteResultDto {
  applied: boolean;
  id: number | null;
  errors: string[];
}

export interface ShopifyRefundLineBody {
  lineItemId: number;
  quantity: number;
}

// expectedAmount: önizlemede gösterilen tutar; gerçek hesap farklıysa sunucu iadeyi yapmaz.
export interface ShopifyRefundBody {
  lines: ShopifyRefundLineBody[];
  restockItems: boolean;
  refundShipping: boolean;
  notifyCustomer: boolean;
  note?: string;
  expectedAmount?: number;
}

export interface ShopifyRefundTransactionDto {
  gateway: string;
  amount: ShopifyMoneyDto;
}

export interface ShopifyRefundPreviewDto {
  amount: ShopifyMoneyDto;
  subtotal: ShopifyMoneyDto;
  tax: ShopifyMoneyDto;
  maximumRefundable: ShopifyMoneyDto;
  transactions: ShopifyRefundTransactionDto[];
}

export interface ShopifySkuIssueDto {
  sku: string;
  products: string[];
}

export interface ShopifySkuDiagnosisDto {
  variantsScanned: number;
  truncated: boolean;
  withoutSkuCount: number;
  duplicateSkus: ShopifySkuIssueDto[];
  unmatchedSkus: ShopifySkuIssueDto[];
}

export interface ShopifyShopLiveDto {
  name: string | null;
  currency: string | null;
  timeZone: string | null;
  planName: string | null;
  primaryDomainUrl: string | null;
  grantedScopes: string[];
  missingScopes: string[];
}

export interface ShopifyShopSummaryDto {
  store: ShopifyStoreDto;
  shop: ShopifyShopLiveDto | null;
  liveError: string | null;
}

export const SHOPIFY_GATEWAY_MATCH = { Matched: 0, SpellingDiffers: 1, NotSeen: 2, NotConfigured: 3 } as const;
export type ShopifyGatewayMatch = (typeof SHOPIFY_GATEWAY_MATCH)[keyof typeof SHOPIFY_GATEWAY_MATCH];

export interface ShopifyGatewayUsageDto {
  name: string;
  orderCount: number;
}

export interface ShopifyConfiguredGatewayDto {
  role: 'cod' | 'bankTransfer';
  configuredName: string | null;
  match: ShopifyGatewayMatch;
  seenAs: string | null;
}

export interface ShopifyPaymentGatewayDiagnosisDto {
  sampledOrders: number;
  ordersWithoutGateway: number;
  used: ShopifyGatewayUsageDto[];
  configured: ShopifyConfiguredGatewayDto[];
}

const storePath = (storeId: number) => `/shopify/stores/${storeId}`;

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export const shopifyExplorerApi = {
  summary: (storeId: number) => request<ShopifyShopSummaryDto>(`${storePath(storeId)}/summary`),
  paymentGateways: (storeId: number) =>
    request<ShopifyPaymentGatewayDiagnosisDto>(`${storePath(storeId)}/payment-gateways`),
  orders: (storeId: number, filters: ShopifyOrderFilters, after: string | null) =>
    request<ShopifyPageDto<ShopifyOrderListItemDto>>(withQuery(`${storePath(storeId)}/orders`, {
      search: filters.search.trim(),
      status: filters.status,
      financialStatus: filters.financialStatus,
      fulfillmentStatus: filters.fulfillmentStatus,
      from: filters.from,
      to: filters.to,
      after: after ?? undefined,
    })),
  order: (storeId: number, orderId: number) =>
    request<ShopifyOrderDetailDto>(`${storePath(storeId)}/orders/${orderId}`),
  cancelOrder: (storeId: number, orderId: number, body: CancelShopifyOrderBody) =>
    request<ShopifyCancelResultDto>(`${storePath(storeId)}/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateOrder: (storeId: number, orderId: number, body: SaveShopifyOrderBody) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  markOrderPaid: (storeId: number, orderId: number) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/orders/${orderId}/mark-paid`, { method: 'POST' }),
  previewRefund: (storeId: number, orderId: number, body: ShopifyRefundBody) =>
    request<ShopifyRefundPreviewDto>(`${storePath(storeId)}/orders/${orderId}/refund-preview`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  refundOrder: (storeId: number, orderId: number, body: ShopifyRefundBody) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/orders/${orderId}/refund`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createCustomer: (storeId: number, body: SaveShopifyCustomerBody) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/customers`, { method: 'POST', body: JSON.stringify(body) }),
  updateCustomer: (storeId: number, customerId: number, body: SaveShopifyCustomerBody) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteCustomer: (storeId: number, customerId: number) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/customers/${customerId}`, { method: 'DELETE' }),
  products: (storeId: number, filters: ShopifyProductFilters, after: string | null) =>
    request<ShopifyPageDto<ShopifyProductListItemDto>>(withQuery(`${storePath(storeId)}/products`, {
      search: filters.search.trim(),
      status: filters.status,
      stock: filters.stock,
      after: after ?? undefined,
    })),
  skuDiagnosis: (storeId: number) => request<ShopifySkuDiagnosisDto>(`${storePath(storeId)}/sku-diagnosis`),
  customers: (storeId: number, search: string, after: string | null) =>
    request<ShopifyPageDto<ShopifyCustomerListItemDto>>(withQuery(`${storePath(storeId)}/customers`, {
      search: search.trim(),
      after: after ?? undefined,
    })),
};
