// Ürün listesi, ürün detayı (SKU), platformlar ve ürün-bazlı analiz uçları.
import type {
  BaseProductTrackingItem,
  CrossPlatformProduct,
  CrossPlatformResult,
  PaginatedResult,
  Platform,
  ProductErpVariant,
  ProductGridItem,
} from '../../../types/api';
import type { ProductSkuDetail, SkuSalesDay } from '../../../types/sku-detail';
import {
  CATALOG_PRODUCTS,
  DEMO_CATEGORIES,
  PLATFORMS,
  VEHICLE_MODELS,
  findCatalogProduct,
  placeholderImage,
  priceInCurrency,
  productsForStores,
  type CatalogProduct,
} from '../data/products-catalog';
import { DemoHttpResponse, get, type DemoRoute } from '../router';
import { createRng, lastDays, matchesSearch, paginate } from '../seed';

const STORE_COLORS = ['#2563eb', '#16a34a', '#d97706'];
const NOT_FOUND_STATUS = 404;
const DEFAULT_RANGE_DAYS = 30;
const BASE_RANGE_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SALES_TIMELINE_DAYS = 90;
const PLATFORM_WEIGHTS = [0.5, 0.3, 0.2];
const BASE_MARKETPLACES = ['Amazon', 'eBay', 'Web Sitesi'];
const PLATFORM_RATES = [
  { commissionRate: 15, serviceFee: 8.5 },
  { commissionRate: 13, serviceFee: 6 },
  { commissionRate: 12, serviceFee: 0 },
  { commissionRate: 3, serviceFee: 0 },
  { commissionRate: 11, serviceFee: 0.3 },
];
const VAT_PERCENT = 20;

type SortFn = (a: CatalogProduct, b: CatalogProduct) => number;

const PRODUCT_SORTS: Record<string, SortFn> = {
  name_asc: (a, b) => a.name.localeCompare(b.name, 'tr'),
  name_desc: (a, b) => b.name.localeCompare(a.name, 'tr'),
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
  stock_asc: (a, b) => a.stock - b.stock,
  stock_desc: (a, b) => b.stock - a.stock,
  sales_asc: (a, b) => a.salesCount - b.salesCount,
  sales_desc: (a, b) => b.salesCount - a.salesCount,
};

const newestFirst: SortFn = (a, b) => b.createdAt.localeCompare(a.createdAt);

function toVariants(product: CatalogProduct): ProductErpVariant[] {
  const share = Math.ceil(product.stock / product.sources.length);
  return product.sources.map((source) => ({
    productId: product.productId,
    connectorType: source.erp,
    sourceCode: `${source.erp.toLowerCase()}-${source.store.code}`,
    storeCode: source.store.code,
    storeName: source.store.name,
    productName: product.name,
    priceTry: product.price,
    originalCurrency: source.store.currency === 'GBP' ? 'GBP' : null,
    stockQuantity: share,
    salesCount: Math.ceil(product.salesCount / product.sources.length),
  }));
}

function toGridItem(product: CatalogProduct): ProductGridItem {
  const primary = product.sources[0];
  const image = placeholderImage(product.sku);
  return {
    productId: product.productId,
    productName: product.name,
    storeId: primary.id,
    storeName: primary.store.name,
    storeColor: STORE_COLORS[(primary.id - 1) % STORE_COLORS.length],
    sourceType: primary.erp,
    sourceTags: product.sources.map((source) => `${source.erp} ${source.store.name}`),
    platformName: product.platform.name,
    rawCategory: product.categoryName,
    mappedCategoryName: product.categoryName,
    brand: product.make,
    model: product.vehicleModel,
    modelYear: product.modelYear,
    price: product.price,
    buyingPrice: product.cost,
    stockQuantity: product.stock,
    salesCount: product.salesCount,
    boxCode: `KT-${product.desi}`,
    boxName: `Koli ${product.desi} desi`,
    boxDesi: product.desi,
    productDesi: product.desi,
    imageUrl: image,
    imageUrls: [image],
    createdAt: product.createdAt,
    todayOrderCount: product.todayOrderCount,
    supplierSKU: product.sku,
    erpVariants: toVariants(product),
  };
}

function listProducts(request: Parameters<DemoRoute['handle']>[0]): PaginatedResult<ProductGridItem> {
  const { query } = request;
  const platformId = Number(query.get('platformId') ?? 0);
  const categoryId = Number(query.get('categoryId') ?? 0);
  const brand = query.get('brand');
  const model = query.get('model');
  const modelYear = query.get('modelYear');
  const sort = PRODUCT_SORTS[query.get('sortBy') ?? ''] ?? newestFirst;

  const filtered = productsForStores(request.stores)
    .filter((product) => matchesSearch(product, query.get('search'), ['name', 'sku', 'barcode']))
    .filter((product) => !platformId || product.platform.id === platformId)
    .filter((product) => !categoryId || product.categoryId === categoryId)
    .filter((product) => !brand || product.make === brand)
    .filter((product) => !model || product.vehicleModel === model)
    .filter((product) => !modelYear || product.modelYear === modelYear)
    .sort(sort);

  const page = paginate(filtered, query);
  return { items: page.items.map(toGridItem), totalCount: page.totalCount, page: page.page, pageSize: page.pageSize };
}

