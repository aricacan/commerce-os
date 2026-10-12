import { request } from './core';
import type { ShopifyWriteResultDto } from './shopify-explorer';

// ─── Shopify Hub: araç uyumluluğu (metaobject / metafield) ──────────────────────
//
// Panel Fitment verisi Shopify'a "vehicle" metaobject'leri olarak yazılır ve ürüne demo.fitment listesiyle bağlanır.
// Akış: kurulum durumu → (gerekirse) kur → SKU'larla önizleme → onaylı uygulama.

export interface ShopifyFitmentSetupDto {
  vehicleDefinitionExists: boolean;
  productMetafieldExists: boolean;
  isReady: boolean;
}

export interface ShopifyFitmentSkuIssueDto {
  sku: string;
  reason: string;
}

export interface ShopifyFitmentPreviewDto {
  skuCount: number;
  matchedSkuCount: number;
  vehicleCount: number;
  vehiclesToCreate: number;
  vehiclesToUpdate: number;
  productsToLink: number;
  unmatched: ShopifyFitmentSkuIssueDto[];
}

export interface ShopifyFitmentApplyDto {
  applied: boolean;
  vehiclesWritten: number;
  productsLinked: number;
  unmatched: ShopifyFitmentSkuIssueDto[];
  errors: string[];
}

export interface ShopifyFitmentRequest {
  skus: string[];
}

const fitmentPath = (storeId: number) => `/shopify/stores/${storeId}/fitment`;

const post = <T>(path: string, body?: ShopifyFitmentRequest) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const shopifyFitmentApi = {
  setupStatus: (storeId: number) => request<ShopifyFitmentSetupDto>(`${fitmentPath(storeId)}/setup`),
  runSetup: (storeId: number) => post<ShopifyWriteResultDto>(`${fitmentPath(storeId)}/setup`),
  preview: (storeId: number, body: ShopifyFitmentRequest) =>
    post<ShopifyFitmentPreviewDto>(`${fitmentPath(storeId)}/preview`, body),
  apply: (storeId: number, body: ShopifyFitmentRequest) =>
    post<ShopifyFitmentApplyDto>(`${fitmentPath(storeId)}/apply`, body),
};
