// Erpis sipariş analizi: kalemler, özet, trend, kırılım, yaşlandırma, planlama, firma panosu.
import type {
  ErpisAgingBucket,
  ErpisBreakdownItem,
  ErpisCompanyOverview,
  ErpisDimensionTrend,
  ErpisFilterOption,
  ErpisFilterOptions,
  ErpisMixedOrder,
  ErpisOrderLineDetail,
  ErpisOrderTrendPoint,
  ErpisOrdersSummary,
  ErpisPeriod,
  ErpisPlanningItem,
  ErpisPlanningPage,
  ErpisPlanningStatus,
  ErpisScopeSummary,
} from '../../api/erpis-query';
import {
  ERPIS_COMPANIES,
  ERPIS_ITEMS,
  ERPIS_LINES,
  currencyTotals,
  filterLines,
  sumQuantity,
  toTry,
  type ErpisLineRecord,
} from '../data/finance-erpis';
import { round2 } from '../data/finance-base';
import { dayAgo, lastDays, paginate } from '../seed';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';

const NOT_FOUND_STATUS = 404;
const HOME_CURRENCY = 'TRY';
const DOMESTIC_COUNTRY = 'Türkiye';
const DEFAULT_TOP_N = 10;
const DIMENSION_TREND_DEFAULT = 5;
const SHORT_THRESHOLD = 0;
const TIGHT_RATIO = 0.25;
const AGING_BUCKETS: [string, string, number, number][] = [
  ['0-30', '0-30 gün', 0, 30], ['31-60', '31-60 gün', 31, 60], ['61-90', '61-90 gün', 61, 90], ['90+', '90+ gün', 91, Infinity],
];
const DAILY_WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const lineTryAmount = (line: ErpisLineRecord): number => toTry(line.netAmount ?? 0, line.currency);
const daysSince = (date: string | null): number => (date ? Math.floor((Date.now() - new Date(date).getTime()) / MS_PER_DAY) : 0);
const distinct = <T,>(values: T[]): number => new Set(values).size;

// ── Kalemler ───────────────────────────────────────────────────────────────────

function sortLines(lines: ErpisLineRecord[], sortBy: string | null, desc: boolean): ErpisLineRecord[] {
  const key = (sortBy ?? 'orderDate') as keyof ErpisLineRecord;
  const direction = desc || !sortBy ? -1 : 1;
  return [...lines].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left === right) return 0;
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    return (left > right ? 1 : -1) * direction;
  });
}

function orderLines(request: DemoRequest) {
  const lines = sortLines(filterLines(request.query), request.query.get('sortBy'), request.query.get('desc') !== 'false');
  const page = paginate(lines, request.query, 50);
  return { items: page.items, total: page.total, page: page.page, pageSize: page.pageSize };
}

function orderLineDetail(request: DemoRequest): ErpisOrderLineDetail | DemoHttpResponse {
  const line = ERPIS_LINES.find((item) => item.id === Number(request.params.id));
  if (!line) return new DemoHttpResponse(NOT_FOUND_STATUS);
  const item = ERPIS_ITEMS.find((candidate) => candidate.id === line.itemId);
  return {
    line, reservedQty: Math.round(line.orderedQty ?? 0) * 0.2, stockOnHand: item?.stockOnHand ?? null,
    netUnitPrice: line.unitPrice, discount1: 5, discount2: 0, discount3: 0, discount4: 0,
    recordDate: line.orderDate, lastInvoiceDate: line.isClosed ? line.deliveryDate : null, lineType: 'Standart',
    productionMode: 'Stoktan', departmentName: 'Satış', notes: null, warehouseBreakdownRaw: null, customerOrderNo: null,
    shippingAddress: null, firstSeenUploadId: 1, lastSeenUploadId: 14, closedAt: line.isClosed ? line.deliveryDate : null,
    stockLocations: [{ zone: 'A', shelf: 'A-12', quantity: Math.round((item?.stockOnHand ?? 0) * 0.6) }],
    sourceRow: null, sourceRowIndex: null,
  };
}

