// Pano sipariş/kâr uçları: /order/overview, /order/stats, /order/profit-summary, /order/profit-by-product.
import type {
  DashboardOverview,
  DashboardPeriod,
  OrderStats,
  OrderStatsWithComparison,
  ProductProfitLeaderboard,
  ProfitSummary,
  ProfitSummaryWithComparison,
} from '../../../types/api';
import { dayAgo } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { DEMO_PRODUCTS } from '../data/core';
import { TOP_PRODUCTS, categoryFactor, toProductProfit } from '../data/dashboard-catalog';
import {
  ITEMS_RATIO,
  addDays,
  dailyProfit,
  previousRange,
  profitTotals,
  rangeMetrics,
  resolveRange,
  sumOf,
  type DateRange,
} from '../data/dashboard-series';

const WEEK_DAYS = 7;
const MONTH_DAYS = 30;
const YEAR_DAYS = 365;
const LEADERBOARD_TOP = 8;
const MARGIN_DIGITS = 1;

function categoryOf(query: URLSearchParams): number | undefined {
  const value = Number(query.get('categoryId'));
  return value > 0 ? value : undefined;
}

function buildOrderStats(range: DateRange, stores: string[], categoryId: number | undefined): OrderStats {
  const factor = categoryFactor(categoryId);
  const metrics = rangeMetrics(range, stores).map((day) => ({
    ...day,
    orders: Math.round(day.orders * factor),
    returns: Math.round(day.returns * factor),
    revenue: Math.round(day.revenue * factor),
  }));
  return {
    totalRevenue: sumOf(metrics.map((day) => day.revenue)),
    totalOrderCount: sumOf(metrics.map((day) => day.orders)),
    activeProductCount: DEMO_PRODUCTS.filter((product) => product.stock > 0).length,
    returnCount: sumOf(metrics.map((day) => day.returns)),
    dailyOrderCounts: metrics.map((day) => ({ date: day.date, count: day.orders, revenue: day.revenue })),
    dailyReturnCounts: metrics.map((day) => ({ date: day.date, count: day.returns, revenue: Math.round(day.revenue * 0.05) })),
  };
}

function percentOf(part: number, whole: number): number {
  return whole > 0 ? Number(((part / whole) * 100).toFixed(MARGIN_DIGITS)) : 0;
}

export function buildProfitSummary(range: DateRange, stores: string[], categoryId?: number): ProfitSummary {
  const factor = categoryFactor(categoryId);
  const metrics = rangeMetrics(range, stores).map((day) => ({
    ...day,
    orders: Math.round(day.orders * factor),
    items: Math.round(day.items * factor),
    revenue: Math.round(day.revenue * factor),
  }));
  const daily = metrics.map(dailyProfit);
  const revenue = sumOf(metrics.map((day) => day.revenue));
  const grossProfit = sumOf(daily.map((day) => day.grossProfit));
  const netProfit = sumOf(daily.map((day) => day.netProfit));
  return {
    ...profitTotals(revenue),
    grossProfit,
    netProfit,
    grossMarginPct: percentOf(grossProfit, revenue),
    netMarginPct: percentOf(netProfit, revenue),
    orderCount: sumOf(metrics.map((day) => day.orders)),
    salesCount: sumOf(metrics.map((day) => day.items)),
    daily,
  };
}

function periodOf(range: DateRange, stores: string[]): DashboardPeriod {
  const metrics = rangeMetrics(range, stores);
  return {
    amount: sumOf(metrics.map((day) => day.revenue)),
    orderCount: sumOf(metrics.map((day) => day.orders)),
    productCount: sumOf(metrics.map((day) => day.items)),
  };
}

const lastDaysRange = (days: number): DateRange => ({ from: dayAgo(days - 1), to: dayAgo(0) });

function buildOverview(stores: string[]): DashboardOverview {
  const today = dayAgo(0);
  const monthFrom = `${today.slice(0, 8)}01`;
  const month = { from: monthFrom, to: today };
  const elapsedDays = Number(today.slice(8, 10));
  const previousMonthStart = new Date(`${monthFrom}T00:00:00Z`);
  previousMonthStart.setUTCMonth(previousMonthStart.getUTCMonth() - 1);
  const previousFrom = previousMonthStart.toISOString().slice(0, 10);
  const previousMonth = { from: previousFrom, to: addDays(previousFrom, elapsedDays - 1) };

  return {
    month: periodOf(month, stores),
    monthFrom,
    monthTo: today,
    today: periodOf(lastDaysRange(1), stores),
    last7: periodOf(lastDaysRange(WEEK_DAYS), stores),
    last30: periodOf(lastDaysRange(MONTH_DAYS), stores),
    last365: periodOf(lastDaysRange(YEAR_DAYS), stores),
    previousMonth: periodOf(previousMonth, stores).amount,
    daily: rangeMetrics(month, stores).map((day) => day.revenue),
  };
}

function handleStats({ query, stores }: DemoRequest): OrderStats | OrderStatsWithComparison {
  const range = resolveRange(query);
  const categoryId = categoryOf(query);
  const current = buildOrderStats(range, stores, categoryId);
  if (query.get('compare') !== 'true') return current;
  return { current, previous: buildOrderStats(previousRange(range), stores, categoryId) };
}

function handleProfit({ query, stores }: DemoRequest): ProfitSummary | ProfitSummaryWithComparison {
  const range = resolveRange(query);
  const categoryId = categoryOf(query);
  const current = buildProfitSummary(range, stores, categoryId);
  if (query.get('compare') !== 'true') return current;
  return { current, previous: buildProfitSummary(previousRange(range), stores, categoryId) };
}

function handleProfitByProduct({ query, stores }: DemoRequest): ProductProfitLeaderboard {
  const top = Math.min(TOP_PRODUCTS.length, Number(query.get('top')) || LEADERBOARD_TOP);
  const metrics = rangeMetrics(resolveRange(query), stores);
  const revenue = sumOf(metrics.map((day) => day.revenue));
  const items = Math.round(sumOf(metrics.map((day) => day.orders)) * ITEMS_RATIO);
  const rows = TOP_PRODUCTS.map((ranked) => toProductProfit(ranked, revenue, items));
  const byProfit = [...rows].sort((a, b) => b.grossProfit - a.grossProfit);
  return {
    topSellers: [...rows].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, top),
    mostProfitable: byProfit.slice(0, top),
    leastProfitable: byProfit.slice(-top).reverse(),
  };
}

export const dashboardOrderRoutes: DemoRoute[] = [
  get('/order/overview', ({ stores }) => buildOverview(stores)),
  get('/order/stats', handleStats),
  get('/order/profit-summary', handleProfit),
  get('/order/profit-by-product', handleProfitByProduct),
];
