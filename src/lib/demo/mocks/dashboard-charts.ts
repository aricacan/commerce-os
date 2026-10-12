// Pano grafik uçları: dinamik grafik, mağaza karşılaştırma, marka x kategori, özet, eylem kuyruğu.
import type {
  BrandCategoryBreakdown,
  BrandCategoryRow,
  ChartDataPoint,
  DashboardSummary,
  DynamicChartRequest,
  StoreComparisonRow,
} from '../../../types/api';
import { get, post, type DemoRoute } from '../router';
import { DEMO_PRODUCTS, DEMO_STORES } from '../data/core';
import {
  BRAND_SHARES,
  CATEGORIES,
  CATEGORY_SHARES,
  ORDER_STATUS_WEIGHTS,
  PLATFORM_SHARES,
  TOP_PRODUCTS,
  categoryFactor,
  categoryStockAndPrice,
  type Weighted,
} from '../data/dashboard-catalog';
import { ITEMS_RATIO, rangeMetrics, resolveRange, sumOf, type DateRange } from '../data/dashboard-series';
import { buildProfitSummary } from './dashboard-orders';

const DEFAULT_TOP_BRANDS = 8;
const DEFAULT_TOP_CATEGORIES = 6;
const OTHER_LABEL = 'Diğer';
const MODEL_VARIANTS = ['Sedan', 'SUV', 'Hatchback', 'Station'];
const STORE_COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6'];
const AI_CATEGORIZED_RATIO = 0.82;
const RULE_CATEGORIZED_RATIO = 0.16;
const PENDING_MODERATION_COUNT = 23;

interface Totals {
  orders: number;
  revenue: number;
}

function totalsOf(range: DateRange, stores: string[], categoryId: number | undefined): Totals {
  const factor = categoryFactor(categoryId);
  const metrics = rangeMetrics(range, stores);
  return {
    orders: Math.round(sumOf(metrics.map((day) => day.orders)) * factor),
    revenue: Math.round(sumOf(metrics.map((day) => day.revenue)) * factor),
  };
}

function weightedPoints(shares: Weighted[], aggregate: DynamicChartRequest['aggregate'], totals: Totals): ChartDataPoint[] {
  return shares.map((share) => {
    const stockAndPrice = categoryStockAndPrice(share.label);
    const valueByAggregate: Record<DynamicChartRequest['aggregate'], number> = {
      Count: Math.round(totals.orders * share.weight),
      TotalRevenue: Math.round(totals.revenue * share.weight),
      AvgPrice: stockAndPrice.avgPrice || Math.round(totals.revenue / Math.max(1, totals.orders)),
      TotalStock: stockAndPrice.stock || Math.round(share.weight * 4000),
    };
    return { label: share.label, value: valueByAggregate[aggregate] };
  });
}

function productPoints(aggregate: DynamicChartRequest['aggregate'], totals: Totals): ChartDataPoint[] {
  return TOP_PRODUCTS.map(({ product, weight }) => {
    const valueByAggregate: Record<DynamicChartRequest['aggregate'], number> = {
      Count: Math.max(1, Math.round(totals.orders * ITEMS_RATIO * weight)),
      TotalRevenue: Math.round(totals.revenue * weight),
      AvgPrice: product.price,
      TotalStock: product.stock,
    };
    return { label: product.name, value: valueByAggregate[aggregate], extraText: product.sku };
  });
}

function sortedDescending(points: ChartDataPoint[]): ChartDataPoint[] {
  return [...points].sort((a, b) => b.value - a.value);
}

function handleDynamicChart(body: DynamicChartRequest, stores: string[]): ChartDataPoint[] {
  const query = new URLSearchParams();
  if (body.from) query.set('from', body.from);
  if (body.to) query.set('to', body.to);
  const totals = totalsOf(resolveRange(query), body.storeCodes ?? stores, body.categoryId);

  const sharesByGroup: Record<Exclude<DynamicChartRequest['groupBy'], 'Product'>, Weighted[]> = {
    Category: CATEGORY_SHARES,
    Platform: PLATFORM_SHARES,
    Brand: BRAND_SHARES,
    OrderStatus: ORDER_STATUS_WEIGHTS,
  };
  const points = body.groupBy === 'Product'
    ? productPoints(body.aggregate, totals)
    : weightedPoints(sharesByGroup[body.groupBy], body.aggregate, totals);
  return sortedDescending(points);
}

