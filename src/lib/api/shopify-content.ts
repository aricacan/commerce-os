import { request } from './core';
import type { ShopifyWriteResultDto } from './shopify-explorer';

// ─── Shopify Hub: ürün içerik kalitesi (SEO + AI önerisi) ───────────────────────
//
// Tarama ve öneri hiçbir şey yazmaz; yazma yalnız kullanıcının onayladığı alanlarla yapılır.
// Backend enum'ları SAYI olarak gelir (değerler kalıcıdır).

export const SHOPIFY_CONTENT_PROBLEM = {
  SeoTitleMissing: 0,
  SeoTitleTooShort: 1,
  SeoTitleTooLong: 2,
  SeoDescriptionMissing: 3,
  SeoDescriptionTooShort: 4,
  SeoDescriptionTooLong: 5,
  DescriptionMissing: 6,
  DescriptionTooShort: 7,
  NoImage: 8,
  ImageAltMissing: 9,
} as const;
export type ShopifyContentProblem = (typeof SHOPIFY_CONTENT_PROBLEM)[keyof typeof SHOPIFY_CONTENT_PROBLEM];

export interface ShopifyContentIssueDto {
  id: number;
  title: string;
  imageUrl: string | null;
  problems: ShopifyContentProblem[];
}

export interface ShopifyContentProblemCountDto {
  problem: ShopifyContentProblem;
  count: number;
}

export interface ShopifyContentScanDto {
  productsScanned: number;
  // Tarama tavanı aşıldı: kalan ürünler taranmadı.
  truncated: boolean;
  summary: ShopifyContentProblemCountDto[];
  products: ShopifyContentIssueDto[];
}

export interface ShopifyContentFieldsDto {
  title: string | null;
  descriptionHtml: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface ShopifyContentSuggestionDto {
  productId: number;
  language: string;
  current: ShopifyContentFieldsDto;
  suggested: ShopifyContentFieldsDto;
}

// Yalnız dolu alanlar yazılır.
export type SaveShopifyContentBody = Partial<{
  [K in keyof ShopifyContentFieldsDto]: string;
}>;

const contentPath = (storeId: number) => `/shopify/stores/${storeId}/content-quality`;

export const shopifyContentApi = {
  scan: (storeId: number) => request<ShopifyContentScanDto>(contentPath(storeId)),
  suggest: (storeId: number, productId: number) =>
    request<ShopifyContentSuggestionDto>(`${contentPath(storeId)}/products/${productId}/suggestion`, { method: 'POST' }),
  apply: (storeId: number, productId: number, body: SaveShopifyContentBody) =>
    request<ShopifyWriteResultDto>(`${contentPath(storeId)}/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};
