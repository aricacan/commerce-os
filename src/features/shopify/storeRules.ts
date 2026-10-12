import {
  SHOPIFY_STORE_STATUS,
  type ConnectShopifyStoreDto,
  type ShopifyStoreDto,
  type ShopifyStoreStatus,
  type UpdateShopifyStoreDto,
} from '../../lib/api/shopify';
import type { BadgeTone } from '../shared/design';

// Shopify Hub mağaza ekranının saf kuralları (test edilir). Asıl doğrulama sunucuda.

export const STORE_STATUS_META: Record<ShopifyStoreStatus, { label: string; tone: BadgeTone }> = {
  [SHOPIFY_STORE_STATUS.Pending]: { label: 'Doğrulanmadı', tone: 'neutral' },
  [SHOPIFY_STORE_STATUS.Connected]: { label: 'Bağlı', tone: 'success' },
  [SHOPIFY_STORE_STATUS.AuthFailed]: { label: 'Bağlantı koptu', tone: 'danger' },
  [SHOPIFY_STORE_STATUS.Disabled]: { label: 'Devre dışı', tone: 'neutral' },
  [SHOPIFY_STORE_STATUS.Uninstalled]: { label: 'Kaldırıldı', tone: 'danger' },
};

// Panelde seçilebilen ülkeler (ISO). Omnichannel iç kodları ("KS", "UK") sunucuda ISO'ya çevrilir.
export const STORE_COUNTRIES = [
  { code: 'XK', label: 'Kosova' },
  { code: 'TR', label: 'Türkiye' },
  { code: 'GB', label: 'Birleşik Krallık' },
  { code: 'AL', label: 'Arnavutluk' },
  { code: 'MK', label: 'Kuzey Makedonya' },
  { code: 'DE', label: 'Almanya' },
] as const;

const SHOP_HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const MYSHOPIFY_SUFFIX = '.myshopify.com';

// "StoreC", "demo-store.myshopify.com", "https://demo-store.myshopify.com/admin" → "storec"; geçersizse null.
// admin.shopify.com/store/<tutamak> adresi de kabul edilir (kullanıcı tarayıcıdan kopyalar).
export function shopHandleFrom(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  if (!value) return null;

  const adminMatch = value.match(/admin\.shopify\.com\/store\/([^/?#]+)/);
  if (adminMatch) value = adminMatch[1];
  value = value.replace(/^https?:\/\//, '').split(/[/?#]/)[0];
  if (value.endsWith(MYSHOPIFY_SUFFIX)) value = value.slice(0, -MYSHOPIFY_SUFFIX.length);

  return SHOP_HANDLE_PATTERN.test(value) ? value : null;
}

export interface AppCredentialsDraft {
  clientId: string;
  clientSecret: string;
}

export const EMPTY_APP_CREDENTIALS: AppCredentialsDraft = { clientId: '', clientSecret: '' };

export type AppCredentialsValidation =
  | { ok: true; credentials: AppCredentialsDraft | null }
  | { ok: false; error: string };

// Kendi Shopify uygulaması: ikisi de boş = genel uygulama (null); biri dolu biri boş = hata.
export function validateAppCredentials(draft: AppCredentialsDraft): AppCredentialsValidation {
  const clientId = draft.clientId.trim();
  const clientSecret = draft.clientSecret.trim();
  if (!clientId && !clientSecret) return { ok: true, credentials: null };
  if (!clientId || !clientSecret) return { ok: false, error: 'Client ID ve Client Secret birlikte girilmeli (ya da ikisi de boş bırakılmalı).' };
  if (/\s/.test(clientId) || /\s/.test(clientSecret)) {
    return { ok: false, error: "Client ID/Secret boşluk içeremez; Dev Dashboard'dan olduğu gibi kopyalayın." };
  }
  return { ok: true, credentials: { clientId, clientSecret } };
}

export type StoreAppBadge = { label: string; tone: BadgeTone };

// Kartta hangi uygulamanın kullanıldığı: mağazaya özel mi, sunucudaki genel uygulama mı.
export function appBadgeFor(store: Pick<ShopifyStoreDto, 'usesOwnApp'>): StoreAppBadge {
  return store.usesOwnApp ? { label: 'Mağazaya özel uygulama', tone: 'info' } : { label: 'Genel uygulama', tone: 'neutral' };
}

export interface ConnectDraft {
  shop: string;
  countryCode: string;
  name: string;
  brandName: string;
  app: AppCredentialsDraft;
}

export type ConnectValidation = { ok: true; body: ConnectShopifyStoreDto } | { ok: false; error: string };

export function validateConnect(draft: ConnectDraft): ConnectValidation {
  const handle = shopHandleFrom(draft.shop);
  if (!handle) return { ok: false, error: 'Mağaza adresini "storec" ya da "demo-store.myshopify.com" biçiminde yazın.' };
  if (!draft.countryCode) return { ok: false, error: 'Ülke seçin.' };
  const app = validateAppCredentials(draft.app);
  if (!app.ok) return app;
  return {
    ok: true,
    body: {
      shopDomain: `${handle}${MYSHOPIFY_SUFFIX}`,
      countryCode: draft.countryCode,
      name: draft.name.trim() || undefined,
      brandName: draft.brandName.trim() || undefined,
      appClientId: app.credentials?.clientId,
      appClientSecret: app.credentials?.clientSecret,
    },
  };
}

// OAuth dönüşünde panel adresine eklenen sonuç (?connected=<id> | ?connectError=<mesaj>).
export type ConnectResult = { kind: 'connected'; storeId: number } | { kind: 'error'; message: string } | null;

export function readConnectResult(params: URLSearchParams): ConnectResult {
  const error = params.get('connectError');
  if (error) return { kind: 'error', message: error };
  const connected = Number(params.get('connected'));
  return Number.isInteger(connected) && connected > 0 ? { kind: 'connected', storeId: connected } : null;
}

export function toUpdateDto(store: ShopifyStoreDto, changes: Partial<UpdateShopifyStoreDto>): UpdateShopifyStoreDto {
  return {
    name: store.name,
    countryCode: store.countryCode,
    brandName: store.brandName,
    orderSyncEnabled: store.orderSyncEnabled,
    codGatewayName: store.codGatewayName,
    codFinancialStatus: store.codFinancialStatus,
    bankTransferGatewayName: store.bankTransferGatewayName,
    catalogAuthority: store.catalogAuthority,
    priceChangeGuardPercent: store.priceChangeGuardPercent,
    ...changes,
  };
}

export const missingScopeCount = (store: Pick<ShopifyStoreDto, 'readiness'>) =>
  store.readiness.reduce((sum, phase) => sum + phase.missingScopes.length, 0);
