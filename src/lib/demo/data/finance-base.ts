// Finans mock'larının ortak temeli: aylık ciro/maliyet rakamları (TRY) ve mağaza payları.
// Tüm finans ekranları (P&L, net kâr, ödeme takvimi, reklam) aynı rakamlardan türer ki tutarlı kalsın.
import { createRng } from '../seed';

export const GBP_TRY_RATE = 44.2;
export const VAT_RATE = 0.2;
const VAT_DIVISOR = 1 + VAT_RATE;
const MONTHS_IN_YEAR = 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface FinancePlatform {
  id: number;
  name: string;
  /** Cironun payı. */
  share: number;
  commissionRate: number;
  /** Sipariş başı sabit hizmet bedeli (TRY). */
  serviceFee: number;
}

export const FINANCE_PLATFORMS: FinancePlatform[] = [
  { id: 1, name: 'Trendyol', share: 0.46, commissionRate: 0.14, serviceFee: 8.99 },
  { id: 2, name: 'Hepsiburada', share: 0.2, commissionRate: 0.13, serviceFee: 7.5 },
  { id: 3, name: 'Amazon', share: 0.14, commissionRate: 0.15, serviceFee: 15 },
  { id: 4, name: 'Web Sitesi', share: 0.15, commissionRate: 0.022, serviceFee: 0 },
  { id: 5, name: 'eBay', share: 0.05, commissionRate: 0.12, serviceFee: 12 },
];

/** Mağaza kodu → cironun payı (X-Store başlığına saygı için). */
const STORE_SHARES: Record<string, number> = { 'store-a': 0.5, 'store-b': 0.3, 'store-c': 0.2 };

export function storeShare(stores: string[]): number {
  const known = stores.filter((code) => code in STORE_SHARES);
  if (known.length === 0) return 1;
  return known.reduce((sum, code) => sum + STORE_SHARES[code], 0);
}

// Ocak..Aralık mevsimsellik çarpanı (yaz ve kasım kampanyası yüksek).
const SEASONALITY = [0.82, 0.8, 0.92, 1.0, 1.08, 1.15, 1.18, 1.1, 1.0, 1.05, 1.35, 1.28];
const BASE_MONTHLY_REVENUE = 2_450_000;
const AVERAGE_ORDER_VALUE = 640;
const ITEMS_PER_ORDER = 1.4;

const BUYING_COST_RATIO = 0.52;
const BOX_COST_RATIO = 0.016;
const SHIPPING_COST_RATIO = 0.068;

export interface PlatformFigures {
  platformId: number;
  platformName: string;
  orderCount: number;
  revenue: number;
  commission: number;
  serviceFee: number;
  commissionVat: number;
  serviceFeeVat: number;
}

export interface MonthFigures {
  year: number;
  month: number;
  orderCount: number;
  itemCount: number;
  revenue: number;
  buyingCost: number;
  boxCost: number;
  shippingCost: number;
  commission: number;
  serviceFee: number;
  outputVat: number;
  buyingVat: number;
  boxVat: number;
  shippingVat: number;
  commissionVat: number;
  serviceFeeVat: number;
  vat: number;
  grossProfit: number;
  platforms: PlatformFigures[];
}

export const round2 = (value: number): number => Math.round(value * 100) / 100;
const vatOf = (grossAmount: number): number => round2((grossAmount * VAT_RATE) / VAT_DIVISOR);

function currentYearMonth(): { year: number; month: number; dayFraction: number } {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return { year: now.getFullYear(), month: now.getMonth() + 1, dayFraction: now.getDate() / daysInMonth };
}

/** Ayın veri kapsamı: geçmiş ay 1, içinde bulunulan ay gün oranı, gelecek ay 0. */
function monthCompleteness(year: number, month: number): number {
  const now = currentYearMonth();
  const index = year * MONTHS_IN_YEAR + month;
  const nowIndex = now.year * MONTHS_IN_YEAR + now.month;
  if (index > nowIndex) return 0;
  return index === nowIndex ? now.dayFraction : 1;
}

function buildPlatformFigures(platform: FinancePlatform, monthRevenue: number): PlatformFigures {
  const revenue = round2(monthRevenue * platform.share);
  const orderCount = Math.round(revenue / AVERAGE_ORDER_VALUE);
  const commission = round2(revenue * platform.commissionRate);
  const serviceFee = round2(orderCount * platform.serviceFee);
  return {
    platformId: platform.id,
    platformName: platform.name,
    orderCount,
    revenue,
    commission,
    serviceFee,
    commissionVat: vatOf(commission),
    serviceFeeVat: vatOf(serviceFee),
  };
}

const figuresCache = new Map<string, MonthFigures>();

