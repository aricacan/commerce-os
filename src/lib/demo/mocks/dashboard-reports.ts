// Raporlar: stok sağlığı, ürün satış/iade, operasyon özeti, Excel önizleme, belge geçmişi.
import type { ExcelReportModule, ExcelReportRequest } from '../../../types/api';
import type { EntityHistoryItem } from '../../api/history';
import type { OperationsSummary, ProductSalesReturnRow, StockHealthClass, StockHealthReport, StockHealthRow } from '../../api/reports';
import { ago } from '../seed';
import { DEMO_CUSTOMERS, DEMO_PRODUCTS, DEMO_STORES } from '../data/core';
import { RANKED_PRODUCTS } from '../data/dashboard-catalog';
import { ITEMS_RATIO, rangeMetrics, resolveRange, sumOf } from '../data/dashboard-series';
import { get, post, type DemoRequest, type DemoRoute } from '../router';

const DEFAULT_HEALTH_WINDOW_DAYS = 30;
const DEFAULT_HEALTH_LIMIT = 200;
const MONTHLY_UNITS_AT_TOP = 420;
const LOW_COVERAGE_DAYS = 10;
const OVERSTOCK_COVERAGE_DAYS = 120;
const PREVIEW_ROW_COUNT = 12;
const CANCELLATION_RATE = 0.031;
const RETURN_RATE = 0.044;
const MIN_STOCK_THRESHOLD = 10;

function classOf(stock: number, sold: number, coverage: number | null): StockHealthClass {
  if (stock === 0) return 'OutOfStock';
  if (sold === 0) return 'Dead';
  if (coverage !== null && coverage < LOW_COVERAGE_DAYS) return 'Critical';
  if (coverage !== null && coverage < LOW_COVERAGE_DAYS * 2) return 'Low';
  return coverage !== null && coverage > OVERSTOCK_COVERAGE_DAYS ? 'Overstock' : 'Healthy';
}

function buildStockHealth({ query }: DemoRequest): StockHealthReport {
  const windowDays = Number(query.get('days')) || DEFAULT_HEALTH_WINDOW_DAYS;
  const limit = Number(query.get('limit')) || DEFAULT_HEALTH_LIMIT;
  const ranked = new Map(RANKED_PRODUCTS.map((item) => [item.product.id, item.weight]));
  const rows: StockHealthRow[] = DEMO_PRODUCTS.map((product, index) => {
    const weight = ranked.get(product.id) ?? 0;
    const soldQuantity = index % 17 === 16 ? 0 : Math.round(MONTHLY_UNITS_AT_TOP * weight * (windowDays / DEFAULT_HEALTH_WINDOW_DAYS) * 10);
    const dailyVelocity = Number((soldQuantity / windowDays).toFixed(2));
    const coverageDays = dailyVelocity > 0 ? Math.round(product.stock / dailyVelocity) : null;
    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      stockQuantity: product.stock,
      minStockThreshold: index % 3 === 0 ? MIN_STOCK_THRESHOLD : null,
      soldQuantity,
      dailyVelocity,
      coverageDays,
      healthClass: classOf(product.stock, soldQuantity, coverageDays),
    };
  });
  const classCounts: Record<string, number> = {};
  for (const row of rows) classCounts[row.healthClass] = (classCounts[row.healthClass] ?? 0) + 1;
  return { windowDays, classCounts, rows: rows.slice(0, limit) };
}

function buildSalesReturns({ query, stores }: DemoRequest): ProductSalesReturnRow[] {
  const orders = sumOf(rangeMetrics(resolveRange(query), stores).map((day) => day.orders));
  return RANKED_PRODUCTS.slice(0, 25).map(({ product, weight }, index) => {
    const soldQuantity = Math.max(1, Math.round(orders * ITEMS_RATIO * weight));
    const returnedQuantity = Math.round(soldQuantity * (RETURN_RATE + (index % 5) * 0.012));
    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      soldQuantity,
      returnedQuantity,
      returnRatePercent: Number(((returnedQuantity / soldQuantity) * 100).toFixed(1)),
    };
  });
}

