import { request } from './core';

// ─── Shopify Hub (mağaza bağlantıları) ────────────────────────────────────────
//
// Bağlama "Shopify'a bağlan" (OAuth) ile: panel /oauth/start'tan onay adresini alır ve tam sayfa yönlenir;
// Shopify onaydan sonra backend'e döner, backend panele /shopify?connected=<id> (ya da connectError) ile döner.
// Backend enum'ları SAYI olarak gelir.

export const SHOPIFY_STORE_STATUS = { Pending: 0, Connected: 1, AuthFailed: 2, Disabled: 3, Uninstalled: 4 } as const;
export type ShopifyStoreStatus = (typeof SHOPIFY_STORE_STATUS)[keyof typeof SHOPIFY_STORE_STATUS];

export const SHOPIFY_FINANCIAL_STATUS = { Pending: 0, Paid: 1 } as const;
export type ShopifyFinancialStatus = (typeof SHOPIFY_FINANCIAL_STATUS)[keyof typeof SHOPIFY_FINANCIAL_STATUS];

// Stok/fiyat doğruluk kaynağı: Shopify = Hub yazar; Erp = Hub salt okur (yazımı yalnız ERP senkronu yapar).
export const SHOPIFY_CATALOG_AUTHORITY = { Shopify: 0, Erp: 1 } as const;
export type ShopifyCatalogAuthority = (typeof SHOPIFY_CATALOG_AUTHORITY)[keyof typeof SHOPIFY_CATALOG_AUTHORITY];

export interface ShopifyScopeReadinessDto {
  phase: string;
  requiredScopes: string[];
  missingScopes: string[];
  ready: boolean;
}

export interface ShopifyStoreDto {
  id: number;
  name: string;
  shopDomain: string;
  adminUrl: string;
  countryCode: string;
  brandName: string | null;
  currency: string | null;
  apiVersion: string;
  isConnected: boolean;
  // Mağazaya özel Shopify uygulaması var mı (false = genel uygulama). Secret hiçbir yanıtta dönmez.
  usesOwnApp: boolean;
  appClientId: string | null;
  grantedScopes: string[];
  status: ShopifyStoreStatus;
  lastVerifiedAt: string | null;
  lastError: string | null;
  orderSyncEnabled: boolean;
  orderSyncEnabledAt: string | null;
  codGatewayName: string | null;
  codFinancialStatus: ShopifyFinancialStatus;
  bankTransferGatewayName: string | null;
  catalogAuthority: ShopifyCatalogAuthority;
  // Fiyat güvenlik eşiği (yüzde); null = kapalı.
  priceChangeGuardPercent: number | null;
  readiness: ShopifyScopeReadinessDto[];
}

export interface ShopifyAppStatusDto {
  configured: boolean;
  missingSettings: string[];
  callbackUrl: string | null;
  defaultAppConfigured: boolean;
}

export interface ShopifyAppCredentialsDto {
  clientId: string;
  clientSecret: string;
}

export interface ShopifyEmbeddedConfigDto {
  clientId: string | null;
}

export interface ConnectShopifyStoreDto {
  shopDomain: string;
  countryCode: string;
  name?: string;
  brandName?: string;
  // İsteğe bağlı "Kendi Shopify uygulamam": ikisi birlikte; yoksa genel uygulama.
  appClientId?: string;
  appClientSecret?: string;
}

export interface UpdateShopifyStoreDto {
  name: string;
  countryCode: string;
  brandName?: string | null;
  orderSyncEnabled: boolean;
  codGatewayName?: string | null;
  codFinancialStatus: ShopifyFinancialStatus;
  bankTransferGatewayName?: string | null;
  // Boş = mevcut yetki korunur.
  catalogAuthority?: ShopifyCatalogAuthority;
  // Fiyat güvenlik eşiği (1–1000); null = kapalı. Her kayıtta mevcut değer geri gönderilmelidir.
  priceChangeGuardPercent?: number | null;
}

export interface ShopifyVerifyResultDto {
  success: boolean;
  shopName: string | null;
  primaryDomainUrl: string | null;
  error: string | null;
  store: ShopifyStoreDto;
}

export interface ShopifyWebhookSyncResultDto {
  subscribed: string[];
  alreadyPresent: string[];
  errors: string[];
}

const STORES = '/shopify/stores';

export const shopifyApi = {
  appStatus: () => request<ShopifyAppStatusDto>('/shopify/oauth/status'),
  startConnect: (body: ConnectShopifyStoreDto) =>
    request<{ authorizeUrl: string }>('/shopify/oauth/start', { method: 'POST', body: JSON.stringify(body) }),
  stores: () => request<ShopifyStoreDto[]>(STORES),
  update: (id: number, body: UpdateShopifyStoreDto) =>
    request<ShopifyStoreDto>(`${STORES}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  verify: (id: number) => request<ShopifyVerifyResultDto>(`${STORES}/${id}/verify`, { method: 'POST' }),
  syncWebhooks: (id: number) => request<ShopifyWebhookSyncResultDto>(`${STORES}/${id}/webhooks/sync`, { method: 'POST' }),
  setAppCredentials: (id: number, body: ShopifyAppCredentialsDto) =>
    request<ShopifyStoreDto>(`${STORES}/${id}/app-credentials`, { method: 'PUT', body: JSON.stringify(body) }),
  clearAppCredentials: (id: number) => request<ShopifyStoreDto>(`${STORES}/${id}/app-credentials`, { method: 'DELETE' }),
  embeddedConfig: (shop: string) =>
    request<ShopifyEmbeddedConfigDto>(`/shopify/embedded/config?shop=${encodeURIComponent(shop)}`),
  setActive: (id: number, active: boolean) =>
    request<ShopifyStoreDto>(`${STORES}/${id}/${active ? 'enable' : 'disable'}`, { method: 'POST' }),
};
