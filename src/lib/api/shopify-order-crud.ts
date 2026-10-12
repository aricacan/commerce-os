import { request } from './core';
import type { ShopifyWriteResultDto } from './shopify-explorer';

// ─── Shopify Hub sipariş CRUD'u: elle sipariş aç / kalem-adres düzenle / sil ─────
//
// Sipariş yalnız Shopify'da yaşar. Düzenleme yalnız kargolanmamış siparişte, silme yalnız iptal edilmiş siparişte çalışır;
// sunucu reddederse sonuç applied=false + errors döner (sessiz başarısızlık yok).

// Backend ShopifyPaymentKind sayı olarak gelir/gider.
export const SHOPIFY_PAYMENT_KIND = { CashOnDelivery: 0, BankTransferPaid: 1 } as const;
export type ShopifyPaymentKind = (typeof SHOPIFY_PAYMENT_KIND)[keyof typeof SHOPIFY_PAYMENT_KIND];

// ISO-2 ülke kodu ("XK", "TR").
export interface ShopifyOrderAddressInput {
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  district?: string;
  postalCode?: string;
  countryCode: string;
}

export interface ShopifyOrderLineInput {
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateShopifyOrderBody {
  // Doluysa mevcut Shopify müşterisine bağlanır; boşsa e-postayla oluşturulur/bulunur.
  customerId?: number;
  email: string;
  fullName: string;
  address: ShopifyOrderAddressInput;
  lines: ShopifyOrderLineInput[];
  payment: ShopifyPaymentKind;
  shippingAmount?: number;
  note?: string;
  // Ekranın bu sipariş için ürettiği tekil anahtar (çift gönderimi ayırt eder).
  requestKey: string;
}

export interface EditShopifyOrderLineInput {
  variantId?: number;
  sku?: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

// lines doluysa siparişin İSTENEN son kalem listesidir (listede olmayan çıkarılır); address doluysa adres güncellenir.
export interface EditShopifyOrderBody {
  lines?: EditShopifyOrderLineInput[];
  address?: ShopifyOrderAddressInput;
}

const ordersPath = (storeId: number) => `/shopify/stores/${storeId}/orders`;
const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const shopifyOrderCrudApi = {
  create: (storeId: number, body: CreateShopifyOrderBody) =>
    request<ShopifyWriteResultDto>(ordersPath(storeId), { method: 'POST', ...json(body) }),
  edit: (storeId: number, orderId: number, body: EditShopifyOrderBody) =>
    request<ShopifyWriteResultDto>(`${ordersPath(storeId)}/${orderId}/items`, { method: 'PUT', ...json(body) }),
  remove: (storeId: number, orderId: number) =>
    request<ShopifyWriteResultDto>(`${ordersPath(storeId)}/${orderId}`, { method: 'DELETE' }),
};