function ordersSummary(request: DemoRequest): ErpisOrdersSummary {
  const lines = filterLines(request.query);
  const dates = lines.map((line) => line.orderDate ?? '').filter(Boolean).sort();
  const convertTo = request.query.get('convertTo');
  const open = lines.filter((line) => !line.isClosed);
  return {
    lineCount: lines.length, orderCount: distinct(lines.map((line) => line.orderId)),
    partyCount: distinct(lines.map((line) => line.partyId)), itemCount: distinct(lines.map((line) => line.itemId)),
    openLineCount: open.length, closedLineCount: lines.length - open.length,
    totalQuantity: sumQuantity(lines, (line) => line.orderedQty),
    remainingQuantity: sumQuantity(lines, (line) => line.remainingQty),
    shippedQuantity: sumQuantity(lines, (line) => line.shippedQty),
    shippedTotals: currencyTotals(lines, (line) => (line.unitPrice ?? 0) * (line.shippedQty ?? 0)),
    periodStart: dates[0] ?? null, periodEnd: dates[dates.length - 1] ?? null, lastUploadedAt: dayAgo(0),
    totals: currencyTotals(lines),
    converted: convertTo ? { currency: convertTo, total: round2(lines.reduce((sum, line) => sum + lineTryAmount(line), 0)), rateDate: dayAgo(0), missingRates: [] } : null,
  };
}

// ── Trend ve kırılımlar ────────────────────────────────────────────────────────

function bucketOf(date: string, bucket: string | null): string {
  if (bucket === 'day') return date;
  if (bucket === 'year') return date.slice(0, 4);
  if (bucket === 'week') {
    const time = new Date(date).getTime();
    const monday = new Date(time - ((new Date(date).getUTCDay() + 6) % 7) * MS_PER_DAY);
    return monday.toISOString().slice(0, 10);
  }
  return date.slice(0, 7);
}

