import { request } from './core';
import type { ChannelType } from './omnichannel';

const SITE_PREVIEW_TIMEOUT_MS = 120_000;

// ─── Omnichannel › Sistem: Veri Kaynakları ve Kaynak Profilleri ────────────────
//
// Profil, botun bir kanalda ürün/fiyat/stok/link bilgisini HANGİ kaynaktan okuyacağını
// belirler. Kanal profil seçmezse bot ülkenin varsayılan kaynaklarıyla çalışır.

// Backend enum'larıyla birebir sayısal karşılık (CatalogStockMode / CatalogLinkMode).
export const CATALOG_STOCK_MODE = { ProductSources: 0, Source: 1, AlwaysInStock: 2, SiteSource: 3 } as const;
export type CatalogStockMode = (typeof CATALOG_STOCK_MODE)[keyof typeof CATALOG_STOCK_MODE];

export const CATALOG_LINK_MODE = { PriceSource: 0, Source: 1, None: 2, SiteSource: 3 } as const;
export type CatalogLinkMode = (typeof CATALOG_LINK_MODE)[keyof typeof CATALOG_LINK_MODE];

// Fiyat listesinde olmayan ürün: kaynağın (sitenin/ERP'nin) fiyatı mı söylenir, temsilciye mi bırakılır?
export const CATALOG_UNLISTED_PRICE_MODE = { UseSourcePrice: 0, AskAgent: 1 } as const;
export type CatalogUnlistedPriceMode = (typeof CATALOG_UNLISTED_PRICE_MODE)[keyof typeof CATALOG_UNLISTED_PRICE_MODE];

export interface CatalogSourceDto {
  id: number;
  code: string;
  displayName: string;
  // "Sentos" | "Base" | "Logo"
  kind: string;
  country: string;
  brandName: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncStatus: string | null;
  lastError: string | null;
  activeProducts: number;
}

export interface CatalogProfileChannelDto {
  id: number;
  displayName: string;
  type: ChannelType;
}

export interface CatalogProfileDto {
  id: number;
  name: string;
  country: string;
  productSourceIds: number[];
  // Ürünler bir web sitesinden okunuyorsa (ERP'si olmayan ülke) dolu; fiyat/stok/link de o
  // siteden gelir. Eski backend göndermez → undefined.
  productSiteSourceId?: number | null;
  // Tam biri dolu: ERP fiyat kaynağı ya da web sitesi fiyat kaynağı.
  priceSourceId: number | null;
  // Eski backend göndermez → undefined.
  priceSiteSourceId?: number | null;
  stockMode: CatalogStockMode;
  stockSourceId: number | null;
  stockSiteSourceId?: number | null;
  linkMode: CatalogLinkMode;
  linkSourceId: number | null;
  linkSiteSourceId?: number | null;
  // Eski backend göndermez → undefined (= kaynağın fiyatı).
  unlistedPriceMode?: CatalogUnlistedPriceMode;
  // Profili kullanan gerçek kanallar (Test Alanı hariç).
  channels: CatalogProfileChannelDto[];
}

export interface CatalogProfileSaveBody {
  name: string;
  country: string;
  // Tam biri dolu: ERP ürün kaynakları ya da tek bir web sitesi ürün kaynağı.
  productSourceIds: number[];
  productSiteSourceId: number | null;
  priceSourceId: number | null;
  priceSiteSourceId: number | null;
  stockMode: CatalogStockMode;
  stockSourceId: number | null;
  stockSiteSourceId: number | null;
  linkMode: CatalogLinkMode;
  linkSourceId: number | null;
  linkSiteSourceId: number | null;
  unlistedPriceMode: CatalogUnlistedPriceMode;
}

// Profil fiyat listesi: anahtar kelimelerin hepsi ürün adında geçiyorsa fiyat bu olur; kaynağın
// fiyatının üstüne yazılır. Para birimi profilin fiyat kaynağınınkidir.
export interface CatalogPriceRuleDto {
  id: number;
  keywords: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
}

export type CatalogPriceRuleSaveBody = Omit<CatalogPriceRuleDto, 'id'>;

export interface CatalogPriceRulePreviewDto {
  matched: boolean;
  ruleId: number | null;
  keywords: string | null;
  price: number | null;
}

// Site kaynağı türü: Shopify (herkese açık ürün listesi) ya da genel web sitesi.
export const CATALOG_SITE_KIND = { Shopify: 'Shopify', Website: 'Website' } as const;
export type CatalogSiteKind = (typeof CATALOG_SITE_KIND)[keyof typeof CATALOG_SITE_KIND];

// Web sitesi okuma ayarları; hepsi isteğe bağlı (boşsa site haritası + yapısal veri).
export interface WebsiteScrapeConfig {
  productUrlPattern?: string | null;
  skuXPath?: string | null;
  nameXPath?: string | null;
  priceXPath?: string | null;
  stockXPath?: string | null;
  outOfStockText?: string | null;
}

