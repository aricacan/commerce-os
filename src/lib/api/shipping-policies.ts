import { request } from './core';

// ─── Kargo Ayarları (backend ShippingPoliciesController) ──────────────────────
// Yöntem (desi / kategori / sabit), teslimat bölgesi bazlı fiyatlar, ödeme şekli, ücretsiz
// kargo eşiği ve tarihli sürümler.

export type ShippingChargeBasis = 'PerItem' | 'PerOrder';
export type FreeShippingEffect = 'CustomerOnly' | 'CarrierCostWaived';
// "Default" = kategori yönteminde "diğer tüm kategoriler", sabit yöntemde tüm ürünler.
// "FreeShipping" = teslimat bölgesinin ücretsiz kargo eşiği (price = sipariş tutarı).
export type ShippingRuleTarget = 'Product' | 'Category' | 'Default' | 'FreeShipping';
// Kural tutmayan ürünün kargosu neye göre fiyatlanır (ürün istisnası her yöntemde önce gelir).
export type ShippingPricingMethod = 'DesiBand' | 'Category' | 'Flat';
export type UkShippingZone = 'Mainland' | 'Scotland' | 'NorthernIreland';
export type ShippingCostOrigin = 'Missing' | 'DesiBand' | 'Default' | 'Category' | 'Product' | 'FreeShipping' | 'Actual';
// Kaydedilen ayar geçmiş siparişlere de uygulansın mı, yoksa bugünden itibaren mi.
export type ShippingPolicyApplyTo = 'AllOrders' | 'FromToday';

export interface ShippingRuleDto {
  id: number;
  target: ShippingRuleTarget;
  sku: string | null;
  internalCategoryId: number | null;
  // Teslimat bölgesi; boş = bölgenin tamamı.
  zone: string;
  label: string | null;
  price: number;
}

export interface ShippingPolicyDto {
  id: number;
  region: string;
  dataSourceId: number | null;
  dataSourceName: string | null;
  // Bu sürümün geçerli olduğu ilk gün (yyyy-MM-dd); null = tüm siparişler.
  validFrom: string | null;
  chargeBasis: ShippingChargeBasis;
  pricingMethod: ShippingPricingMethod;
  freeShippingEffect: FreeShippingEffect;
  updatedAt: string;
  rules: ShippingRuleDto[];
}

export interface ShippingRuleBody {
  target: ShippingRuleTarget;
  sku: string | null;
  internalCategoryId: number | null;
  zone: string;
  price: number;
}

export interface ShippingPolicySaveBody {
  region: string;
  dataSourceId: number | null;
  chargeBasis: ShippingChargeBasis;
  pricingMethod: ShippingPricingMethod;
  freeShippingEffect: FreeShippingEffect;
  rules: ShippingRuleBody[];
  applyTo: ShippingPolicyApplyTo;
}

export interface ShippingQuotePreviewLine {
  sku: string | null;
  productName: string;
  categoryName: string | null;
  quantity: number;
  desi: number;
  isKnown: boolean;
  costTry: number;
}

export interface ShippingQuotePreview {
  orderId: number;
  orderNumber: string;
  orderDate: string;
  region: string;
  zone: string;
  postcode: string | null;
  policyScope: string | null;
  origin: ShippingCostOrigin;
  isKnown: boolean;
  totalTry: number;
  lines: ShippingQuotePreviewLine[];
}

/** Kargo ayarı yapılabilen bölge — ERP kaynaklarının ülkelerinden türer (sabit liste yok). */
export interface ShippingRegionInfo {
  code: string;
  currency: string;
  // Fiyat girilen teslimat bölgeleri (UK: üç bölge; tek bölgeli ülkede [""]).
  zones: string[];
  sources: string[];
}

export const shippingPoliciesApi = {
  regions: () => request<ShippingRegionInfo[]>('/shipping-policies/regions'),
  list: (region: string) => request<ShippingPolicyDto[]>(`/shipping-policies?region=${encodeURIComponent(region)}`),
  save: (body: ShippingPolicySaveBody) =>
    request<ShippingPolicyDto>('/shipping-policies', { method: 'PUT', body: JSON.stringify(body) }),
  removeVersion: (id: number) => request<void>(`/shipping-policies/${id}`, { method: 'DELETE' }),
  removeScope: (region: string, dataSourceId: number | null) => {
    const source = dataSourceId === null ? '' : `&dataSourceId=${dataSourceId}`;
    return request<void>(`/shipping-policies/scope?region=${encodeURIComponent(region)}${source}`, { method: 'DELETE' });
  },
  preview: (orderNumber: string) =>
    request<ShippingQuotePreview>(`/shipping-policies/preview?orderNumber=${encodeURIComponent(orderNumber)}`),
};
