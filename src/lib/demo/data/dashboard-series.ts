// Pano mock'larının ortak zaman serisi motoru: aynı gün her çağrıda aynı sayıyı verir,
// böylece KPI, grafik ve tablo birbiriyle tutarlı kalır.
import type { DailyProfit } from '../../../types/api';
import { createRng, dayAgo } from '../seed';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 400;
const DAILY_ORDERS_AT_FULL_SCOPE = 58;
const AVERAGE_ORDER_VALUE = 820;
const ITEMS_PER_ORDER = 1.35;
const RETURN_RATE = 0.045;
const TODAY_PROGRESS = 0.62;
const WEEKDAY_FACTORS = [0.82, 1.0, 1.05, 1.08, 1.1, 0.95, 0.78];
const TREND_LOSS_PER_DAY = 0.0009;

// Gelirin maliyet kalemlerine dağılımı (toplam ciroya oran).
const COST_RATE = 0.5;
const SHIPPING_RATE = 0.07;
const BOX_RATE = 0.015;
const COMMISSION_RATE = 0.12;
const SERVICE_FEE_RATE = 0.02;
const VAT_RATE = 0.08;
const EXPENSE_RATE = 0.055;

// Mağaza kodu -> toplam hacimdeki pay. Eski seçici kodları aynı mağazaya çözülür.
const STORE_SHARES: Record<string, number> = {
  'store-a': 0.5,
  'store-b': 0.28,
  'store-c': 0.22,
  'storea-sentos': 0.5,
  'storeb-sentos': 0.28,
  'base-storea': 0.22,
  'base-storeb': 0,
};

export interface DateRange {
  from: string;
  to: string;
}

export interface DayMetrics {
  date: string;
  orders: number;
  items: number;
  returns: number;
  revenue: number;
}

const toDay = (value: Date): string => value.toISOString().slice(0, 10);

export function addDays(day: string, amount: number): string {
  return toDay(new Date(new Date(`${day}T00:00:00Z`).getTime() + amount * MS_PER_DAY));
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / MS_PER_DAY);
}

/** from/to sorgu parametrelerinden aralık; yoksa son 30 gün. Aralık üst sınırla kırpılır. */
export function resolveRange(query: URLSearchParams): DateRange {
  const to = query.get('to') || dayAgo(0);
  const requestedFrom = query.get('from') || addDays(to, -(DEFAULT_RANGE_DAYS - 1));
  const from = daysBetween(requestedFrom, to) >= MAX_RANGE_DAYS ? addDays(to, -(MAX_RANGE_DAYS - 1)) : requestedFrom;
  return { from, to };
}

/** Aynı uzunlukta, hemen öncesindeki aralık. */
export function previousRange(range: DateRange): DateRange {
  const length = daysBetween(range.from, range.to) + 1;
  return { from: addDays(range.from, -length), to: addDays(range.from, -1) };
}

export function eachDay(range: DateRange): string[] {
  const length = daysBetween(range.from, range.to) + 1;
  return Array.from({ length: Math.max(0, length) }, (_, index) => addDays(range.from, index));
}

/** X-Store başlığındaki kodların toplam hacimdeki payı; boş seçim = tümü. */
export function storeShare(stores: string[]): number {
  if (stores.length === 0) return 1;
  return stores.reduce((sum, code) => sum + (STORE_SHARES[code] ?? 0), 0);
}

function hashDay(day: string): number {
  return [...day].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

export function dayMetrics(day: string, share: number): DayMetrics {
  const rng = createRng(hashDay(day));
  const weekday = WEEKDAY_FACTORS[new Date(`${day}T00:00:00Z`).getUTCDay()];
  const age = Math.max(0, daysBetween(day, dayAgo(0)));
  const trend = Math.max(0.55, 1 - age * TREND_LOSS_PER_DAY);
  const progress = age === 0 ? TODAY_PROGRESS : 1;
  const noise = rng.float(0.86, 1.14);

  const orders = Math.max(0, Math.round(DAILY_ORDERS_AT_FULL_SCOPE * weekday * trend * noise * progress * share));
  const revenue = Math.round(orders * AVERAGE_ORDER_VALUE * rng.float(0.93, 1.07));
  const returns = Math.round(orders * RETURN_RATE * rng.float(0.5, 1.6));
  return { date: day, orders, items: Math.round(orders * ITEMS_PER_ORDER), returns, revenue };
}

export function rangeMetrics(range: DateRange, stores: string[]): DayMetrics[] {
  const share = storeShare(stores);
  return eachDay(range).map((day) => dayMetrics(day, share));
}

export const sumOf = (items: number[]): number => items.reduce((sum, value) => sum + value, 0);

export function dailyProfit(metrics: DayMetrics): DailyProfit {
  const { revenue } = metrics;
  const rawGross = revenue * (1 - COST_RATE - SHIPPING_RATE - BOX_RATE);
  const gross = rawGross - revenue * (COMMISSION_RATE + SERVICE_FEE_RATE + VAT_RATE);
  return {
    date: metrics.date,
    orderCount: metrics.orders,
    revenue,
    rawGrossProfit: Math.round(rawGross),
    grossProfit: Math.round(gross),
    netProfit: Math.round(gross - revenue * EXPENSE_RATE),
  };
}

export interface ProfitTotals {
  totalRevenue: number;
  totalCost: number;
  totalShipping: number;
  totalCommission: number;
  totalServiceFee: number;
  totalBoxCost: number;
  totalVat: number;
  proratedExpenses: number;
}

export function profitTotals(revenue: number): ProfitTotals {
  return {
    totalRevenue: revenue,
    totalCost: Math.round(revenue * COST_RATE),
    totalShipping: Math.round(revenue * SHIPPING_RATE),
    totalCommission: Math.round(revenue * COMMISSION_RATE),
    totalServiceFee: Math.round(revenue * SERVICE_FEE_RATE),
    totalBoxCost: Math.round(revenue * BOX_RATE),
    totalVat: Math.round(revenue * VAT_RATE),
    proratedExpenses: Math.round(revenue * EXPENSE_RATE),
  };
}

export const ITEMS_RATIO = ITEMS_PER_ORDER;