/** Bir ayın tüm mağazalar toplamı rakamları; aynı (yıl, ay) her zaman aynı sonucu verir. */
export function monthFigures(year: number, month: number): MonthFigures {
  const key = `${year}-${month}`;
  const cached = figuresCache.get(key);
  if (cached) return cached;

  const rng = createRng(year * 100 + month);
  const growth = 1 + (year - 2025) * 0.18 + month * 0.004;
  const monthRevenue = BASE_MONTHLY_REVENUE * SEASONALITY[month - 1] * growth * rng.float(0.94, 1.06) * monthCompleteness(year, month);

  const platforms = FINANCE_PLATFORMS.map((platform) => buildPlatformFigures(platform, monthRevenue));
  const sum = (pick: (row: PlatformFigures) => number) => round2(platforms.reduce((total, row) => total + pick(row), 0));
  const revenue = sum((row) => row.revenue);
  const orderCount = sum((row) => row.orderCount);
  const commission = sum((row) => row.commission);
  const serviceFee = sum((row) => row.serviceFee);
  const buyingCost = round2(revenue * BUYING_COST_RATIO * rng.float(0.97, 1.03));
  const boxCost = round2(revenue * BOX_COST_RATIO);
  const shippingCost = round2(revenue * SHIPPING_COST_RATIO * rng.float(0.95, 1.05));

  const outputVat = vatOf(revenue);
  const buyingVat = vatOf(buyingCost);
  const boxVat = vatOf(boxCost);
  const shippingVat = vatOf(shippingCost);
  const commissionVat = sum((row) => row.commissionVat);
  const serviceFeeVat = sum((row) => row.serviceFeeVat);
  const vat = round2(outputVat - buyingVat - boxVat - shippingVat - commissionVat - serviceFeeVat);
  const grossProfit = round2(revenue - buyingCost - boxCost - shippingCost - commission - serviceFee - vat);

  const figures: MonthFigures = {
    year, month, orderCount, itemCount: Math.round(orderCount * ITEMS_PER_ORDER), revenue, buyingCost, boxCost, shippingCost,
    commission, serviceFee, outputVat, buyingVat, boxVat, shippingVat, commissionVat, serviceFeeVat, vat, grossProfit, platforms,
  };
  figuresCache.set(key, figures);
  return figures;
}

// ── Giderler (aylık, TRY) ─────────────────────────────────────────────────────

export interface ExpenseLineDefinition {
  name: string;
  amount: number;
  isAd: boolean;
  adPlatform: string | null;
}

export const EXPENSE_LINES: ExpenseLineDefinition[] = [
  { name: 'Ofis ve depo kirası', amount: 96_000, isAd: false, adPlatform: null },
  { name: 'Personel maaşları', amount: 215_000, isAd: false, adPlatform: null },
  { name: 'Muhasebe ve danışmanlık', amount: 18_500, isAd: false, adPlatform: null },
  { name: 'Yazılım abonelikleri', amount: 12_400, isAd: false, adPlatform: null },
  { name: 'Elektrik, su, internet', amount: 14_800, isAd: false, adPlatform: null },
  { name: 'Google Ads', amount: 58_000, isAd: true, adPlatform: 'Google' },
  { name: 'Meta Ads', amount: 41_000, isAd: true, adPlatform: 'Meta' },
  { name: 'Trendyol Reklam', amount: 36_500, isAd: true, adPlatform: 'Trendyol' },
];

/** Ay için gider tutarı; geçmiş ay tam, içinde bulunulan ay tam (sabit giderler), gelecek ay 0. */
export function expenseAmount(line: ExpenseLineDefinition, year: number, month: number): number {
  if (monthCompleteness(year, month) === 0) return 0;
  const wobble = createRng(year * 1000 + month * 10 + line.name.length).float(0.95, 1.07);
  return Math.round(line.amount * (line.isAd ? SEASONALITY[month - 1] : 1) * wobble);
}

export function totalExpenses(year: number, month: number): number {
  return EXPENSE_LINES.reduce((total, line) => total + expenseAmount(line, year, month), 0);
}

export function expenseVat(year: number, month: number): number {
  return vatOf(totalExpenses(year, month));
}

// ── Tarih aralığı yardımcıları ─────────────────────────────────────────────────

export interface MonthWeight {
  year: number;
  month: number;
  /** Aralığın bu aya düşen oranı (0-1). */
  weight: number;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** [from, to] aralığının dokunduğu aylar ve her aydaki gün oranı. */
export function monthsInRange(from: string, to: string): MonthWeight[] {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

  const weights: MonthWeight[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const monthStart = new Date(year, month - 1, 1).getTime();
    const monthEnd = new Date(year, month, 0).getTime();
    const overlapStart = Math.max(monthStart, start.getTime());
    const overlapEnd = Math.min(monthEnd, end.getTime());
    const overlapDays = Math.floor((overlapEnd - overlapStart) / MS_PER_DAY) + 1;
    if (overlapDays > 0) weights.push({ year, month, weight: Math.min(1, overlapDays / daysInMonth(year, month)) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return weights;
}

/** Son `days` günün başlangıç/bitiş tarihi, "YYYY-MM-DD". */
export function defaultRange(query: URLSearchParams, days: number): { from: string; to: string } {
  const to = query.get('to') ?? new Date().toISOString().slice(0, 10);
  const from = query.get('from') ?? new Date(new Date(to).getTime() - (days - 1) * MS_PER_DAY).toISOString().slice(0, 10);
  return { from, to };
}

/** Aralığa oranlanmış toplam ciro/maliyet rakamları (mağaza payı uygulanmış). */
export function rangeFigures(from: string, to: string, stores: string[]) {
  const share = storeShare(stores);
  const empty = { revenue: 0, buyingCost: 0, boxCost: 0, shippingCost: 0, commission: 0, serviceFee: 0, vat: 0, grossProfit: 0, orderCount: 0, itemCount: 0 };
  return monthsInRange(from, to).reduce((total, { year, month, weight }) => {
    const figures = monthFigures(year, month);
    const factor = weight * share;
    return {
      revenue: total.revenue + figures.revenue * factor,
      buyingCost: total.buyingCost + figures.buyingCost * factor,
      boxCost: total.boxCost + figures.boxCost * factor,
      shippingCost: total.shippingCost + figures.shippingCost * factor,
      commission: total.commission + figures.commission * factor,
      serviceFee: total.serviceFee + figures.serviceFee * factor,
      vat: total.vat + figures.vat * factor,
      grossProfit: total.grossProfit + figures.grossProfit * factor,
      orderCount: total.orderCount + figures.orderCount * factor,
      itemCount: total.itemCount + figures.itemCount * factor,
    };
  }, empty);
}

/** Son N ayın (yıl, ay) çiftleri, eskiden yeniye. */
export function lastMonths(count: number): { year: number; month: number }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  });
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}
