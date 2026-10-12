// Fiyat karşılaştırma (kategori hedef fiyatları), katalog hazırlığı, fiyat grupları ve zararlı ürünler.
import type {
  CategoryComparisonRow,
  CategoryPriceCompareResult,
  CategoryPriceModerationItem,
  CategoryPriceStatusValue,
  CategoryPriceTarget,
  CategoryPriceTolerance,
  CurrencyComparison,
  LossProductRow,
  LossProductsResponse,
  OverLimitProduct,
  OverLimitResult,
} from '../../../types/api';
import type {
  CatalogReadinessCategory,
  CatalogReadinessProduct,
  CatalogReadinessReport,
  CatalogReadinessSummary,
} from '../../api/catalog-readiness';
import type { PriceGroupRow } from '../../api/catalog-pricing';
import {
  CATALOG_PRODUCTS,
  DEMO_CATEGORIES,
  DEMO_DATA_SOURCES,
  placeholderImage,
  type CatalogProduct,
  type DemoDataSource,
} from '../data/products-catalog';
import { get, type DemoRoute } from '../router';
import { ago, matchesSearch } from '../seed';

// Backend enum değerleri; api dosyası değer olarak içe aktarılmaz (döngüsel bağımlılık).
const STATUS = { NoData: 1, WithinTolerance: 2, Over: 3, Under: 4 } as const satisfies Record<string, CategoryPriceStatusValue>;

const GBP_TO_TRY = 42;
const TOLERANCE: CategoryPriceTolerance = { lowerPct: 10, upperPct: 10 };
const TARGET_FACTORS = [0.92, 1.0, 1.12, 0.97, 1.06, 0.88, 1.03];
const OVER_LIMIT_MAX = 40;
const PERCENT = 100;
const READINESS_PAGE_SIZE = 50;
const READINESS_MISSING_PENALTY = 14;
const LOSS_PRODUCT_STEP = 9;
const VAT_SHARE = 1 / 6;
const COMMISSION_RATE = 0.14;
const SHIPPING_PER_UNIT = 38;
const SERVICE_FEE_PER_UNIT = 6;
const LOSS_COST_RATIO = 0.82;
const DEFAULT_LOSS_RANGE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BASE_SALES_RANGE_DAYS = 90;
const NO_COST_EXCLUDED = 7;

// ── Kategori hedef fiyatları ────────────────────────────────────────────────

const round2 = (value: number): number => Number(value.toFixed(2));

function targetFor(categoryId: number) {
  const products = CATALOG_PRODUCTS.filter((product) => product.categoryId === categoryId);
  const average = products.reduce((sum, product) => sum + product.price, 0) / Math.max(1, products.length);
  const factor = TARGET_FACTORS[(categoryId - 1) % TARGET_FACTORS.length];
  return { priceTl: Math.round(average * factor), priceGbp: round2((average * factor) / GBP_TO_TRY) };
}

const targets: CategoryPriceTarget[] = DEMO_CATEGORIES.map((category) => ({
  internalCategoryId: category.id,
  categoryName: category.name,
  ...targetFor(category.id),
  updatedAt: ago(category.id * 3),
}));

const moderationItems: CategoryPriceModerationItem[] = [
  { id: 1, rawCategoryText: 'Oto Halı Paspas', rawPrice: 780, currency: 'TRY', suggestedInternalCategoryId: 1, suggestedCategoryName: 'Paspas', confidence: 0.74, createdAt: ago(2) },
  { id: 2, rawCategoryText: 'Boot Liner', rawPrice: 21.5, currency: 'GBP', suggestedInternalCategoryId: 2, suggestedCategoryName: 'Bagaj', confidence: 0.68, createdAt: ago(3) },
  { id: 3, rawCategoryText: 'Diğer Aksesuarlar', rawPrice: 240, currency: 'TRY', suggestedInternalCategoryId: null, suggestedCategoryName: null, confidence: 0.31, createdAt: ago(5) },
];

function statusFor(deviationPct: number): CategoryPriceStatusValue {
  if (deviationPct > TOLERANCE.upperPct) return STATUS.Over;
  if (deviationPct < -TOLERANCE.lowerPct) return STATUS.Under;
  return STATUS.WithinTolerance;
}

const EMPTY_COMPARISON: CurrencyComparison = {
  targetPrice: null,
  observedAvg: null,
  observedMin: null,
  observedMax: null,
  productCount: 0,
  deviationPct: null,
  status: STATUS.NoData,
};

function observedPrice(product: CatalogProduct, currency: 'TRY' | 'GBP'): number {
  return currency === 'GBP' ? round2(product.price / GBP_TO_TRY) : product.price;
}

function compareCurrency(products: CatalogProduct[], target: number | null, currency: 'TRY' | 'GBP'): CurrencyComparison {
  if (products.length === 0 || target === null) return EMPTY_COMPARISON;
  const prices = products.map((product) => observedPrice(product, currency));
  const average = round2(prices.reduce((sum, price) => sum + price, 0) / prices.length);
  const deviation = round2(((average - target) / target) * PERCENT);
  return {
    targetPrice: target,
    observedAvg: average,
    observedMin: Math.min(...prices),
    observedMax: Math.max(...prices),
    productCount: prices.length,
    deviationPct: deviation,
    status: statusFor(deviation),
  };
}