/** Aralık günü sayısı: from/to verilmişse arası, yoksa varsayılan. */
function rangeDays(query: URLSearchParams): number {
  const from = query.get('from');
  const to = query.get('to');
  if (!from || !to) return DEFAULT_RANGE_DAYS;
  const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY) + 1;
  return days > 0 ? days : DEFAULT_RANGE_DAYS;
}

function toCrossPlatform(product: CatalogProduct, rangeFactor: number): CrossPlatformProduct {
  const units = Math.round(product.salesCount * rangeFactor);
  const platformBreakdown = PLATFORM_WEIGHTS.map((weight, offset) => {
    const platform = PLATFORMS[(product.platform.id - 1 + offset) % PLATFORMS.length];
    const unitsSold = Math.round(units * weight);
    return { platformName: platform.name, unitsSold, revenue: unitsSold * product.price };
  });
  const storeBreakdown = product.sources.map((source) => {
    const unitsSold = Math.round(units / product.sources.length);
    return {
      storeId: source.id,
      storeName: source.store.name,
      storeColor: STORE_COLORS[(source.id - 1) % STORE_COLORS.length],
      sourceType: source.erp,
      unitsSold,
      revenue: unitsSold * product.price,
    };
  });
  return {
    supplierSKU: product.sku,
    name: product.name,
    brand: product.make,
    basePrice: product.price,
    stockQuantity: product.stock,
    storeCount: product.sources.length,
    totalUnitsSold: units,
    totalRevenue: units * product.price,
    topPlatform: platformBreakdown[0].platformName,
    platformBreakdown,
    storeBreakdown,
  };
}

function crossPlatform(request: Parameters<DemoRoute['handle']>[0]): CrossPlatformResult {
  const { query } = request;
  const factor = rangeDays(query) / BASE_RANGE_DAYS;
  const categoryId = Number(query.get('categoryId') ?? 0);
  const rows = productsForStores(request.stores)
    .filter((product) => matchesSearch(product, query.get('search'), ['name', 'sku']))
    .filter((product) => !categoryId || product.categoryId === categoryId)
    .map((product) => toCrossPlatform(product, factor));

  const sortBy = query.get('sortBy') ?? 'revenue_desc';
  const key = sortBy.startsWith('sold') ? 'totalUnitsSold' : 'totalRevenue';
  const direction = sortBy.endsWith('_asc') ? 1 : -1;
  rows.sort((a, b) => (a[key] - b[key]) * direction);

  const page = paginate(rows, query, 30);
  return {
    items: page.items,
    totalCount: page.totalCount,
    page: page.page,
    pageSize: page.pageSize,
    availablePlatforms: PLATFORMS.map((platform) => platform.name),
    totalUnitsSoldAll: rows.reduce((sum, row) => sum + row.totalUnitsSold, 0),
    totalRevenueAll: rows.reduce((sum, row) => sum + row.totalRevenue, 0),
  };
}

function salesTimeline(product: CatalogProduct): SkuSalesDay[] {
  const rng = createRng(product.productId * 31);
  const perDay = product.salesCount / BASE_RANGE_DAYS;
  return lastDays(SALES_TIMELINE_DAYS, (date) => ({
    date,
    quantity: Math.max(0, Math.round(perDay * rng.float(0, 2))),
  }));
}

function sumLast(timeline: SkuSalesDay[], days: number): number {
  return timeline.slice(-days).reduce((sum, day) => sum + day.quantity, 0);
}

function toSkuDetail(product: CatalogProduct): ProductSkuDetail {
  const timeline = salesTimeline(product);
  const image = placeholderImage(product.sku);
  const primary = product.sources[0];
  return {
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    brand: product.make,
    model: product.vehicleModel,
    modelYear: product.modelYear,
    imageUrl: image,
    imageUrls: [image],
    description: `${product.name} — ${product.categoryName} kategorisinde, dayanıklı ve kolay montajlı demo ürünü.`,
    basePrice: priceInCurrency(product, primary).amount,
    currency: priceInCurrency(product, primary).currency,
    platforms: product.sources.map((source) => ({
      name: product.platform.name,
      isActive: true,
      connectorType: source.erp,
      storeName: source.store.name,
      orderCount: Math.ceil(product.salesCount / product.sources.length),
    })),
    stockByErp: product.sources.map((source) => ({
      erpName: `${source.erp} ${source.store.name}`,
      storeCode: source.store.code,
      quantity: Math.ceil(product.stock / product.sources.length),
    })),
    erpVariants: toVariants(product),
    salesTotal: product.salesCount,
    sales30d: sumLast(timeline, 30),
    sales60d: sumLast(timeline, 60),
    sales90d: sumLast(timeline, 90),
    salesTimeline: timeline,
    cost: { buyingPrice: product.cost, currency: 'TRY' },
  };
}