function ordersTrend(request: DemoRequest): ErpisOrderTrendPoint[] {
  const bucket = request.query.get('bucket');
  const points = new Map<string, ErpisOrderTrendPoint>();
  for (const line of filterLines(request.query)) {
    const label = bucketOf(line.orderDate ?? dayAgo(0), bucket);
    const currency = line.currency ?? HOME_CURRENCY;
    const key = `${label}|${currency}`;
    const point = points.get(key) ?? { bucket: label, currency, amount: 0, quantity: 0, lineCount: 0, shippedAmount: 0, shippedQuantity: 0, openLineCount: 0, closedLineCount: 0 };
    point.amount = round2(point.amount + (line.netAmount ?? 0));
    point.quantity += line.orderedQty ?? 0;
    point.lineCount += 1;
    point.shippedAmount = round2(point.shippedAmount + (line.unitPrice ?? 0) * (line.shippedQty ?? 0));
    point.shippedQuantity += line.shippedQty ?? 0;
    if (line.isClosed) point.closedLineCount += 1; else point.openLineCount += 1;
    points.set(key, point);
  }
  return [...points.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
}

const DIMENSIONS: Record<string, (line: ErpisLineRecord) => { key: string; label: string; subLabel?: string | null }> = {
  brand: (line) => ({ key: line.brand ?? '-', label: line.brand ?? 'Belirsiz' }),
  model: (line) => ({ key: line.model ?? '-', label: line.model ?? 'Belirsiz' }),
  vehicle: (line) => ({ key: `${line.brand}|${line.model}`, label: `${line.brand ?? ''} ${line.model ?? ''}`.trim() }),
  category: (line) => ({ key: line.categoryName ?? '-', label: line.categoryName ?? 'Belirsiz' }),
  productType: (line) => ({ key: line.productType ?? '-', label: line.productType ?? 'Belirsiz' }),
  item: (line) => ({ key: line.sku ?? '-', label: line.sku ?? '-', subLabel: line.itemName }),
  party: (line) => ({ key: String(line.partyId), label: line.partyName ?? 'Belirsiz' }),
  currency: (line) => ({ key: line.currency ?? '-', label: line.currency ?? '-' }),
  country: (line) => ({ key: line.countryName ?? '-', label: line.countryName ?? '-' }),
  seg1: (line) => ({ key: line.seg1 ?? '-', label: line.seg1 ?? '-' }),
  seg2: (line) => ({ key: line.seg2 ?? '-', label: line.seg2 ?? '-' }),
  seg3: (line) => ({ key: line.seg3 ?? '-', label: line.seg3 ?? '-' }),
  itemKind: (line) => ({ key: line.itemKind, label: line.itemKind }),
};

function groupLines(lines: ErpisLineRecord[], by: string) {
  const describe = DIMENSIONS[by] ?? DIMENSIONS.brand;
  const groups = new Map<string, { label: string; subLabel: string | null; lines: ErpisLineRecord[] }>();
  for (const line of lines) {
    const { key, label, subLabel } = describe(line);
    const group = groups.get(key) ?? { label, subLabel: subLabel ?? null, lines: [] };
    group.lines.push(line);
    groups.set(key, group);
  }
  return groups;
}

function breakdown(request: DemoRequest): ErpisBreakdownItem[] {
  const orderBy = request.query.get('orderBy') ?? 'amount';
  const direction = request.query.get('asc') === 'true' ? 1 : -1;
  const limit = Number(request.query.get('limit')) || DEFAULT_TOP_N;
  const items = [...groupLines(filterLines(request.query), request.query.get('by') ?? 'brand')].map(([key, group]): ErpisBreakdownItem => ({
    key, label: group.label, subLabel: group.subLabel,
    quantity: sumQuantity(group.lines, (line) => line.orderedQty), lineCount: group.lines.length,
    orderCount: distinct(group.lines.map((line) => line.orderId)), totals: currencyTotals(group.lines),
    comparableAmount: round2(group.lines.reduce((sum, line) => sum + lineTryAmount(line), 0)), comparableCurrency: HOME_CURRENCY,
  }));
  const measure = (item: ErpisBreakdownItem): number => (orderBy === 'quantity' ? item.quantity : orderBy === 'lineCount' ? item.lineCount : orderBy === 'orderCount' ? item.orderCount : item.comparableAmount);
  return items.sort((a, b) => (measure(a) - measure(b)) * direction).slice(0, limit);
}

function dimensionTrend(request: DemoRequest): ErpisDimensionTrend[] {
  const lines = filterLines(request.query);
  const limit = Number(request.query.get('limit')) || DIMENSION_TREND_DEFAULT;
  const bucket = request.query.get('bucket');
  return [...groupLines(lines, request.query.get('by') ?? 'brand')].map(([key, group]) => {
    const byBucket = new Map<string, { amount: number; quantity: number; lineCount: number }>();
    for (const line of group.lines) {
      const label = bucketOf(line.orderDate ?? dayAgo(0), bucket);
      const point = byBucket.get(label) ?? { amount: 0, quantity: 0, lineCount: 0 };
      point.amount = round2(point.amount + lineTryAmount(line));
      point.quantity += line.orderedQty ?? 0;
      point.lineCount += 1;
      byBucket.set(label, point);
    }
    const points = [...byBucket.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, point]) => ({ bucket: label, ...point }));
    return { key, label: group.label, points, total: round2(points.reduce((sum, point) => sum + point.amount, 0)), currency: HOME_CURRENCY };
  }).sort((a, b) => b.total - a.total).slice(0, limit);
}

function scopeSummary(request: DemoRequest): ErpisScopeSummary[] {
  const lines = filterLines(request.query);
  return [['domestic', 'Yurt İçi'], ['foreign', 'Yurt Dışı']].map(([scope, label]) => {
    const scoped = lines.filter((line) => (line.countryName === DOMESTIC_COUNTRY) === (scope === 'domestic'));
    return {
      scope, label, amount: round2(scoped.reduce((sum, line) => sum + lineTryAmount(line), 0)), currency: HOME_CURRENCY,
      quantity: sumQuantity(scoped, (line) => line.orderedQty), lineCount: scoped.length,
      orderCount: distinct(scoped.map((line) => line.orderId)), partyCount: distinct(scoped.map((line) => line.partyId)),
      totals: currencyTotals(scoped),
    };
  });
}

// ── Yaşlandırma, karma sipariş, planlama ───────────────────────────────────────