function productsOfSource(source: DemoDataSource, categoryId: number): CatalogProduct[] {
  return CATALOG_PRODUCTS.filter(
    (product) => product.categoryId === categoryId && product.sources.some((item) => item.id === source.id),
  );
}

function resolveSource(query: URLSearchParams): DemoDataSource {
  const id = Number(query.get('dataSourceId') ?? 0);
  return DEMO_DATA_SOURCES.find((source) => source.id === id) ?? DEMO_DATA_SOURCES[0];
}

function compare(source: DemoDataSource): CategoryPriceCompareResult {
  const isGbp = source.store.currency === 'GBP';
  const rows: CategoryComparisonRow[] = targets.map((target) => {
    const products = productsOfSource(source, target.internalCategoryId);
    return {
      internalCategoryId: target.internalCategoryId,
      categoryName: target.categoryName,
      tl: isGbp ? EMPTY_COMPARISON : compareCurrency(products, target.priceTl, 'TRY'),
      gbp: isGbp ? compareCurrency(products, target.priceGbp, 'GBP') : EMPTY_COMPARISON,
    };
  });
  return { dataSourceId: source.id, displayName: source.displayName, erp: source.erp, rows };
}

function overLimit(source: DemoDataSource): OverLimitResult {
  const currency = source.store.currency;
  const items: OverLimitProduct[] = [];
  for (const target of targets) {
    const targetPrice = (currency === 'GBP' ? target.priceGbp : target.priceTl) ?? 0;
    if (targetPrice === 0) continue;
    for (const product of productsOfSource(source, target.internalCategoryId)) {
      const price = observedPrice(product, currency);
      const deviation = round2(((price - targetPrice) / targetPrice) * PERCENT);
      if (statusFor(deviation) === STATUS.WithinTolerance) continue;
      items.push({
        productId: product.productId,
        sku: product.sku,
        productName: product.name,
        categoryName: target.categoryName,
        observedPrice: price,
        targetPrice,
        deviationPct: deviation,
        currency,
        status: statusFor(deviation),
      });
    }
  }
  items.sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));
  return { dataSourceId: source.id, displayName: source.displayName, erp: source.erp, items: items.slice(0, OVER_LIMIT_MAX) };
}

// ── Katalog hazırlığı ───────────────────────────────────────────────────────

const ISSUE_RULES: { key: string; applies: (product: CatalogProduct) => boolean }[] = [
  { key: 'missing-brand', applies: (p) => p.make === null && p.productId % 4 === 0 },
  { key: 'missing-model', applies: (p) => p.make !== null && p.productId % 19 === 0 },
  { key: 'missing-model-year', applies: (p) => p.make !== null && p.productId % 13 === 0 },
  { key: 'missing-category', applies: (p) => p.productId % 43 === 0 },
  { key: 'missing-fitment', applies: (p) => p.make !== null && p.productId % 5 === 0 },
  { key: 'missing-image', applies: (p) => p.productId % 17 === 0 },
  { key: 'missing-cost', applies: (p) => p.productId % 11 === 0 },
  { key: 'missing-thickness', applies: (p) => p.categoryName === 'Paspas' && p.productId % 4 === 0 },
  { key: 'conflicting-data', applies: (p) => p.productId % 29 === 0 },
];

const COLORS = ['Siyah', 'Gri', 'Bej'];

function readinessProduct(product: CatalogProduct): CatalogReadinessProduct {
  const issues = ISSUE_RULES.filter((rule) => rule.applies(product)).map((rule) => rule.key);
  return {
    productId: product.productId,
    sku: product.sku,
    name: product.name,
    brand: product.make,
    model: product.vehicleModel,
    modelYear: product.modelYear,
    categoryId: issues.includes('missing-category') ? null : product.categoryId,
    categoryName: issues.includes('missing-category') ? null : product.categoryName,
    imageUrl: issues.includes('missing-image') ? null : placeholderImage(product.sku),
    hasKnownCost: !issues.includes('missing-cost'),
    hasFitment: !issues.includes('missing-fitment'),
    colors: COLORS.filter((color) => product.name.includes(color)),
    detectedAttributes: product.make ? ['araç uyumlu'] : ['evrensel'],
    issues,
    readinessScore: Math.max(0, 100 - issues.length * READINESS_MISSING_PENALTY),
    readyForMatching: issues.length === 0,
  };
}

function readinessSummary(items: CatalogReadinessProduct[]): CatalogReadinessSummary {
  const count = (key: string): number => items.filter((item) => item.issues.includes(key)).length;
  const ready = items.filter((item) => item.readyForMatching).length;
  return {
    totalProducts: items.length,
    readyForMatching: ready,
    needsReview: items.length - ready,
    missingBrand: count('missing-brand'),
    missingModel: count('missing-model'),
    missingModelYear: count('missing-model-year'),
    missingCategory: count('missing-category'),
    missingFitment: count('missing-fitment'),
    missingImage: count('missing-image'),
    missingCost: count('missing-cost'),
    missingThickness: count('missing-thickness'),
    conflictingData: count('conflicting-data'),
    readinessPercent: round2((ready / Math.max(1, items.length)) * PERCENT),
  };
}

