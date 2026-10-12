// Base Hub: sevkiyat hattı, stok uyarıları, depo, raporlar ve ürün takibi.
import type {
  BaseTrackReport, BaseTrackReportMerged, BaseTrackReportRow, BaseTrackReportTemplate, BaseTrackReportUpload,
} from '../../api/basetrack';
import type { BaseProductTrackingItem } from '../../../types/api';
import {
  DEMO_BASETRACK_SETTINGS, DEMO_BATCHES, DEMO_DEPOT_ITEMS, DEMO_STOCK_WARNINGS,
  eventsOf, linkedOrdersOf, summarize, warningSummary,
} from '../data/logistics-basetrack';
import { DEMO_PRODUCTS } from '../data/core';
import { ago, matchesSearch, paginate } from '../seed';
import { get, type DemoRoute } from '../router';

const STATE_QTY_KEY = { TrDepot: 'qtyTrDepot', InTransit: 'qtyInTransit', UkDepot: 'qtyUkDepot' } as const;
const GBP_PER_TRY = 0.021;
const TRACKING_PRODUCT_COUNT = 60;
const MARKETPLACES = ['Amazon', 'eBay', 'Web Sitesi'];

const REPORT_TEMPLATES: BaseTrackReportTemplate[] = [
  {
    key: 'stock-status', name: 'Stok Durumu', description: 'SKU bazında UK stoğu, yoldaki ve depodaki adetler.',
    columns: [
      { key: 'sku', label: 'SKU', type: 'text' },
      { key: 'productName', label: 'Ürün', type: 'text' },
      { key: 'ukStock', label: 'UK Stok', type: 'number' },
      { key: 'inTransitQty', label: 'Yolda', type: 'number' },
      { key: 'depotQty', label: 'Depo', type: 'number' },
      { key: 'daysRemaining', label: 'Kalan Gün', type: 'number' },
    ],
  },
  {
    key: 'open-batches', name: 'Açık Sevkiyatlar', description: 'Henüz UK depoya tamamen ulaşmamış kutular.',
    columns: [
      { key: 'supplierStockCode', label: 'Tedarikçi Kodu', type: 'text' },
      { key: 'productName', label: 'Ürün', type: 'text' },
      { key: 'orderDate', label: 'Sipariş Tarihi', type: 'text' },
      { key: 'orderedQty', label: 'Sipariş', type: 'number' },
      { key: 'qtyInTransit', label: 'Yolda', type: 'number' },
      { key: 'qtyUkDepot', label: 'UK Depo', type: 'number' },
    ],
  },
];

function reportRows(key: string): BaseTrackReportRow[] {
  if (key === 'open-batches') {
    return DEMO_BATCHES.filter((batch) => batch.qtyTrDepot + batch.qtyInTransit > 0).map((batch) => ({
      supplierStockCode: batch.supplierStockCode, productName: batch.productName, orderDate: batch.orderDate,
      orderedQty: batch.orderedQty, qtyInTransit: batch.qtyInTransit, qtyUkDepot: batch.qtyUkDepot,
    }));
  }
  return DEMO_STOCK_WARNINGS.map((item) => ({
    sku: item.sku, productName: item.productName, ukStock: item.ukStock, inTransitQty: item.inTransitQty,
    depotQty: item.depotQty, daysRemaining: item.daysRemaining,
  }));
}

function buildReport(key: string): BaseTrackReport {
  const template = REPORT_TEMPLATES.find((item) => item.key === key) ?? REPORT_TEMPLATES[0];
  const rows = reportRows(template.key);
  return {
    templateKey: template.key, name: template.name, columns: template.columns, rows,
    rowCount: rows.length, generatedAt: ago(0, 3), generatedBy: 'depo1@example.com',
  };
}

function buildMerged(key: string): BaseTrackReportMerged {
  const report = buildReport(key);
  return {
    templateKey: report.templateKey, name: report.name, columns: report.columns,
    // Şablon satırı + meta alanlar: tür tanımı bu kesişimi dizi alanıyla birlikte ifade edemiyor.
    rows: report.rows.map((row) => ({ ...row, __source: 'calculated', __conflictColumns: [] })) as unknown as BaseTrackReportMerged['rows'],
    calculatedOnlyCount: report.rowCount, uploadedOnlyCount: 0, matchCount: 0, conflictCount: 0,
    generatedAt: report.generatedAt, uploadedAt: null,
  };
}