// Web sitesi kaynağı (Shopify). ERP kaynaklarından ayrı: yalnız botun fiyat/stok/link
// okumasında kullanılır, ERP ekranlarında görünmez.
export interface CatalogSiteSourceDto {
  id: number;
  name: string;
  country: string;
  kind: string;
  baseUrl: string;
  currency: string;
  syncIntervalHours: number;
  isActive: boolean;
  lastSyncAt: string | null;
  syncStatus: string | null;
  lastError: string | null;
  lastItemCount: number | null;
  lastSkippedCount: number | null;
  activeItems: number;
  // Son TAM başarılı çekme, hata sonrası sıradaki otomatik deneme ve hata sınıfı; eski backend göndermez.
  lastSuccessAt?: string | null;
  nextAttemptAt?: string | null;
  // Elle "şimdi çek"in açılacağı an (site sınırladı/engelledi); null = serbest. Eski backend göndermez.
  manualSyncNotBefore?: string | null;
  lastFailureKind?: string | null;
  // Yalnız web sitesi türünde; eski backend göndermez.
  scrapeConfig?: WebsiteScrapeConfig | null;
  // Profil seçilmemiş kanallarda da fiyat/link buradan (ülkede tek kaynak). Eski backend göndermez.
  useForUnprofiledChannels?: boolean;
}

export interface CatalogSiteSourceSaveBody {
  name: string;
  country: string;
  baseUrl: string;
  currency: string;
  syncIntervalHours: number;
  isActive: boolean;
  kind: CatalogSiteKind;
  scrapeConfig: WebsiteScrapeConfig | null;
  useForUnprofiledChannels: boolean;
}

export interface CatalogSitePreviewItem {
  sku: string;
  name: string;
  price: number | null;
  compareAtPrice: number | null;
  available: boolean;
  url: string;
  imageUrl: string | null;
}

export interface CatalogSitePreviewDto {
  items: CatalogSitePreviewItem[];
  totalOnFirstPage: number;
  skippedWithoutSku: number;
}

// Profilin kapsaması: ürün kaynaklarındaki ürünlerden kaçının fiyatı/stoğu/linki var.
export interface CatalogCoverageDto {
  products: number;
  withPrice: number;
  inStock: number;
  withLink: number;
}

export const omnichannelCatalogApi = {
  getSources: () => request<CatalogSourceDto[]>('/omnichannel/catalog-sources'),
  getProfiles: () => request<CatalogProfileDto[]>('/omnichannel/catalog-profiles'),
  createProfile: (body: CatalogProfileSaveBody) =>
    request<CatalogProfileDto>('/omnichannel/catalog-profiles', { method: 'POST', body: JSON.stringify(body) }),
  updateProfile: (id: number, body: CatalogProfileSaveBody) =>
    request<CatalogProfileDto>(`/omnichannel/catalog-profiles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProfile: (id: number) =>
    request<void>(`/omnichannel/catalog-profiles/${id}`, { method: 'DELETE' }),
  getCoverage: (id: number) =>
    request<CatalogCoverageDto>(`/omnichannel/catalog-profiles/${id}/coverage`),

  getPriceRules: (profileId: number) =>
    request<CatalogPriceRuleDto[]>(`/omnichannel/catalog-profiles/${profileId}/price-rules`),
  createPriceRule: (profileId: number, body: CatalogPriceRuleSaveBody) =>
    request<CatalogPriceRuleDto>(`/omnichannel/catalog-profiles/${profileId}/price-rules`, {
      method: 'POST', body: JSON.stringify(body),
    }),
  updatePriceRule: (profileId: number, ruleId: number, body: CatalogPriceRuleSaveBody) =>
    request<CatalogPriceRuleDto>(`/omnichannel/catalog-profiles/${profileId}/price-rules/${ruleId}`, {
      method: 'PUT', body: JSON.stringify(body),
    }),
  deletePriceRule: (profileId: number, ruleId: number) =>
    request<void>(`/omnichannel/catalog-profiles/${profileId}/price-rules/${ruleId}`, { method: 'DELETE' }),
  // Botla aynı eşleştirici: yazılan ürün adına hangi kural uygulanır?
  previewPriceRule: (profileId: number, productName: string) =>
    request<CatalogPriceRulePreviewDto>(
      `/omnichannel/catalog-profiles/${profileId}/price-rules/preview?name=${encodeURIComponent(productName)}`),

  getSiteSources: () => request<CatalogSiteSourceDto[]>('/omnichannel/catalog-site-sources'),
  // Web sitesi önizlemesi sayfa sayfa okur (onlarca saniye sürebilir).
  previewSite: (baseUrl: string, kind: CatalogSiteKind, scrapeConfig: WebsiteScrapeConfig | null) =>
    request<CatalogSitePreviewDto>('/omnichannel/catalog-site-sources/preview', {
      method: 'POST', body: JSON.stringify({ baseUrl, kind, scrapeConfig }),
    }, true, SITE_PREVIEW_TIMEOUT_MS),
  createSite: (body: CatalogSiteSourceSaveBody) =>
    request<CatalogSiteSourceDto>('/omnichannel/catalog-site-sources', { method: 'POST', body: JSON.stringify(body) }),
  updateSite: (id: number, body: CatalogSiteSourceSaveBody) =>
    request<CatalogSiteSourceDto>(`/omnichannel/catalog-site-sources/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSite: (id: number) =>
    request<void>(`/omnichannel/catalog-site-sources/${id}`, { method: 'DELETE' }),
  syncSite: (id: number) =>
    request<void>(`/omnichannel/catalog-site-sources/${id}/sync`, { method: 'POST' }),
};