function buildOperations({ query, stores }: DemoRequest): OperationsSummary {
  const metrics = rangeMetrics(resolveRange(query), stores);
  const orderCount = sumOf(metrics.map((day) => day.orders));
  const revenue = sumOf(metrics.map((day) => day.revenue));
  const cancelledCount = Math.round(orderCount * CANCELLATION_RATE);
  const returnedCount = sumOf(metrics.map((day) => day.returns));
  const validOrders = orderCount - cancelledCount - returnedCount;
  return {
    orderCount,
    cancelledCount,
    returnedCount,
    revenue,
    averageBasket: validOrders > 0 ? Math.round(revenue / validOrders) : null,
    cancellationRatePercent: orderCount > 0 ? Number(((cancelledCount / orderCount) * 100).toFixed(1)) : null,
    returnRatePercent: orderCount > 0 ? Number(((returnedCount / orderCount) * 100).toFixed(1)) : null,
  };
}

// Excel önizleme: sunucunun ürettiği kolon adlarıyla aynı anahtarlar.
type SheetRow = Record<string, string | number>;

function previewRows(module: ExcelReportModule): SheetRow[] {
  return Array.from({ length: PREVIEW_ROW_COUNT }, (_, index) => {
    const product = DEMO_PRODUCTS[index];
    const store = DEMO_STORES[index % DEMO_STORES.length].name;
    const orderNo = String(7_400_000 + index * 137);
    const date = ago(index).slice(0, 10);
    const rowsByModule: Record<ExcelReportModule, SheetRow> = {
      Products: { Id: product.id, SKU: product.sku, ÜrünAdı: product.name, Marka: product.brand, Barkod: `869000${product.id}`.padEnd(13, '0'), Stok: product.stock, Fiyat: product.price, FiyatBirimi: 'TRY', Mağaza: store },
      Orders: { Id: index + 1, SiparişNo: orderNo, Tarih: date, Müşteri: DEMO_CUSTOMERS[index].name, Tutar: product.price + 29, ParaBirimi: 'TRY', Durum: 'Teslim Edildi', Mağaza: store },
      Finance: { SiparişNo: orderNo, Ciro: product.price + 29, ParaBirimi: 'TRY', MüşteridenAlınanKargo: 29, GerçekKargoMaliyeti: 41, Tarih: date, Mağaza: store },
      Logistics: { SiparişNo: orderNo, Şehir: DEMO_CUSTOMERS[index].city, İlçe: 'Merkez', Mağaza: store },
      Shipping: { SiparişNo: orderNo, MüşteridenAlınanKargo: 29, GerçekKargoMaliyeti: 41, ParaBirimi: 'TRY', Mağaza: store },
      Returns: { Id: index + 1, SiparişNo: orderNo, Neden: 'Ürün beklentiyi karşılamadı', Durum: 'Onaylandı', İadeTutarı: product.price, ParaBirimi: 'TRY', Tarih: date, Mağaza: store },
      Boxes: { SKU: product.sku, KutuKodu: `K-${(index % 4) + 1}`, En: 300 + index * 10, Boy: 450, Yükseklik: 120, Desi: 4 + (index % 5), Mağaza: store },
    };
    return rowsByModule[module];
  });
}

function buildExcelPreview(body: ExcelReportRequest) {
  const sheets: Record<string, SheetRow[]> = {};
  for (const reportModule of body.modules) {
    const selected = body.columns?.[reportModule];
    sheets[reportModule] = previewRows(reportModule).map((row) => (
      selected && selected.length > 0
        ? Object.fromEntries(Object.entries(row).filter(([key]) => selected.includes(key)))
        : row
    ));
  }
  return { sheets };
}

function buildHistory(): EntityHistoryItem[] {
  return [
    { occurredAt: ago(0, 1), source: 'Sistem', action: 'Durum güncellendi', userEmail: null, details: 'Pazaryeri senkronu sırasında durum "Kargolandı" olarak işlendi.', severity: 'Info' },
    { occurredAt: ago(1, 3), source: 'Kullanıcı', action: 'Not eklendi', userEmail: 'demo@demo.com', details: 'Müşteri adres değişikliği talep etti.', severity: 'Info' },
    { occurredAt: ago(2, 5), source: 'Sistem', action: 'Kayıt oluşturuldu', userEmail: null, details: null, severity: 'Info' },
  ];
}

export const dashboardReportRoutes: DemoRoute[] = [
  get('/reports/stock-health', buildStockHealth),
  get('/reports/product-sales-returns', buildSalesReturns),
  get('/reports/operations-summary', buildOperations),
  post('/excel-report/preview', ({ body }) => buildExcelPreview(body as ExcelReportRequest)),
  get('/audit/entity/:type/:id', buildHistory),
];