function toBaseTracking(product: CatalogProduct): BaseProductTrackingItem {
  const rng = createRng(product.productId * 17);
  const base = product.sources.find((source) => source.erp === 'Base');
  const marketplaces = BASE_MARKETPLACES.filter(() => rng.chance(0.6)).map((name) => ({
    name,
    orderCount: rng.int(1, 40),
  }));
  return {
    id: product.productId,
    erpId: 100000 + product.productId,
    name: product.name,
    sku: product.sku,
    ean: product.barcode,
    asin: `B0DEMO${String(product.productId).padStart(4, '0')}`,
    cost: base ? priceInCurrency({ ...product, price: product.cost }, base).amount : null,
    stock: product.stock,
    priceTry: product.price,
    vatRate: product.vatRate,
    imageUrl: placeholderImage(product.sku),
    createdAt: product.createdAt,
    marketplaces: marketplaces.length > 0 ? marketplaces : [{ name: BASE_MARKETPLACES[0], orderCount: 1 }],
  };
}

const BASE_TRACKING_SORTS: Record<string, (a: BaseProductTrackingItem, b: BaseProductTrackingItem) => number> = {
  name_asc: (a, b) => a.name.localeCompare(b.name, 'tr'),
  name_desc: (a, b) => b.name.localeCompare(a.name, 'tr'),
  cost_asc: (a, b) => (a.cost ?? 0) - (b.cost ?? 0),
  cost_desc: (a, b) => (b.cost ?? 0) - (a.cost ?? 0),
  stock_asc: (a, b) => a.stock - b.stock,
  stock_desc: (a, b) => b.stock - a.stock,
  price_asc: (a, b) => a.priceTry - b.priceTry,
  price_desc: (a, b) => b.priceTry - a.priceTry,
  marketplace_asc: (a, b) => a.marketplaces.length - b.marketplaces.length,
  marketplace_desc: (a, b) => b.marketplaces.length - a.marketplaces.length,
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
};

function listBaseTracking(request: Parameters<DemoRoute['handle']>[0]): PaginatedResult<BaseProductTrackingItem> {
  const { query } = request;
  const selected = query.getAll('marketplaces');
  const excludes = query.get('matchMode') === 'excludes';
  const sort = BASE_TRACKING_SORTS[query.get('sortBy') ?? ''] ?? BASE_TRACKING_SORTS.newest;

  const items = CATALOG_PRODUCTS.filter((product) => product.sources.some((source) => source.erp === 'Base'))
    .map(toBaseTracking)
    .filter((item) => matchesSearch(item, query.get('search'), ['name', 'sku', 'ean']))
    .filter((item) => {
      if (selected.length === 0) return true;
      const hasAny = item.marketplaces.some((marketplace) => selected.includes(marketplace.name));
      return excludes ? !hasAny : hasAny;
    })
    .sort(sort);

  const page = paginate(items, query);
  return { items: page.items, totalCount: page.totalCount, page: page.page, pageSize: page.pageSize };
}

const platforms: Platform[] = PLATFORMS.map((platform, index) => ({
  id: platform.id,
  name: platform.name,
  vatRate: VAT_PERCENT,
  ...PLATFORM_RATES[index % PLATFORM_RATES.length],
}));

export const productCatalogRoutes: DemoRoute[] = [
  get('/product', listProducts),
  get('/product/brands', () => Object.keys(VEHICLE_MODELS).sort()),
  get('/product/models', (request) => [...(VEHICLE_MODELS[request.query.get('brand') ?? ''] ?? [])].sort()),
  get('/product/cross-platform', crossPlatform),
  get('/product/chart-stats', () =>
    DEMO_CATEGORIES.map((category) => {
      const inCategory = CATALOG_PRODUCTS.filter((product) => product.categoryId === category.id);
      return {
        category: category.name,
        totalStock: inCategory.reduce((sum, product) => sum + product.stock, 0),
        totalSold: inCategory.reduce((sum, product) => sum + product.salesCount, 0),
      };
    }),
  ),
  get('/product/sku/:sku', (request) => {
    const product = findCatalogProduct(request.params.sku);
    return product ? toSkuDetail(product) : new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'Ürün bulunamadı' });
  }),
  get('/platform', () => platforms),
  get('/platform/for-selection', () => platforms.map(({ id, name }) => ({ id, name }))),
  get('/base-product-tracking/marketplaces', () => BASE_MARKETPLACES),
  get('/base-product-tracking', listBaseTracking),
];
