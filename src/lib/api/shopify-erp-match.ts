import { request } from './core';

// ─── Shopify Hub: ERP eşleştirme raporu (salt okunur) ───────────────────────────
//
// Mağaza varyantları ile panel/ERP kataloğu SKU üzerinden karşılaştırılır; hiçbir tarafa yazılmaz.

export const ERP_MATCH_FILTER = {
  All: 'all',
  Matched: 'matched',
  ShopifyOnly: 'shopifyOnly',
  ErpOnly: 'erpOnly',
  Conflict: 'conflict',
  NearMatch: 'nearMatch',
  PriceDiff: 'priceDiff',
  StockDiff: 'stockDiff',
  Normalize: 'normalize',
} as const;
export type ErpMatchFilter = (typeof ERP_MATCH_FILTER)[keyof typeof ERP_MATCH_FILTER];

export const ERP_READINESS = { Ready: 'ready', Risky: 'risky', NotReady: 'notReady' } as const;
export type ErpReadiness = (typeof ERP_READINESS)[keyof typeof ERP_READINESS];

export interface ErpMatchRowDto {
  kind: ErpMatchFilter;
  sku: string;
  shopifyTitle: string | null;
  erpName: string | null;
  erpSource: string | null;
  shopifyPrice: number | null;
  erpPrice: number | null;
  shopifyStock: number | null;
  erpStock: number | null;
  priceDiffers: boolean;
  stockDiffers: boolean;
  suggestedSku: string | null;
  note: string | null;
}

export interface ErpMatchSummaryDto {
  shopifyVariantsScanned: number;
  erpItemsScanned: number;
  shopifyTruncated: boolean;
  erpTruncated: boolean;
  shopifyWithoutSkuCount: number;
  matchedCount: number;
  shopifyOnlyCount: number;
  erpOnlyCount: number;
  conflictCount: number;
  nearMatchCount: number;
  priceDiffCount: number;
  stockDiffCount: number;
  normalizeCount: number;
  matchRate: number;
  readiness: ErpReadiness;
  readinessReasons: string[];
  priceTolerancePercent: number;
  stockTolerance: number;
}

export interface ErpMatchReportDto {
  summary: ErpMatchSummaryDto;
  totalRows: number;
  page: number;
  pageSize: number;
  rows: ErpMatchRowDto[];
}

export interface ErpMatchQuery {
  filter: ErpMatchFilter;
  page: number;
  pageSize: number;
  priceTolerancePercent: number;
  stockTolerance: number;
}

export const shopifyErpMatchApi = {
  report: (storeId: number, query: ErpMatchQuery) => {
    const search = new URLSearchParams({
      filter: query.filter,
      page: String(query.page),
      pageSize: String(query.pageSize),
      priceTolerancePercent: String(query.priceTolerancePercent),
      stockTolerance: String(query.stockTolerance),
    });
    return request<ErpMatchReportDto>(`/shopify/stores/${storeId}/erp-match?${search}`);
  },
};