function readinessCategories(items: CatalogReadinessProduct[]): CatalogReadinessCategory[] {
  return DEMO_CATEGORIES.map((category) => {
    const inCategory = items.filter((item) => CATALOG_PRODUCTS[item.productId - 1].categoryId === category.id);
    return {
      categoryId: category.id,
      categoryName: category.name,
      productCount: inCategory.length,
      readyCount: inCategory.filter((item) => item.readyForMatching).length,
      missingFitmentCount: inCategory.filter((item) => item.issues.includes('missing-fitment')).length,
      missingVehicleDataCount: inCategory.filter((item) => item.issues.some((issue) => issue.startsWith('missing-model'))).length,
    };
  });
}

function readinessReport(query: URLSearchParams): CatalogReadinessReport {
  const source = resolveSource(query);
  const issue = query.get('issue');
  const page = Math.max(1, Number(query.get('page') ?? 1));
  const pageSize = Math.max(1, Number(query.get('pageSize') ?? READINESS_PAGE_SIZE));

  const scoped = CATALOG_PRODUCTS.filter((product) => product.sources.some((item) => item.id === source.id)).map(readinessProduct);
  const filtered = scoped
    .filter((item) => !issue || issue === 'all' || item.issues.includes(issue))
    .filter((item) => matchesSearch(item, query.get('search'), ['name', 'sku']));

  return {
    summary: readinessSummary(scoped),
    categories: readinessCategories(scoped),
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

// ── Fiyat grupları ──────────────────────────────────────────────────────────

const priceGroups: PriceGroupRow[] = [
  { id: 1, name: 'Perakende', discountPercent: 0, isActive: true, customerCount: 412 },
  { id: 2, name: 'Bayi A', discountPercent: 12, isActive: true, customerCount: 18 },
  { id: 3, name: 'Bayi B', discountPercent: 8, isActive: true, customerCount: 31 },
  { id: 4, name: 'Kurumsal Filo', discountPercent: 15, isActive: true, customerCount: 6 },
  { id: 5, name: 'Eski Kampanya', discountPercent: 5, isActive: false, customerCount: 0 },
];

// ── Zararlı ürünler ─────────────────────────────────────────────────────────

function lossRow(product: CatalogProduct, rangeFactor: number): LossProductRow {
  const quantitySold = Math.max(2, Math.round(product.salesCount * rangeFactor));
  const revenue = quantitySold * product.price;
  const buyingCost = round2(revenue * LOSS_COST_RATIO);
  const boxCost = quantitySold * product.desi * 2;
  const shippingCost = quantitySold * SHIPPING_PER_UNIT;
  const commission = round2(revenue * COMMISSION_RATE);
  const serviceFee = quantitySold * SERVICE_FEE_PER_UNIT;
  const vat = round2(revenue * VAT_SHARE);
  return {
    productId: product.productId,
    sku: product.sku,
    productName: product.name,
    brand: product.make,
    storeName: product.sources[0].store.name,
    quantitySold,
    revenue,
    grossProfit: round2(revenue - buyingCost - boxCost - shippingCost - commission - serviceFee - vat),
    buyingCost,
    boxCost,
    shippingCost,
    commission,
    serviceFee,
    vat,
  };
}

function lossProducts(query: URLSearchParams): LossProductsResponse {
  const from = query.get('from');
  const to = query.get('to');
  const days = from && to ? Math.round((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY) + 1 : DEFAULT_LOSS_RANGE_DAYS;
  const factor = Math.max(1, days) / BASE_SALES_RANGE_DAYS;
  const items = CATALOG_PRODUCTS.filter((product) => product.productId % LOSS_PRODUCT_STEP === 0)
    .map((product) => lossRow(product, factor))
    .filter((row) => row.grossProfit < 0)
    .sort((a, b) => a.grossProfit - b.grossProfit);
  return {
    items,
    totalLoss: round2(items.reduce((sum, row) => sum + row.grossProfit, 0)),
    excludedNoCostCount: NO_COST_EXCLUDED,
  };
}

export const productPricingRoutes: DemoRoute[] = [
  get('/category-prices/targets', () => ({ total: targets.length, items: targets })),
  get('/category-prices/moderation', () => ({ total: moderationItems.length, items: moderationItems })),
  get('/category-prices/tolerance', () => TOLERANCE),
  get('/category-prices/compare', (request) => compare(resolveSource(request.query))),
  get('/category-prices/over-limit', (request) => overLimit(resolveSource(request.query))),
  get('/catalog-readiness', (request) => readinessReport(request.query)),
  get('/price-groups', () => priceGroups),
  get('/finance/loss-products', (request) => lossProducts(request.query)),
];
