import { request } from './core';
import type { ShopifyCollectionRuleDto } from './shopify-store-content';

// ─── Shopify Hub: AI destekli katalog işleri ────────────────────────────────────
//
// 1) Araç marka/model koleksiyon önerisi: öneri üretmek hiçbir şey yazmaz; oluşturma yalnız seçilen satırlarla yapılır.
// 2) Mağazalar arası ürün kopyalama: rotadaki mağaza HEDEFTİR; önizleme yazmaz, uygulama taslak açar (fiyat/stok taşınmaz).

export interface ShopifyVehicleCollectionSuggestionDto {
  key: string;
  brand: string;
  model: string | null;
  // Model satırının menüdeki üst markası; markada null.
  parentKey: string | null;
  title: string;
  handle: string;
  productCount: number;
  rules: ShopifyCollectionRuleDto[];
  appliedDisjunctively: boolean;
  // Dolu ise aynı adres/başlıkta koleksiyon zaten var: yeniden oluşturulmaz.
  existingCollectionId: number | null;
  sampleTitles: string[];
}

export interface ShopifyVehicleSuggestionDto {
  productsScanned: number;
  truncated: boolean;
  // false: adlar sözlükten (aiNote nedenini söyler).
  aiApplied: boolean;
  aiNote: string | null;
  collections: ShopifyVehicleCollectionSuggestionDto[];
}

export interface ShopifyVehicleApplyItemBody {
  key: string;
  title: string;
  handle?: string;
  rules: ShopifyCollectionRuleDto[];
  appliedDisjunctively: boolean;
}

export type ShopifyVehicleApplyOutcome = 'Created' | 'Existing' | 'Failed';

export interface ShopifyVehicleApplyRowDto {
  key: string;
  title: string;
  collectionId: number | null;
  outcome: ShopifyVehicleApplyOutcome;
  errors: string[];
}

export interface ShopifyVehicleApplyResultDto {
  rows: ShopifyVehicleApplyRowDto[];
  applied: boolean;
  errors: string[];
}

export interface ShopifyCopyContent {
  title: string | null;
  descriptionHtml: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface ShopifyCopyVariantDto {
  sku: string | null;
  title: string | null;
  barcode: string | null;
}

export interface ShopifyCopyItemDto {
  sourceProductId: number;
  sourceTitle: string;
  content: ShopifyCopyContent;
  productType: string | null;
  vendor: string | null;
  tags: string[];
  imageUrls: string[];
  variants: ShopifyCopyVariantDto[];
  // Dolu ise hedefte aynı SKU var (atla / güncelle seçilir).
  existingTargetProductId: number | null;
  existingTargetTitle: string | null;
  // false: çeviri yapılamadı, kaynak metin kullanıldı (warnings nedenini söyler).
  translated: boolean;
  warnings: string[];
}

export interface ShopifyCopyPreviewDto {
  targetLanguage: string;
  items: ShopifyCopyItemDto[];
  notFoundSkus: string[];
}

export const SHOPIFY_COPY_MODE = { Create: 'Create', Update: 'Update', Skip: 'Skip' } as const;
export type ShopifyCopyMode = (typeof SHOPIFY_COPY_MODE)[keyof typeof SHOPIFY_COPY_MODE];

export interface ShopifyCopyApplyItemBody {
  sourceProductId: number;
  mode: ShopifyCopyMode;
  content: ShopifyCopyContent;
}

export type ShopifyCopyOutcome = 'Created' | 'Updated' | 'Skipped' | 'Failed';

export interface ShopifyCopyApplyRowDto {
  sourceProductId: number;
  outcome: ShopifyCopyOutcome;
  targetProductId: number | null;
  errors: string[];
  // Başarılı yazmada söylenmesi gerekenler (ör. bir görsel eklenemedi).
  notes: string[];
}

export interface ShopifyCopyApplyResultDto {
  rows: ShopifyCopyApplyRowDto[];
  applied: boolean;
  errors: string[];
}

const storePath = (storeId: number) => `/shopify/stores/${storeId}`;

function post(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) };
}

export const shopifyAiCatalogApi = {
  suggestVehicleCollections: (storeId: number, minProducts: number | null) =>
    request<ShopifyVehicleSuggestionDto>(`${storePath(storeId)}/vehicle-collections/suggestions`, post({ minProducts })),
  applyVehicleCollections: (storeId: number, items: ShopifyVehicleApplyItemBody[]) =>
    request<ShopifyVehicleApplyResultDto>(`${storePath(storeId)}/vehicle-collections/apply`, post({ items })),
  previewCopy: (targetStoreId: number, sourceStoreId: number, skus: string[]) =>
    request<ShopifyCopyPreviewDto>(`${storePath(targetStoreId)}/store-copy/preview`, post({ sourceStoreId, skus })),
  applyCopy: (targetStoreId: number, sourceStoreId: number, items: ShopifyCopyApplyItemBody[]) =>
    request<ShopifyCopyApplyResultDto>(`${storePath(targetStoreId)}/store-copy/apply`, post({ sourceStoreId, items })),
};
