import { request } from './core';

// Sipariş kalemi bazında kârlılık raporu — bkz. backend OrderProfitabilityReportService.
//
// Trendyol komisyon/kargo tutarlarını aylık toplu verdiği için sipariş anında gerçek maliyet
// bilinmiyor. Rapor iki katmanı birleştirir: mutabakatı işlenmiş kalemlerde pazaryerinin
// bildirdiği FİİLİ tutar, işlenmemişlerde oran/tarife üzerinden TAHMİN. Hangisinin
// kullanıldığı satır bazında `*Source` alanlarında döner.

// Diğer backend enum'ları gibi sayısal gelir (bkz. lib/api/marketplace-finance.ts).
export type ProfitFigureSource = 0 | 1 | 2;
export const FIGURE_SOURCE = {
  Estimated: 0,
  MarketplaceReported: 1,
  Missing: 2,
} as const satisfies Record<string, ProfitFigureSource>;

export const FIGURE_SOURCE_LABEL: Record<ProfitFigureSource, string> = {
  0: 'Tahmini',
  1: 'Gerçek',
  2: 'Eksik',
};

export interface OrderProfitabilityRow {
  orderId: number;
  platformOrderNumber: string;
  orderDate: string;
  storeName: string;
  platformName: string;
  productName: string;
  sku: string;
  quantity: number;
  salePrice: number;
  vat: number;
  commission: number;
  commissionSource: ProfitFigureSource;
  shipping: number;
  shippingSource: ProfitFigureSource;
  productCost: number;
  serviceFee: number;
  netProfit: number;
}

export interface OrderProfitabilityDailyPoint {
  date: string;
  revenue: number;
  commission: number;
  shipping: number;
  vat: number;
  netProfit: number;
  orderCount: number;
}

export interface OrderProfitabilitySummary {
  totalRevenue: number;
  totalCommission: number;
  totalShipping: number;
  totalVat: number;
  totalProductCost: number;
  totalNetProfit: number;
  orderCount: number;
  itemCount: number;
  // 0-1 arası: komisyonu pazaryeri mutabakatından gelen kalemlerin oranı.
  marketplaceReportedCommissionRatio: number;
  // Kargosu hesaplanamayan kalem sayısı (desisi yok ya da tarife tanımsız). Bu kalemlerin
  // kargosu net kâra 0 girer, yani totalNetProfit o kadar YÜKSEK çıkar — sıfırdan büyükse
  // kullanıcıya uyarı gösterilmeli.
  missingShippingItemCount: number;
}

export interface OrderProfitabilityReport {
  items: OrderProfitabilityRow[];
  daily: OrderProfitabilityDailyPoint[];
  summary: OrderProfitabilitySummary;
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface OrderProfitabilityQuery {
  from?: string;
  to?: string;
  // Pazaryeri ADI (ör. "Trendyol"). VERİLMEZSE rapor TÜM pazaryerlerini toplar — Trendyol
  // ekranı bunu göndermediği için eBay/Hepsiburada ciroları da "Trendyol" başlığı altında
  // görünüyordu.
  platformName?: string;
  page?: number;
  pageSize?: number;
}

function buildQueryString(query: OrderProfitabilityQuery): string {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.platformName) params.set('platformName', query.platformName);
  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(query.pageSize ?? 50));
  return params.toString();
}

export const orderProfitabilityApi = {
  get: (query: OrderProfitabilityQuery = {}) =>
    request<OrderProfitabilityReport>(`/order-profitability?${buildQueryString(query)}`),
};
