import { request } from './core';
import type { ShopifyMoneyDto, ShopifyPageDto, ShopifyWriteResultDto } from './shopify-explorer';

// ─── Shopify Hub: indirim kodları, hediye kartları, pazarlar (H11) ───────────────
//
// Liste canlı Shopify'dan okunur (panelde kopya yok); sayfalama cursor ile (shopify-explorer ile aynı).

export const SHOPIFY_DISCOUNT_VALUE_TYPE = { Percentage: 'percentage', FixedAmount: 'fixed' } as const;
export type ShopifyDiscountValueType = (typeof SHOPIFY_DISCOUNT_VALUE_TYPE)[keyof typeof SHOPIFY_DISCOUNT_VALUE_TYPE];

export interface ShopifyDiscountDto {
  id: number;
  title: string;
  code: string | null;
  // basic | bxgy | freeShipping | app | other — yalnız "basic" tutar/yüzde indirimdir.
  kind: string;
  // Shopify durumu: ACTIVE | EXPIRED | SCHEDULED
  status: string;
  usageCount: number;
  usageLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
  appliesOncePerCustomer: boolean;
  valueType: ShopifyDiscountValueType | null;
  // percentage için 0-100; fixed için para birimi cinsinden.
  value: number | null;
  currency: string | null;
  minimumSubtotal: number | null;
}

// Kod indirimleri ile otomatik indirimlerin Shopify kimlik türü ve mutation'ı farklıdır.
export const SHOPIFY_DISCOUNT_FAMILY = { Code: 'Code', Automatic: 'Automatic' } as const;
export type ShopifyDiscountFamily = (typeof SHOPIFY_DISCOUNT_FAMILY)[keyof typeof SHOPIFY_DISCOUNT_FAMILY];

export interface ShopifyScopeItem {
  id: number;
  title: string;
}

// Tüm ürünler (all) YA DA yalnız ürünler YA DA yalnız koleksiyonlar; ikisi birlikte seçilemez.
export interface ShopifyDiscountScope {
  all: boolean;
  products: ShopifyScopeItem[];
  collections: ShopifyScopeItem[];
}

export interface CreateShopifyDiscountBody {
  title?: string | null;
  code: string;
  valueType: ShopifyDiscountValueType;
  value: number;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  appliesOncePerCustomer: boolean;
  minimumSubtotal?: number | null;
  scope?: ShopifyDiscountScope;
}

// "X al Y öde": getPercentage 0-100 (100 = bedava). Shopify "tüm ürünler" kapsamını bu türde desteklemez.
export interface CreateShopifyBxgyDiscountBody {
  title?: string | null;
  code: string;
  buyQuantity: number;
  buyScope: ShopifyDiscountScope;
  getQuantity: number;
  getPercentage: number;
  getScope: ShopifyDiscountScope;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  appliesOncePerCustomer: boolean;
}

// countryCodes boşsa tüm ülkeler (ISO-2).
export interface CreateShopifyFreeShippingDiscountBody {
  title?: string | null;
  code: string;
  countryCodes: string[];
  minimumSubtotal?: number | null;
  maximumShippingPrice?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  appliesOncePerCustomer: boolean;
}

// Düzenleme formunu dolduran indirim: yalnız kind'a uyan gövde dolu; gövde güncelleme isteğinin aynısıdır.
export interface ShopifyDiscountDetailDto {
  id: number;
  kind: string;
  status: string;
  usageCount: number;
  basic: CreateShopifyDiscountBody | null;
  bxgy: CreateShopifyBxgyDiscountBody | null;
  freeShipping: CreateShopifyFreeShippingDiscountBody | null;
}

export interface ShopifyGiftCardDto {
  id: number;
  lastCharacters: string;
  enabled: boolean;
  expiresOn: string | null;
  createdAt: string;
  note: string | null;
  balance: ShopifyMoneyDto | null;
  initialValue: ShopifyMoneyDto | null;
  customerName: string | null;
}

