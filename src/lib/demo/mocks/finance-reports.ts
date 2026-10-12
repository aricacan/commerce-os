// Finans raporları: yaşlandırma, marj kırılımı, pazaryeri ödeme takvimi ve ödeme raporu.
import type { AgingReport, AgingRow, AgingTotals, MarginBreakdown, MarginBreakdownRow } from '../../api/finance-reports';
import type { PaymentSchedule, PaymentScheduleDay, PayoutReport } from '../../api/marketplace-finance';
import { DEMO_STORES } from '../data/core';
import {
  FINANCE_PLATFORMS,
  GBP_TRY_RATE,
  defaultRange,
  rangeFigures,
  round2,
  storeShare,
} from '../data/finance-base';
import { createRng, dayAgo } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';

const DEFAULT_RANGE_DAYS = 30;
const WEDNESDAY = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TRENDYOL_NAME = 'Trendyol';
const PAYOUT_NET_RATIO = 0.78;
const AGING_SEED = 311;
const AGING_ROW_COUNT = 14;

// ── Yaşlandırma (alacak) ───────────────────────────────────────────────────────

const AGING_CUSTOMERS = [
  'Güneş Oto Yedek Parça', 'Marmara Aksesuar Ticaret', 'Anadolu Oto Market', 'Ege Araç Donanım', 'Boğaz Oto Center',
  'Kuzey Filo Hizmetleri', 'Karadeniz Oto Pazarı', 'Başkent Araç Aksesuarları', 'Akdeniz Tuning Atölyesi', 'Trakya Oto Galeri',
  'Northern Auto Accessories Ltd', 'Midlands Car Parts Ltd', 'Thames Motor Supplies', 'Pennine Trade Fittings',
];

function agingRows(): AgingRow[] {
  const rng = createRng(AGING_SEED);
  return AGING_CUSTOMERS.slice(0, AGING_ROW_COUNT).map((name, index) => {
    const isUk = index >= AGING_CUSTOMERS.length - 4;
    const scale = isUk ? 1 : GBP_TRY_RATE;
    const bucket = (max: number) => (rng.chance(0.75) ? round2(rng.int(1200, max) * scale) : 0);
    const notDue = bucket(24000);
    const days0To30 = bucket(15000);
    const days31To60 = bucket(9000);
    const days61To90 = bucket(5000);
    const days90Plus = rng.chance(0.3) ? bucket(4000) : 0;
    const totalOverdue = round2(days0To30 + days31To60 + days61To90 + days90Plus);
    return {
      customerId: index + 1,
      customerName: name,
      currency: isUk ? 'GBP' : 'TRY',
      paymentTermDays: rng.pick([15, 30, 45, 60]),
      notDue, days0To30, days31To60, days61To90, days90Plus,
      totalOverdue,
      total: round2(notDue + totalOverdue),
    };
  });
}

function agingTotals(rows: AgingRow[]): AgingTotals[] {
  const currencies = Array.from(new Set(rows.map((row) => row.currency)));
  return currencies.map((currency) => {
    const group = rows.filter((row) => row.currency === currency);
    const sum = (pick: (row: AgingRow) => number) => round2(group.reduce((total, row) => total + pick(row), 0));
    return {
      currency,
      notDue: sum((row) => row.notDue),
      days0To30: sum((row) => row.days0To30),
      days31To60: sum((row) => row.days31To60),
      days61To90: sum((row) => row.days61To90),
      days90Plus: sum((row) => row.days90Plus),
      totalOverdue: sum((row) => row.totalOverdue),
      total: sum((row) => row.total),
    };
  });
}

function aging(request: DemoRequest): AgingReport {
  const rows = agingRows();
  return { asOf: request.query.get('asOf') ?? dayAgo(0), rows, totals: agingTotals(rows) };
}

// ── Marj kırılımı ──────────────────────────────────────────────────────────────

function marginRow(key: string, share: number, range: { from: string; to: string }): MarginBreakdownRow {
  const figures = rangeFigures(range.from, range.to, []);
  const revenue = round2(figures.revenue * share);
  const commission = round2((figures.commission + figures.serviceFee) * share);
  const shipping = round2(figures.shippingCost * share);
  const productCost = round2(figures.buyingCost * share);
  const netProfit = round2(revenue - commission - shipping - productCost);
  const itemCount = Math.round(figures.itemCount * share);
  return {
    key, revenue, commission, shipping, productCost, netProfit, itemCount,
    marginPercent: revenue > 0 ? round2((netProfit / revenue) * 100) : null,
    missingShippingItemCount: Math.round(itemCount * 0.03),
  };
}

function sumMarginRows(rows: MarginBreakdownRow[]): MarginBreakdownRow {
  const sum = (pick: (row: MarginBreakdownRow) => number) => round2(rows.reduce((total, row) => total + pick(row), 0));
  const revenue = sum((row) => row.revenue);
  const netProfit = sum((row) => row.netProfit);
  return {
    key: 'Toplam',
    revenue,
    commission: sum((row) => row.commission),
    shipping: sum((row) => row.shipping),
    productCost: sum((row) => row.productCost),
    netProfit,
    marginPercent: revenue > 0 ? round2((netProfit / revenue) * 100) : null,
    itemCount: rows.reduce((total, row) => total + row.itemCount, 0),
    missingShippingItemCount: rows.reduce((total, row) => total + row.missingShippingItemCount, 0),
  };
}