function aging(request: DemoRequest): ErpisAgingBucket[] {
  const open = filterLines(request.query).filter((line) => !line.isClosed);
  return AGING_BUCKETS.map(([key, label, min, max]) => {
    const bucketLines = open.filter((line) => {
      const age = daysSince(line.orderDate);
      return age >= min && age <= max;
    });
    return {
      key, label, lineCount: bucketLines.length, remainingQuantity: sumQuantity(bucketLines, (line) => line.remainingQty),
      amount: round2(bucketLines.reduce((sum, line) => sum + toTry((line.unitPrice ?? 0) * (line.remainingQty ?? 0), line.currency), 0)),
      currency: HOME_CURRENCY, oldestDays: Math.max(0, ...bucketLines.map((line) => daysSince(line.orderDate))),
      totals: currencyTotals(bucketLines, (line) => (line.unitPrice ?? 0) * (line.remainingQty ?? 0)),
    };
  });
}

function mixedOrders(request: DemoRequest): ErpisMixedOrder[] {
  const byOrder = new Map<number, ErpisLineRecord[]>();
  for (const line of filterLines(request.query)) byOrder.set(line.orderId, [...(byOrder.get(line.orderId) ?? []), line]);
  const limit = Number(request.query.get('limit')) || 100;
  return [...byOrder.values()].filter((lines) => distinct(lines.map((line) => line.companyId)) > 1).slice(0, limit).map((lines) => ({
    orderId: lines[0].orderId, orderNo: lines[0].orderNo, orderDate: lines[0].orderDate, partyName: lines[0].partyName, lineCount: lines.length,
    companies: ERPIS_COMPANIES.map((company) => {
      const own = lines.filter((line) => line.companyId === company.id);
      return { companyId: company.id, companyName: company.name, lineCount: own.length, amount: round2(own.reduce((sum, line) => sum + (line.netAmount ?? 0), 0)) };
    }).filter((company) => company.lineCount > 0),
  }));
}

function planningStatus(available: number | null, pending: number): ErpisPlanningStatus {
  if (available === null) return 'unknown';
  if (available < SHORT_THRESHOLD) return 'short';
  return available < pending * TIGHT_RATIO ? 'tight' : 'ok';
}

function planning(request: DemoRequest): ErpisPlanningPage {
  const open = filterLines(request.query).filter((line) => !line.isClosed);
  const rows = [...new Set(open.map((line) => line.itemId))].map((itemId): ErpisPlanningItem & { status: ErpisPlanningStatus } => {
    const item = ERPIS_ITEMS.find((candidate) => candidate.id === itemId);
    const itemLines = open.filter((line) => line.itemId === itemId);
    const pendingQty = sumQuantity(itemLines, (line) => line.remainingQty);
    const stockOnHand = item?.stockOnHand ?? null;
    const availableQty = stockOnHand === null ? null : stockOnHand - pendingQty;
    return {
      itemId: itemId ?? 0, sku: item?.sku ?? '-', name: item?.name ?? null, brand: item?.brand ?? null, model: item?.model ?? null,
      productType: item?.productType ?? null, stockOnHand, pendingQty, availableQty,
      openLineCount: itemLines.length, orderCount: distinct(itemLines.map((line) => line.orderId)),
      status: planningStatus(availableQty, pendingQty),
    };
  });
  const counts = { total: rows.length, short: 0, tight: 0, ok: 0, unknown: 0 };
  rows.forEach((row) => { counts[row.status] += 1; });
  const wanted = request.query.get('planningStatus');
  const filtered = rows.filter((row) => !wanted || row.status === wanted).sort((a, b) => (a.availableQty ?? 0) - (b.availableQty ?? 0));
  const page = paginate(filtered, request.query, 50);
  return { items: page.items, total: page.total, page: page.page, pageSize: page.pageSize, counts };
}

// ── Filtre seçenekleri ve firma panosu ─────────────────────────────────────────

function optionsOf(lines: ErpisLineRecord[], by: string): ErpisFilterOption[] {
  return [...groupLines(lines, by)].map(([value, group]) => ({ value, label: group.label, count: group.lines.length }))
    .sort((a, b) => b.count - a.count);
}