export interface CreateShopifyGiftCardBody {
  amount: number;
  note?: string;
  customerEmail?: string;
  expiresOn?: string;
}

// Kart kodu YALNIZ bu yanıtta görünür (Shopify sonradan son 4 karakteri verir).
export interface ShopifyGiftCardCreateResultDto {
  result: ShopifyWriteResultDto;
  code: string | null;
}

export interface ShopifyMarketDto {
  id: number;
  name: string;
  status: string;
  type: string;
  baseCurrency: string | null;
  regions: string[];
  priceLists: string[];
}

const storePath = (storeId: number) => `/shopify/stores/${storeId}`;

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

const post = (path: string, body?: unknown) =>
  request<ShopifyWriteResultDto>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

const put = (path: string, body: unknown) =>
  request<ShopifyWriteResultDto>(path, { method: 'PUT', body: JSON.stringify(body) });

export const shopifyPromotionsApi = {
  discounts: (storeId: number, search: string, status: string, after: string | null) =>
    request<ShopifyPageDto<ShopifyDiscountDto>>(withQuery(`${storePath(storeId)}/discounts`, {
      search: search.trim(), status, after: after ?? undefined,
    })),
  discount: (storeId: number, id: number) => request<ShopifyDiscountDetailDto>(`${storePath(storeId)}/discounts/${id}`),
  createDiscount: (storeId: number, body: CreateShopifyDiscountBody) => post(`${storePath(storeId)}/discounts`, body),
  createBxgyDiscount: (storeId: number, body: CreateShopifyBxgyDiscountBody) => post(`${storePath(storeId)}/discounts/bxgy`, body),
  createFreeShippingDiscount: (storeId: number, body: CreateShopifyFreeShippingDiscountBody) =>
    post(`${storePath(storeId)}/discounts/free-shipping`, body),
  updateDiscount: (storeId: number, id: number, body: CreateShopifyDiscountBody) => put(`${storePath(storeId)}/discounts/${id}/basic`, body),
  updateBxgyDiscount: (storeId: number, id: number, body: CreateShopifyBxgyDiscountBody) =>
    put(`${storePath(storeId)}/discounts/${id}/bxgy`, body),
  updateFreeShippingDiscount: (storeId: number, id: number, body: CreateShopifyFreeShippingDiscountBody) =>
    put(`${storePath(storeId)}/discounts/${id}/free-shipping`, body),
  activateDiscount: (storeId: number, id: number, family: ShopifyDiscountFamily) =>
    post(withQuery(`${storePath(storeId)}/discounts/${id}/activate`, { family })),
  deactivateDiscount: (storeId: number, id: number, family: ShopifyDiscountFamily) =>
    post(withQuery(`${storePath(storeId)}/discounts/${id}/deactivate`, { family })),
  deleteDiscount: (storeId: number, id: number, family: ShopifyDiscountFamily) =>
    request<ShopifyWriteResultDto>(withQuery(`${storePath(storeId)}/discounts/${id}`, { family }), { method: 'DELETE' }),
  giftCards: (storeId: number, status: string, after: string | null) =>
    request<ShopifyPageDto<ShopifyGiftCardDto>>(withQuery(`${storePath(storeId)}/gift-cards`, {
      status, after: after ?? undefined,
    })),
  createGiftCard: (storeId: number, body: CreateShopifyGiftCardBody) =>
    request<ShopifyGiftCardCreateResultDto>(`${storePath(storeId)}/gift-cards`, { method: 'POST', body: JSON.stringify(body) }),
  deactivateGiftCard: (storeId: number, id: number) => post(`${storePath(storeId)}/gift-cards/${id}/deactivate`),
  markets: (storeId: number, after: string | null) =>
    request<ShopifyPageDto<ShopifyMarketDto>>(withQuery(`${storePath(storeId)}/markets`, { after: after ?? undefined })),
};