function buildStoreComparison(range: DateRange, stores: string[], categoryId: number | undefined): StoreComparisonRow[] {
  return DEMO_STORES
    .map((store, index) => ({ store, index }))
    .filter(({ store }) => stores.length === 0 || stores.includes(store.code))
    .map(({ store, index }) => {
      const summary = buildProfitSummary(range, [store.code], categoryId);
      return {
        storeId: index + 1,
        storeName: store.name,
        displayColor: STORE_COLORS[index % STORE_COLORS.length],
        sourceType: store.country === 'UK' ? 'Base' : 'Sentos',
        erpSourceCode: store.code,
        orderCount: summary.orderCount,
        revenue: summary.totalRevenue,
        netProfit: summary.netProfit,
      };
    });
}

function buildBrandBreakdown(
  topBrands: number,
  topCategories: number,
  totals: Totals,
  categoryId: number | undefined,
): BrandCategoryBreakdown {
  const shown = CATEGORY_SHARES.slice(0, topCategories);
  const hasOther = CATEGORY_SHARES.length > shown.length;
  const categories = [...shown.map((share) => share.label), ...(hasOther ? [OTHER_LABEL] : [])];
  const otherWeight = CATEGORY_SHARES.slice(topCategories).reduce((sum, share) => sum + share.weight, 0);
  const weights = [...shown, ...(hasOther ? [{ label: OTHER_LABEL, weight: otherWeight }] : [])]
    .filter((share) => categoryId === undefined || share.label === CATEGORIES.find((c) => c.id === categoryId)?.name);

  const combos = BRAND_SHARES.flatMap((brand) => MODEL_VARIANTS.map((model, index) => ({
    brand: brand.label,
    model,
    weight: brand.weight * [0.4, 0.3, 0.2, 0.1][index],
  }))).sort((a, b) => b.weight - a.weight).slice(0, topBrands);

  const brands: BrandCategoryRow[] = combos.map((combo) => {
    const totalSold = Math.max(1, Math.round(totals.orders * ITEMS_RATIO * combo.weight));
    const weightSum = sumOf(weights.map((share) => share.weight));
    return {
      brand: combo.brand,
      model: combo.model,
      totalSold,
      categories: weights.map((share) => {
        const count = Math.round(totalSold * (share.weight / weightSum));
        return { categoryName: share.label, count, percentage: Number(((count / totalSold) * 100).toFixed(1)) };
      }),
    };
  });
  return { categories, brands };
}

function buildSummary(): DashboardSummary {
  const total = DEMO_PRODUCTS.length;
  return {
    totalProducts: total,
    aiCategorizedCount: Math.round(total * AI_CATEGORIZED_RATIO),
    ruleCategorizedCount: Math.round(total * RULE_CATEGORIZED_RATIO),
    pendingModerationCount: PENDING_MODERATION_COUNT,
  };
}

const numberParam = (query: URLSearchParams, key: string, fallback: number): number => Number(query.get(key)) || fallback;

export const dashboardChartRoutes: DemoRoute[] = [
  get('/dashboard/summary', buildSummary),
  post('/dashboard/dynamic-chart', ({ body, stores }) => handleDynamicChart(body as DynamicChartRequest, stores)),
  get('/dashboard/store-comparison', ({ query, stores }) => {
    const categoryId = Number(query.get('categoryId')) || undefined;
    return buildStoreComparison(resolveRange(query), stores, categoryId);
  }),
  get('/dashboard/brand-category-breakdown', ({ query, stores }) => {
    const categoryId = Number(query.get('categoryId')) || undefined;
    const totals = totalsOf(resolveRange(query), stores, undefined);
    return buildBrandBreakdown(
      numberParam(query, 'topBrands', DEFAULT_TOP_BRANDS),
      numberParam(query, 'topCategories', DEFAULT_TOP_CATEGORIES),
      totals,
      categoryId,
    );
  }),
];
