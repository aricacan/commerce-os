// Erpis yönetim ekranları: firmalar, rapor tipleri, yüklemeler, ham analitik, canlı veri kaynakları, ürün kartları.
import type {
  ErpisColumnMapping,
  ErpisDataset,
  ErpisPagedRows,
  ErpisPeriodRow,
  ErpisRankingItem,
  ErpisRow,
  ErpisSqlSource,
  ErpisSummary,
  ErpisTrendPoint,
  ErpisUpload,
} from '../../api/erpis';
import type { ErpisDataHealth, ErpisItemDetail, ErpisWarehouseZone } from '../../api/erpis-query';
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
import { ago, dayAgo, paginate } from '../seed';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';

const NOT_FOUND_STATUS = 404;
const UPLOAD_COUNT = 10;
const DEFAULT_RANKING_LIMIT = 10;

export const ERPIS_DATASETS: ErpisDataset[] = [
  { id: 1, key: 'orders', name: 'Açık Siparişler', description: 'Sipariş kalemleri raporu', isActive: true, kind: 'Orders', nullSentinels: ['X', 'YOK'] },
  { id: 2, key: 'closed-orders', name: 'Kapalı Siparişler', description: 'Tamamlanmış sipariş kalemleri', isActive: true, kind: 'ClosedOrders', nullSentinels: ['X'] },
  { id: 3, key: 'catalog', name: 'Stok Kartları', description: 'Ürün kartı listesi', isActive: true, kind: 'Catalog', nullSentinels: [] },
  { id: 4, key: 'sales', name: 'Satış Faturaları', description: 'Genel amaçlı fatura raporu', isActive: true, kind: 'Generic', nullSentinels: [] },
];

// ── Yüklemeler ve ham analitik ─────────────────────────────────────────────────

function buildUploads(): ErpisUpload[] {
  return Array.from({ length: UPLOAD_COUNT }, (_, index) => {
    const company = ERPIS_COMPANIES[index % ERPIS_COMPANIES.length];
    const dataset = ERPIS_DATASETS[index % ERPIS_DATASETS.length];
    return {
      id: UPLOAD_COUNT - index, companyId: company.id, companyName: company.name, datasetId: dataset.id, datasetName: dataset.name,
      fileName: `${dataset.key}-${dayAgo(index * 6)}.xlsx`, status: 'Completed', rowCount: 180 + index * 37, errorMessage: null,
      periodStart: dayAgo(index * 6 + 30), periodEnd: dayAgo(index * 6), uploadedAt: ago(index * 6), uploadedBy: 'Demo Kullanıcı',
      hasPeriodOverlap: index === 3, mode: index % 2 === 0 ? 'Snapshot' : 'Incremental', summary: null,
    };
  });
}

const UPLOADS = buildUploads();

function uploads(request: DemoRequest) {
  const companyId = Number(request.query.get('companyId')) || null;
  const datasetId = Number(request.query.get('datasetId')) || null;
  const filtered = UPLOADS.filter((upload) => (!companyId || upload.companyId === companyId) && (!datasetId || upload.datasetId === datasetId));
  const page = paginate(filtered, request.query, 25);
  return { items: page.items, total: page.total, page: page.page, pageSize: page.pageSize };
}

function uploadRows(request: DemoRequest): ErpisPagedRows {
  const lines = ERPIS_LINES.slice(0, 400);
  const page = paginate(lines, request.query, 50);
  const items: ErpisRow[] = page.items.map((line, index) => ({
    id: line.id, rowIndex: (page.page - 1) * page.pageSize + index + 1, docDate: line.orderDate, amount: line.netAmount,
    quantity: line.orderedQty, currency: line.currency, partyName: line.partyName, itemCode: line.sku,
    raw: { 'Sipariş No': line.orderNo, 'Stok Kodu': line.sku ?? '', 'Cari': line.partyName ?? '', 'Miktar': String(line.orderedQty ?? 0) },
  }));
  return { items, total: page.total, page: page.page, pageSize: page.pageSize };
}

const MAPPINGS: ErpisColumnMapping[] = [
  {
    id: 1, datasetId: 1, datasetName: 'Açık Siparişler', name: 'Standart sipariş raporu', headerSignature: 'sig-orders-v1',
    sourceHeaders: ['Sipariş No', 'Stok Kodu', 'Cari', 'Miktar', 'Tutar'], isDefault: true, createdAt: ago(80),
    mapping: { headerRowIndex: 0, fields: { OrderNo: { column: 'Sipariş No' }, ItemCode: { column: 'Stok Kodu' }, PartyName: { column: 'Cari' }, Quantity: { column: 'Miktar' }, Amount: { column: 'Tutar' } } },
  },
  {
    id: 2, datasetId: 3, datasetName: 'Stok Kartları', name: 'Stok kartı listesi', headerSignature: 'sig-catalog-v1',
    sourceHeaders: ['Stok Kodu', 'Stok Adı', 'Kategori'], isDefault: true, createdAt: ago(120),
    mapping: { headerRowIndex: 0, fields: { ItemCode: { column: 'Stok Kodu' }, ItemName: { column: 'Stok Adı' }, Category: { column: 'Kategori' } } },
  },
];