function marginBreakdown(request: DemoRequest): MarginBreakdown {
  const dimension = request.query.get('dimension') === 'platform' ? 'platform' : 'store';
  const range = defaultRange(request.query, DEFAULT_RANGE_DAYS);
  const platformFilter = request.query.get('platformName');
  const rows = dimension === 'platform'
    ? FINANCE_PLATFORMS.filter((platform) => !platformFilter || platform.name === platformFilter).map((platform) => marginRow(platform.name, platform.share, range))
    : DEMO_STORES.map((store) => marginRow(store.name, storeShare([store.code]), range));
  return { dimension, rows, total: sumMarginRows(rows), truncated: false, itemLimit: 50000 };
}

// ── Pazaryeri ödeme takvimi / raporu ───────────────────────────────────────────

function platformShare(name: string | null): number {
  return FINANCE_PLATFORMS.find((platform) => platform.name === name)?.share ?? 1;
}

function wednesdaysBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let time = new Date(from).getTime(); time <= new Date(to).getTime(); time += MS_PER_DAY) {
    const date = new Date(time);
    if (date.getUTCDay() === WEDNESDAY) dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

function paymentSchedule(request: DemoRequest): PaymentSchedule {
  const range = defaultRange(request.query, DEFAULT_RANGE_DAYS);
  const share = platformShare(request.query.get('platformName'));
  const rng = createRng(range.from.length + 19);
  const today = dayAgo(0);
  const weekly = rangeFigures(range.from, range.to, request.stores);
  const weeks = Math.max(1, wednesdaysBetween(range.from, range.to).length);
  const days: PaymentScheduleDay[] = wednesdaysBetween(range.from, range.to).map((paymentDate) => ({
    paymentDate,
    netAmount: round2(((weekly.revenue * share * PAYOUT_NET_RATIO) / weeks) * rng.float(0.88, 1.12)),
    transactionCount: rng.int(180, 420),
    isForecast: paymentDate > today,
  }));
  days.push({ paymentDate: null, netAmount: round2(weekly.revenue * share * 0.04), transactionCount: rng.int(40, 90), isForecast: false });

  const dated = days.filter((day) => day.paymentDate);
  const totalNet = round2(dated.reduce((sum, day) => sum + day.netAmount, 0));
  const paidTotal = round2(dated.filter((day) => !day.isForecast).reduce((sum, day) => sum + day.netAmount, 0));
  const next = dated.find((day) => day.paymentDate && day.paymentDate >= today);
  return {
    days, totalNet, paidTotal,
    accruedTotal: totalNet,
    pendingBalance: round2(totalNet - paidTotal),
    nextPaymentDate: next?.paymentDate ?? null,
    nextPaymentAmount: next?.netAmount ?? null,
    nextPaymentIsForecast: next?.isForecast ?? false,
  };
}

function payoutReport(request: DemoRequest): PayoutReport {
  const range = defaultRange(request.query, DEFAULT_RANGE_DAYS);
  const platformName = request.query.get('platformName');
  const platforms = FINANCE_PLATFORMS.filter((platform) => !platformName || platform.name === platformName);
  const schedule = paymentSchedule(request);
  const rows = platforms.map((platform) => {
    const figures = rangeFigures(range.from, range.to, request.stores);
    const salesCredit = round2(figures.revenue * platform.share);
    const returns = round2(-salesCredit * 0.045);
    const commission = round2(-salesCredit * platform.commissionRate);
    const deduction = round2(-(salesCredit * 0.006 + figures.orderCount * platform.share * platform.serviceFee));
    const advertising = platform.name === TRENDYOL_NAME ? round2(-salesCredit * 0.035) : 0;
    const other = round2(salesCredit * 0.002);
    return {
      platformId: platform.id, platformName: platform.name,
      salesCredit, returns, commission, deduction, advertising, other,
      netPayout: round2(salesCredit + returns + commission + deduction + advertising + other),
      transactionCount: Math.round(figures.itemCount * platform.share),
      nextPaymentDate: schedule.nextPaymentDate,
      nextPaymentAmount: schedule.nextPaymentAmount,
    };
  });
  return {
    from: range.from, to: range.to, rows,
    totalNetPayout: round2(rows.reduce((sum, row) => sum + row.netPayout, 0)),
    undatedNet: schedule.days.find((day) => !day.paymentDate)?.netAmount ?? 0,
  };
}

export const financeReportRoutes: DemoRoute[] = [
  get('/finance/aging', aging),
  get('/finance/margin-breakdown', marginBreakdown),
  get('/marketplace-finance/payment-schedule', paymentSchedule),
  get('/marketplace-finance/payout-report', payoutReport),
];