function filterOptions(request: DemoRequest): ErpisFilterOptions {
  const lines = filterLines(request.query);
  const years = ERPIS_ITEMS.flatMap((item) => [item.yearFrom, item.yearTo]).filter((year): year is number => year !== null);
  return {
    brands: optionsOf(lines, 'brand'), models: optionsOf(lines, 'model'), productTypes: optionsOf(lines, 'productType'),
    categories: optionsOf(lines, 'category'), parties: optionsOf(lines, 'party'), currencies: optionsOf(lines, 'currency'),
    countries: optionsOf(lines, 'country'), itemKinds: optionsOf(lines, 'itemKind'),
    skuPatterns: [{ value: 'A99-9999-AA', label: 'Standart ürün kodu', count: lines.length }],
    cardTags: [{ value: 'Demo Ürünler', label: 'Demo Ürünler', count: lines.length }],
    seg1: optionsOf(lines, 'seg1'), seg2: optionsOf(lines, 'seg2').slice(0, 20), seg3: optionsOf(lines, 'seg3'),
    minYear: Math.min(...years), maxYear: Math.max(...years),
  };
}

function periodOf(lines: ErpisLineRecord[], fromDaysAgo: number, toDaysAgo = 0): ErpisPeriod {
  const from = dayAgo(fromDaysAgo);
  const to = dayAgo(toDaysAgo);
  const scoped = lines.filter((line) => (line.orderDate ?? '') >= from && (line.orderDate ?? '') <= to);
  return {
    amount: round2(scoped.reduce((sum, line) => sum + lineTryAmount(line), 0)), quantity: sumQuantity(scoped, (line) => line.orderedQty),
    orderCount: distinct(scoped.map((line) => line.orderId)), itemCount: distinct(scoped.map((line) => line.itemId)),
  };
}

function companyOverview(): ErpisCompanyOverview[] {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const monthStartDaysAgo = dayOfMonth - 1;
  return ERPIS_COMPANIES.map((company) => {
    const lines = ERPIS_LINES.filter((line) => line.companyId === company.id);
    const amountOn = (date: string) => round2(lines.filter((line) => line.orderDate === date).reduce((sum, line) => sum + lineTryAmount(line), 0));
    const quantityOn = (date: string) => sumQuantity(lines.filter((line) => line.orderDate === date), (line) => line.orderedQty);
    const foreign = lines.filter((line) => line.countryName !== DOMESTIC_COUNTRY);
    return {
      companyId: company.id, name: company.name, code: company.code,
      month: periodOf(lines, monthStartDaysAgo), monthFrom: dayAgo(monthStartDaysAgo), monthTo: dayAgo(0),
      today: periodOf(lines, 0), last7: periodOf(lines, 6), last30: periodOf(lines, 29), last365: periodOf(lines, 364),
      currency: HOME_CURRENCY, currencies: currencyTotals(lines).map(({ currency, total, rowCount }) => ({ currency, total, lineCount: rowCount })),
      domestic: round2(lines.filter((line) => line.countryName === DOMESTIC_COUNTRY).reduce((sum, line) => sum + lineTryAmount(line), 0)),
      foreign: round2(foreign.reduce((sum, line) => sum + lineTryAmount(line), 0)),
      previousMonth: periodOf(lines, monthStartDaysAgo + 30, monthStartDaysAgo + 1).amount,
      daily: lastDays(DAILY_WINDOW_DAYS, amountOn), dailyQuantity: lastDays(DAILY_WINDOW_DAYS, quantityOn),
      dataSince: lines.map((line) => line.orderDate ?? '').sort()[0] ?? null,
      openLineCount: lines.filter((line) => !line.isClosed).length,
    };
  });
}

export const financeErpisQueryRoutes: DemoRoute[] = [
  get('/erpis/orders/lines/:id', orderLineDetail),
  get('/erpis/orders/lines', orderLines),
  get('/erpis/orders/summary', ordersSummary),
  get('/erpis/orders/trend', ordersTrend),
  get('/erpis/orders/breakdown', breakdown),
  get('/erpis/orders/dimension-trend', dimensionTrend),
  get('/erpis/orders/scope-summary', scopeSummary),
  get('/erpis/orders/aging', aging),
  get('/erpis/orders/mixed', mixedOrders),
  get('/erpis/orders/planning', planning),
  get('/erpis/filters/options', filterOptions),
  get('/erpis/companies/overview', companyOverview),
];