function rangeLines(request: DemoRequest): ErpisLineRecord[] {
  return filterLines(request.query);
}

function analyticsSummary(request: DemoRequest): ErpisSummary {
  const lines = rangeLines(request);
  const dates = lines.map((line) => line.orderDate ?? '').filter(Boolean).sort();
  return {
    rowCount: lines.length, uploadCount: UPLOADS.length, periodStart: dates[0] ?? null, periodEnd: dates[dates.length - 1] ?? null,
    totalQuantity: sumQuantity(lines, (line) => line.orderedQty), distinctParties: new Set(lines.map((line) => line.partyId)).size,
    distinctItems: new Set(lines.map((line) => line.itemId)).size, documentCount: new Set(lines.map((line) => line.orderId)).size,
    lastUploadedAt: ago(0, 3), totals: currencyTotals(lines),
  };
}

function analyticsTrend(request: DemoRequest): ErpisTrendPoint[] {
  const length = request.query.get('granularity') === 'day' ? 10 : 7;
  const buckets = new Map<string, ErpisTrendPoint>();
  for (const line of rangeLines(request)) {
    const bucket = (line.orderDate ?? dayAgo(0)).slice(0, length);
    const point = buckets.get(bucket) ?? { bucket, amount: 0, quantity: 0, rowCount: 0 };
    point.amount = round2(point.amount + toTry(line.netAmount ?? 0, line.currency));
    point.quantity += line.orderedQty ?? 0;
    point.rowCount += 1;
    buckets.set(bucket, point);
  }
  return [...buckets.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
}

const PERIOD_DEFINITIONS: [string, string, number][] = [['today', 'Bugün', 0], ['week', 'Son 7 gün', 6], ['month', 'Son 30 gün', 29], ['year', 'Son 12 ay', 364]];

function analyticsPeriods(request: DemoRequest): ErpisPeriodRow[] {
  const lines = rangeLines(request);
  return PERIOD_DEFINITIONS.map(([key, label, days]) => {
    const from = dayAgo(days);
    const scoped = lines.filter((line) => (line.orderDate ?? '') >= from);
    return {
      key, label, from, to: dayAgo(0), amount: round2(scoped.reduce((sum, line) => sum + toTry(line.netAmount ?? 0, line.currency), 0)),
      quantity: sumQuantity(scoped, (line) => line.orderedQty), rowCount: scoped.length,
    };
  });
}

function analyticsRanking(request: DemoRequest): ErpisRankingItem[] {
  const dimension = request.query.get('dimension') ?? 'party';
  const limit = Number(request.query.get('limit')) || DEFAULT_RANKING_LIMIT;
  const labelOf = (line: ErpisLineRecord): string => {
    if (dimension === 'item') return line.sku ?? '-';
    if (dimension === 'currency') return line.currency ?? '-';
    if (dimension === 'company') return ERPIS_COMPANIES.find((company) => company.id === line.companyId)?.name ?? '-';
    if (dimension === 'category') return line.categoryName ?? '-';
    if (dimension === 'warehouse') return line.seg1 ?? 'Ana Depo';
    return line.partyName ?? '-';
  };
  const groups = new Map<string, ErpisRankingItem>();
  for (const line of rangeLines(request)) {
    const label = labelOf(line);
    const entry = groups.get(label) ?? { label, amount: 0, quantity: 0, rowCount: 0 };
    entry.amount = round2(entry.amount + toTry(line.netAmount ?? 0, line.currency));
    entry.quantity += line.orderedQty ?? 0;
    entry.rowCount += 1;
    groups.set(label, entry);
  }
  return [...groups.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

// ── Canlı veri kaynakları ──────────────────────────────────────────────────────

const SQL_SOURCE_SEEDS: [string, string, string, ErpisSqlSource['target'], ErpisSqlSource['expectedKind']][] = [
  ['open-orders', 'Açık siparişler', 'sp_demo_open_orders', 'Import', 'Orders'],
  ['closed-orders', 'Kapalı siparişler', 'sp_demo_closed_orders', 'Import', 'ClosedOrders'],
  ['item-cards', 'Stok kartları', 'sp_demo_item_cards', 'Import', 'Catalog'],
  ['stock-levels', 'Stok bakiyeleri', 'sp_demo_stock_levels', 'RecordStore', null],
];

const SQL_SOURCES: ErpisSqlSource[] = SQL_SOURCE_SEEDS.map(([key, displayName, procedureName, target, expectedKind], index) => ({
  key, displayName, procedureName, target, expectedKind, isConfigured: true, isEnabled: index !== 3, intervalMinutes: 30 + index * 30,
  companyId: ERPIS_COMPANIES[0].id, datasetId: index < 3 ? index + 1 : null, nextRunAt: ago(0, 0, -(10 + index * 7)),
  lastRunAt: ago(0, 0, 20 + index * 5), lastSuccessAt: ago(0, 0, 20 + index * 5), status: 'Success', lastError: null,
  consecutiveFailures: 0, lastRowCount: 400 + index * 220, erpCompanyCode: 'DEMO', requiresErpCompanyCode: true,
}));

// ── Ürün kartları ──────────────────────────────────────────────────────────────

function itemsPage(request: DemoRequest) {
  const search = request.query.get('search')?.toLocaleLowerCase('tr');
  const companyId = Number(request.query.get('companyId')) || null;
  const brands = request.query.getAll('brands');
  const types = request.query.getAll('productTypes');
  const filtered = ERPIS_ITEMS.filter((item) =>
    (!companyId || item.companyId === companyId)
    && (brands.length === 0 || brands.includes(item.brand ?? ''))
    && (types.length === 0 || types.includes(item.productType ?? ''))
    && (!search || `${item.sku} ${item.name}`.toLocaleLowerCase('tr').includes(search)));
  const page = paginate(filtered, request.query, 50);
  return { items: page.items, total: page.total, page: page.page, pageSize: page.pageSize };
}

function itemDetail(request: DemoRequest): ErpisItemDetail | DemoHttpResponse {
  const item = ERPIS_ITEMS.find((candidate) => candidate.id === Number(request.params.id));
  if (!item) return new DemoHttpResponse(NOT_FOUND_STATUS);
  return {
    item, nameEn: null, unit: 'Adet', gtip: '8708.29', vatRate: 20, pattern: null, setPieceCount: 1, dimensionsText: null, nameRemainder: null,
    weightGr: 1850, widthMm: 480, lengthMm: 720, thicknessMm: 6, volumeDm3: 2.1, pieceCount: 1, supplierName: 'Örnek Hammadde Ltd.',
    packagingSku: 'PK-0001', packagingQty: 10, leadTimeDays: 21, minStock: 40, maxStock: 600, abcClass: 'A',
    registeredAt: item.registeredAt, discontinuedAt: null, discontinuedReason: null,
    customerCodes: [{ partyName: 'Güneş Oto Yedek Parça', customerSku: `GN-${item.id}` }],
    stockLocations: [{ zone: 'A', shelf: 'A-12', quantity: Math.round(item.stockOnHand * 0.6) }, { zone: 'B', shelf: 'B-03', quantity: Math.round(item.stockOnHand * 0.4) }],
    erpFields: [{ column: 'Stok Grubu', value: item.categoryName ?? '' }, { column: 'Birim', value: 'Adet' }],
  };
}

const WAREHOUSE_ZONES: ErpisWarehouseZone[] = [
  { zone: 'A', shelfCount: 24, itemCount: 31, quantity: 5240 },
  { zone: 'B', shelfCount: 18, itemCount: 22, quantity: 3120 },
  { zone: 'C', shelfCount: 12, itemCount: 14, quantity: 1860 },
  { zone: 'D', shelfCount: 8, itemCount: 9, quantity: 940 },
];

function dataHealth(): ErpisDataHealth {
  const count = (pick: (item: (typeof ERPIS_ITEMS)[number]) => unknown) => ERPIS_ITEMS.filter((item) => pick(item) !== null).length;
  return {
    itemCount: ERPIS_ITEMS.length, withBrand: count((item) => item.brand), withModel: count((item) => item.model),
    withYear: count((item) => item.yearFrom), withCategory: count((item) => item.categoryId), withProductType: count((item) => item.productType),
    manualCount: ERPIS_ITEMS.filter((item) => item.parseSource === 'Manual').length,
    lowConfidenceCount: ERPIS_ITEMS.filter((item) => item.parseConfidence < 0.8).length,
    lineCount: ERPIS_LINES.length, linesWithoutItem: 0, linesWithoutCurrency: 0, linesWithoutDate: 0, linesWithoutAmount: 3,
  };
}

export const financeErpisAdminRoutes: DemoRoute[] = [
  get('/erpis/companies', () => ERPIS_COMPANIES),
  get('/erpis/datasets', () => ERPIS_DATASETS),
  get('/erpis/uploads/:id/rows', uploadRows),
  get('/erpis/uploads', uploads),
  get('/erpis/mappings', (request) => {
    const datasetId = Number(request.query.get('datasetId')) || null;
    return datasetId ? MAPPINGS.filter((mapping) => mapping.datasetId === datasetId) : MAPPINGS;
  }),
  get('/erpis/analytics/summary', analyticsSummary),
  get('/erpis/analytics/trend', analyticsTrend),
  get('/erpis/analytics/periods', analyticsPeriods),
  get('/erpis/analytics/ranking', analyticsRanking),
  get('/erpis/sql-sources', () => SQL_SOURCES),
  get('/erpis/items/parse-status', () => ({ outdatedCount: 9, parserVersion: 7 })),
  get('/erpis/items/:id', itemDetail),
  get('/erpis/items', itemsPage),
  get('/erpis/warehouse/zones', () => WAREHOUSE_ZONES),
  get('/erpis/overview/health', dataHealth),
];