function emptyUpload(key: string): BaseTrackReportUpload {
  const report = buildReport(key);
  return {
    templateKey: report.templateKey, name: report.name, fileName: null, columns: report.columns,
    rows: [], rowCount: 0, uploadedAt: null, uploadedBy: null,
  };
}

function batchesFor(query: URLSearchParams) {
  const state = query.get('state') as keyof typeof STATE_QTY_KEY | null;
  const includeCompleted = query.get('includeCompleted') === 'true';
  return DEMO_BATCHES
    .filter((batch) => includeCompleted || batch.qtyTrDepot + batch.qtyInTransit > 0)
    .filter((batch) => query.get('unmatchedOnly') !== 'true' || batch.productId === null)
    .filter((batch) => state === null || !(state in STATE_QTY_KEY) || batch[STATE_QTY_KEY[state]] > 0)
    .filter((batch) => matchesSearch(batch, query.get('search'), ['productName', 'sku', 'supplierStockCode']));
}

function stockWarnings(query: URLSearchParams) {
  const level = query.get('level');
  const items = DEMO_STOCK_WARNINGS
    .filter((item) => !level || item.level === level)
    .filter((item) => matchesSearch(item, query.get('search'), ['sku', 'productName']));
  return { summary: warningSummary(DEMO_STOCK_WARNINGS), items };
}

function trackingItems(): BaseProductTrackingItem[] {
  return DEMO_PRODUCTS.slice(0, TRACKING_PRODUCT_COUNT).map((product) => ({
    id: product.id, erpId: 880000 + product.id, name: product.name, sku: product.sku,
    ean: `5900000${String(10000 + product.id)}`, asin: product.id % 3 === 0 ? `B0DEMO${String(1000 + product.id)}` : null,
    cost: Number((product.cost * GBP_PER_TRY).toFixed(2)), stock: product.stock,
    priceTry: product.price, vatRate: 20, imageUrl: null, createdAt: ago(product.id),
    marketplaces: MARKETPLACES.slice(0, 1 + (product.id % MARKETPLACES.length)).map((name, index) => ({
      name, orderCount: (product.id * (index + 3)) % 40,
    })),
  }));
}

function trackingPage(query: URLSearchParams) {
  const selected = query.getAll('marketplaces');
  const excludes = query.get('matchMode') === 'excludes';
  const items = trackingItems()
    .filter((item) => matchesSearch(item, query.get('search'), ['name', 'sku', 'ean']))
    .filter((item) => selected.length === 0
      || item.marketplaces.some((market) => selected.includes(market.name)) !== excludes);
  return paginate(items, query);
}

export const logisticsBasetrackRoutes: DemoRoute[] = [
  get('/basetrack/summary', () => summarize(DEMO_BATCHES)),
  get('/basetrack/settings', () => DEMO_BASETRACK_SETTINGS),
  get('/basetrack/stock-warnings', (req) => stockWarnings(req.query)),
  get('/basetrack/batches', (req) => batchesFor(req.query)),
  get('/basetrack/batches/:id/events', (req) => eventsOf(DEMO_BATCHES.find((b) => b.id === Number(req.params.id)) ?? DEMO_BATCHES[0])),
  get('/basetrack/batches/:id/orders', (req) => linkedOrdersOf(DEMO_BATCHES.find((b) => b.id === Number(req.params.id)) ?? DEMO_BATCHES[0])),
  get('/basetrack/reports/templates', () => REPORT_TEMPLATES),
  get('/basetrack/reports/:key/merged', (req) => buildMerged(req.params.key)),
  get('/basetrack/reports/:key/upload', (req) => emptyUpload(req.params.key)),
  get('/basetrack/reports/:key', (req) => buildReport(req.params.key)),
  get('/basetrack/trdepot', (req) => DEMO_DEPOT_ITEMS.filter((item) => matchesSearch(item, req.query.get('search'), ['sku', 'productName']))),
  get('/basetrack/trdepot/:id/movements', (req) => [
    { id: 1, delta: 120, source: 'Excel içe aktarma', note: 'İlk sayım', createdBy: 'depo1@example.com', createdAt: ago(30) },
    { id: 2, delta: -30, source: 'Sevkiyat', note: `Kalem #${req.params.id}`, createdBy: 'depo2@example.com', createdAt: ago(12) },
  ]),
  get('/base-product-tracking/marketplaces', () => MARKETPLACES),
  get('/base-product-tracking', (req) => trackingPage(req.query)),
];
