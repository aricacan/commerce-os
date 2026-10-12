import { authHeader, BASE, getStoreHeaders, request, throwIfNotOk } from './core';
import type { ShopifyWriteResultDto } from './shopify-explorer';

// ─── Shopify Hub ürün yazma (H5) ────────────────────────────────────────────────
//
// Ürün detayı (düzenleme formu), oluştur/güncelle, koleksiyon ve görsel yönetimi. Ürün LİSTESİ shopify-explorer.ts'te.
// Katalog yetkisi ERP olan mağazada stok/fiyat gönderen istek sunucuda 409 ile reddedilir.

export const PRODUCT_STATUS = { Active: 'ACTIVE', Draft: 'DRAFT', Archived: 'ARCHIVED' } as const;
export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

export interface ShopifyProductImageDto {
  id: number;
  url: string | null;
  alt: string | null;
}

// Varyantın bir seçenekteki değeri (Renk = Kırmızı).
export interface ShopifyVariantOptionDto {
  name: string;
  value: string;
}

// Ürün seçeneği (Renk: Kırmızı, Mavi). Seçeneksiz üründe liste boştur.
export interface ShopifyProductOptionDto {
  id: number;
  name: string;
  values: string[];
}

export interface ShopifyProductVariantDetailDto {
  id: number;
  sku: string | null;
  title: string | null;
  price: number | null;
  barcode: string | null;
  inventoryQuantity: number | null;
  // Frontend backend'den önce yayınlanabildiği için opsiyonel okunur.
  selectedOptions?: ShopifyVariantOptionDto[];
}

export interface ShopifyCollectionRefDto {
  id: number;
  title: string;
}

export interface ShopifyProductDetailDto {
  id: number;
  title: string;
  descriptionHtml: string;
  status: string;
  productType: string | null;
  vendor: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  images: ShopifyProductImageDto[];
  variants: ShopifyProductVariantDetailDto[];
  collections: ShopifyCollectionRefDto[];
  options?: ShopifyProductOptionDto[];
}

// Gönderilmeyen (undefined) alan güncellemede Shopify'da değişmez; boş metin alanı temizler.
export interface SaveShopifyVariantBody {
  id?: number;
  sku?: string;
  title?: string;
  price?: number;
  barcode?: string;
  stock?: number;
  // Çok seçenekli üründe varyantın seçenek değerleri (oluşturmada ve yeni varyant eklerken).
  options?: ShopifyVariantOptionDto[];
}

// Yalnız ürün oluştururken tanımlanır (en çok 3 seçenek).
export interface SaveShopifyOptionBody {
  name: string;
  values: string[];
}

export interface SaveShopifyProductBody {
  title?: string;
  descriptionHtml?: string;
  productType?: string;
  vendor?: string;
  tags?: string[];
  status?: ProductStatus;
  seoTitle?: string;
  seoDescription?: string;
  variants?: SaveShopifyVariantBody[];
  options?: SaveShopifyOptionBody[];
  // Fiyat güvenlik eşiğini aşan değişikliğin kullanıcı tarafından onaylandığı (aksi hâlde sunucu 409 döner).
  confirmLargePriceChange?: boolean;
}

export interface ShopifyImageAltProposalDto {
  mediaId: number;
  url: string | null;
  // null = AI bu görsel için öneri üretmedi.
  suggestedAlt: string | null;
}

export interface ShopifyImageAltSuggestionDto {
  productId: number;
  language: string;
  images: ShopifyImageAltProposalDto[];
}

export interface ShopifyImageAltItem {
  mediaId: number;
  alt: string;
}

const productsPath = (storeId: number) => `/shopify/stores/${storeId}/products`;
const productPath = (storeId: number, productId: number) => `${productsPath(storeId)}/${productId}`;
const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

// Dosya yükleme multipart olduğundan request() (JSON başlıklı) yerine doğrudan fetch kullanılır.
async function uploadImage(storeId: number, productId: number, file: File): Promise<ShopifyWriteResultDto> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}${productPath(storeId, productId)}/images`, {
    method: 'POST',
    headers: { ...getStoreHeaders(), ...authHeader() },
    body: form,
  });
  await throwIfNotOk(res);
  return (await res.json()) as ShopifyWriteResultDto;
}

export const shopifyProductsApi = {
  detail: (storeId: number, productId: number) => request<ShopifyProductDetailDto>(productPath(storeId, productId)),
  collectionOptions: (storeId: number) => request<ShopifyCollectionRefDto[]>(`${productsPath(storeId)}/collection-options`),
  create: (storeId: number, body: SaveShopifyProductBody) =>
    request<ShopifyWriteResultDto>(productsPath(storeId), { method: 'POST', ...json(body) }),
  update: (storeId: number, productId: number, body: SaveShopifyProductBody) =>
    request<ShopifyWriteResultDto>(productPath(storeId, productId), { method: 'PUT', ...json(body) }),
  addToCollection: (storeId: number, productId: number, collectionId: number) =>
    request<ShopifyWriteResultDto>(`${productPath(storeId, productId)}/collections/${collectionId}`, { method: 'POST' }),
  removeFromCollection: (storeId: number, productId: number, collectionId: number) =>
    request<ShopifyWriteResultDto>(`${productPath(storeId, productId)}/collections/${collectionId}`, { method: 'DELETE' }),
  addImageUrl: (storeId: number, productId: number, url: string, alt?: string) =>
    request<ShopifyWriteResultDto>(`${productPath(storeId, productId)}/images/url`, { method: 'POST', ...json({ url, alt }) }),
  uploadImage,
  // Kalıcı silme (geri alınamaz); güvenli alternatif: update ile status=ARCHIVED.
  deleteProduct: (storeId: number, productId: number) =>
    request<ShopifyWriteResultDto>(productPath(storeId, productId), { method: 'DELETE' }),
  deleteImage: (storeId: number, productId: number, mediaId: number) =>
    request<ShopifyWriteResultDto>(`${productPath(storeId, productId)}/images/${mediaId}`, { method: 'DELETE' }),
  // Alt metin: tek görsel (boş metin temizler), toplu (onaylanan AI önerileri) ve öneri (hiçbir şey yazmaz).
  updateImageAlt: (storeId: number, productId: number, mediaId: number, alt: string) =>
    request<ShopifyWriteResultDto>(`${productPath(storeId, productId)}/images/${mediaId}/alt`, { method: 'PUT', ...json({ alt }) }),
  updateImageAlts: (storeId: number, productId: number, items: ShopifyImageAltItem[]) =>
    request<ShopifyWriteResultDto>(`${productPath(storeId, productId)}/images/alts`, { method: 'PUT', ...json({ items }) }),
  suggestImageAlts: (storeId: number, productId: number) =>
    request<ShopifyImageAltSuggestionDto>(`${productPath(storeId, productId)}/images/alt-suggestion`, { method: 'POST' }),
  deleteVariant: (storeId: number, productId: number, variantId: number) =>
    request<ShopifyWriteResultDto>(`${productPath(storeId, productId)}/variants/${variantId}`, { method: 'DELETE' }),
  renameOption: (storeId: number, productId: number, optionId: number, name: string) =>
    request<ShopifyWriteResultDto>(`${productPath(storeId, productId)}/options/${optionId}`, { method: 'PUT', ...json({ name }) }),
  reorderImages: (storeId: number, productId: number, mediaIds: number[]) =>
    request<ShopifyWriteResultDto>(`${productPath(storeId, productId)}/images/order`, { method: 'PUT', ...json({ mediaIds }) }),
};
