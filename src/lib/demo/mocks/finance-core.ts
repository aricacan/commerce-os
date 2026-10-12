// Finans çekirdeği: aylık P&L, net kâr, giderler, gider şablonları, KDV modu.
import type {
  FinanceExpense,
  FinanceExpenseTemplate,
  NetProfitSummary,
  PnlExpenseLine,
  PnlMonth,
  PnlPlatform,
  PnlResponse,
  VatMode,
} from '../../../types/api';
import { DEMO_STORES } from '../data/core';
import {
  EXPENSE_LINES,
  expenseAmount,
  expenseVat,
  monthFigures,
  monthsInRange,
  round2,
  storeShare,
  totalExpenses,
  type MonthFigures,
} from '../data/finance-base';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';

const MONTHS_IN_YEAR = 12;
const NOT_FOUND_STATUS = 404;
const COST_COVERAGE_RATIO = 0.97;
const SHIPPING_COVERAGE_RATIO = 0.93;
const UNKNOWN_SHIPPING_RATIO = 0.04;
const TEMPLATE_START_YEAR = 2025;
const SHARED_TEMPLATE_SPLIT = 60;

const vatMode: VatMode = 'Standard';

function scaled(value: number, share: number): number {
  return round2(value * share);
}

function toPnlPlatforms(figures: MonthFigures, share: number): PnlPlatform[] {
  return figures.platforms.map((platform) => ({
    platformId: platform.platformId,
    platformName: platform.platformName,
    orderCount: Math.round(platform.orderCount * share),
    revenue: scaled(platform.revenue, share),
    commission: scaled(platform.commission, share),
    serviceFee: scaled(platform.serviceFee, share),
    vat: scaled(platform.commissionVat + platform.serviceFeeVat, share),
    commissionVat: scaled(platform.commissionVat, share),
    serviceFeeVat: scaled(platform.serviceFeeVat, share),
  }));
}

function toPnlMonth(figures: MonthFigures, share: number): PnlMonth {
  const expenses = scaled(totalExpenses(figures.year, figures.month), share);
  const grossProfit = scaled(figures.grossProfit, share);
  const itemCount = Math.round(figures.itemCount * share);
  const coverage = (ratio: number) => ({ covered: Math.round(itemCount * ratio), total: itemCount });
  return {
    month: figures.month,
    revenue: scaled(figures.revenue, share),
    orderCount: Math.round(figures.orderCount * share),
    buyingCost: scaled(figures.buyingCost, share),
    boxCost: scaled(figures.boxCost, share),
    shippingCost: scaled(figures.shippingCost, share),
    commission: scaled(figures.commission, share),
    serviceFee: scaled(figures.serviceFee, share),
    vat: scaled(figures.vat, share),
    grossProfit,
    totalExpenses: expenses,
    netProfit: round2(grossProfit - expenses),
    outputVat: scaled(figures.outputVat, share),
    buyingVat: scaled(figures.buyingVat, share),
    boxVat: scaled(figures.boxVat, share),
    shippingVat: scaled(figures.shippingVat, share),
    commissionVat: scaled(figures.commissionVat, share),
    serviceFeeVat: scaled(figures.serviceFeeVat, share),
    expenseVat: scaled(expenseVat(figures.year, figures.month), share),
    buyingCostCoverage: coverage(COST_COVERAGE_RATIO),
    boxCostCoverage: coverage(1),
    shippingCostCoverage: coverage(SHIPPING_COVERAGE_RATIO),
    unknownShippingLines: Math.round(itemCount * UNKNOWN_SHIPPING_RATIO),
    platforms: toPnlPlatforms(figures, share),
  };
}

const NUMERIC_FIELDS = [
  'revenue', 'orderCount', 'buyingCost', 'boxCost', 'shippingCost', 'commission', 'serviceFee', 'vat', 'grossProfit',
  'totalExpenses', 'netProfit', 'outputVat', 'buyingVat', 'boxVat', 'shippingVat', 'commissionVat', 'serviceFeeVat', 'expenseVat',
] as const;

/** 12 ayın toplamı: sayısal alanlar toplanır, kapsam ve platform kırılımı birleştirilir. */
function sumMonths(months: PnlMonth[]): PnlMonth {
  const total = { ...months[0], month: 0 };
  for (const field of NUMERIC_FIELDS) {
    total[field] = round2(months.reduce((sum, row) => sum + row[field], 0));
  }
  total.buyingCostCoverage = sumCoverage(months.map((row) => row.buyingCostCoverage));
  total.boxCostCoverage = sumCoverage(months.map((row) => row.boxCostCoverage));
  total.shippingCostCoverage = sumCoverage(months.map((row) => row.shippingCostCoverage));
  total.unknownShippingLines = months.reduce((sum, row) => sum + (row.unknownShippingLines ?? 0), 0);
  total.platforms = months[0].platforms.map((platform) => mergePlatform(platform.platformId, months));
  return total;
}

function sumCoverage(items: { covered: number; total: number }[]) {
  return {
    covered: items.reduce((sum, item) => sum + item.covered, 0),
    total: items.reduce((sum, item) => sum + item.total, 0),
  };
}

function mergePlatform(platformId: number, months: PnlMonth[]): PnlPlatform {
  const rows = months.flatMap((month) => month.platforms.filter((platform) => platform.platformId === platformId));
  const sum = (pick: (row: PnlPlatform) => number) => round2(rows.reduce((total, row) => total + pick(row), 0));
  return {
    platformId,
    platformName: rows[0].platformName,
    orderCount: rows.reduce((total, row) => total + row.orderCount, 0),
    revenue: sum((row) => row.revenue),
    commission: sum((row) => row.commission),
    serviceFee: sum((row) => row.serviceFee),
    vat: sum((row) => row.vat),
    commissionVat: sum((row) => row.commissionVat),
    serviceFeeVat: sum((row) => row.serviceFeeVat),
  };
}

function expenseLinesFor(year: number, share: number, ads: boolean): PnlExpenseLine[] {
  return EXPENSE_LINES.filter((line) => line.isAd === ads).map((line) => {
    const monthlyAmounts = Array.from({ length: MONTHS_IN_YEAR }, (_, index) => scaled(expenseAmount(line, year, index + 1), share));
    return { name: line.name, monthlyAmounts, total: round2(monthlyAmounts.reduce((sum, value) => sum + value, 0)) };
  });
}

function pnl(request: DemoRequest): PnlResponse {
  const year = Number(request.query.get('year')) || new Date().getFullYear();
  const share = storeShare(request.stores);
  const months = Array.from({ length: MONTHS_IN_YEAR }, (_, index) => toPnlMonth(monthFigures(year, index + 1), share));
  return {
    year,
    vatMode,
    months,
    total: sumMonths(months),
    expenseLines: expenseLinesFor(year, share, false),
    adExpenseLines: expenseLinesFor(year, share, true),
  };
}

/** Sorgudan (year+month ya da from+to) etkilenen aylar ve oranları. */
function periodMonths(query: URLSearchParams) {
  const year = Number(query.get('year'));
  const month = Number(query.get('month'));
  if (year && month) return [{ year, month, weight: 1 }];
  return monthsInRange(query.get('from') ?? '', query.get('to') ?? '');
}

function netProfit(request: DemoRequest): NetProfitSummary {
  const share = storeShare(request.stores);
  const periods = periodMonths(request.query);
  const grossProfit = periods.reduce((sum, { year, month, weight }) => sum + monthFigures(year, month).grossProfit * weight * share, 0);
  const expenses = periods.reduce((sum, { year, month, weight }) => sum + totalExpenses(year, month) * weight * share, 0);
  const first = periods[0];
  return {
    year: first?.year ?? new Date().getFullYear(),
    month: first?.month ?? new Date().getMonth() + 1,
    grossProfit: round2(grossProfit),
    totalExpenses: round2(expenses),
    netProfit: round2(grossProfit - expenses),
  };
}

function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function expenses(request: DemoRequest): FinanceExpense[] {
  const share = storeShare(request.stores);
  return periodMonths(request.query).flatMap(({ year, month }) =>
    EXPENSE_LINES.map((line, lineIndex): FinanceExpense => ({
      id: (year * MONTHS_IN_YEAR + month) * 100 + lineIndex,
      name: line.name,
      amount: scaled(expenseAmount(line, year, month), share),
      expenseDate: monthStart(year, month),
      note: null,
      category: line.isAd ? 1 : 0,
      adPlatform: line.adPlatform,
      amountIncludesVat: true,
      vatRate: 0.2,
      isAnnualPayment: false,
      templateId: line.isAd ? null : lineIndex + 1,
      storeName: DEMO_STORES[0].name,
      sharedPercentage: null,
    })),
  ).filter((expense) => expense.amount > 0);
}

function expenseTemplates(): FinanceExpenseTemplate[] {
  const now = new Date();
  return EXPENSE_LINES.filter((line) => !line.isAd).map((line, index) => ({
    id: index + 1,
    name: line.name,
    amount: line.amount,
    category: 0,
    adPlatform: null,
    amountIncludesVat: true,
    vatRate: 0.2,
    recurrence: 0,
    startYear: TEMPLATE_START_YEAR,
    startMonth: 1,
    endYear: now.getFullYear(),
    endMonth: MONTHS_IN_YEAR,
    note: null,
    allocations: [
      { erpSourceCode: DEMO_STORES[0].code, storeId: 1, storeName: DEMO_STORES[0].name, label: DEMO_STORES[0].name, percentage: SHARED_TEMPLATE_SPLIT },
      { erpSourceCode: DEMO_STORES[1].code, storeId: 2, storeName: DEMO_STORES[1].name, label: DEMO_STORES[1].name, percentage: 100 - SHARED_TEMPLATE_SPLIT },
    ],
    generatedExpenseCount: (now.getFullYear() - TEMPLATE_START_YEAR) * MONTHS_IN_YEAR + now.getMonth() + 1,
  }));
}

export const financeCoreRoutes: DemoRoute[] = [
  get('/finance/pnl', pnl),
  get('/finance/net-profit', netProfit),
  get('/finance/expenses/:id/shared-group', () => new DemoHttpResponse(NOT_FOUND_STATUS)),
  get('/finance/expenses', expenses),
  get('/finance/expense-templates', expenseTemplates),
  get('/finance/vat-mode', () => ({ mode: vatMode })),
];
