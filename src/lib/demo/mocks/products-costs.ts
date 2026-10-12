// Alış fiyatları (maliyet), ürün taslakları (ürün girme) ve ERP'ler arası eksik ürün (gap) uçları.
import type {
  CostModerationItem,
  CostSource,
  CostSourcePolicy,
  CostSourceSummary,
} from '../../api/product-cost';
import type { ProductDraft, ProductDraftContext } from '../../api/product-drafts';
import type { ProductGapCandidate, ProductGapDispatchLog, ProductGapScanPair } from '../../api/product-gap';
import {
  CATALOG_PRODUCTS,
  DEMO_CATEGORIES,
  DEMO_DATA_SOURCES,
  type CatalogProduct,
} from '../data/products-catalog';
import { DemoHttpResponse, get, type DemoRoute } from '../router';
import { ago, matchesSearch, paginate } from '../seed';

const NOT_FOUND_STATUS = 404;
const SOURCE_POLICIES: CostSourcePolicy[] = ['ErpFirst', 'ExcelFirst', 'ManualOnly'];
const COST_SOURCES: CostSource[] = ['Erp', 'Excel', 'Manual'];
const MISSING_COST_STEP = 11;
const LOCKED_STEP = 13;
const MODERATION_COUNT = 5;
const DRAFT_COUNT = 6;
const GAP_CANDIDATE_COUNT = 12;
const GBP_COST_STEP = 3;

// Backend enum değerleri (JSON'a sayı olarak serileşir); api dosyalarını değer olarak içe aktarmak
// demo sunucusuyla döngüsel bağımlılık yaratır, bu yüzden burada yinelenir.
const ProductDraftStatus = { Draft: 0, AwaitingApproval: 1, Approved: 2, Rejected: 3, Queued: 6, Completed: 7 } as const;
const ProductGapCandidateStatus = { Pending: 0, Sent: 1, Resolved: 2, Ignored: 3, Incomplete: 4 } as const;
const ProductGapMatchType = { Sku: 0, Barcode: 1 } as const;

// ── Maliyet listesi ─────────────────────────────────────────────────────────

function costRow(product: CatalogProduct) {
  const isMissing = product.productId % MISSING_COST_STEP === 0;
  const isGbp = product.sources[0].store.currency === 'GBP';
  return {
    productId: product.productId,
    productName: product.name,
    supplierSku: product.sku,
    barcode: product.barcode,
    category: product.categoryName,
    basePrice: product.price,
    stockQuantity: product.stock,
    buyingPrice: isMissing ? null : product.cost,
    boxCode: `KT-${product.desi}`,
    boxPrice: product.desi * 6,
    modelYear: product.modelYear,
    updatedAt: isMissing ? null : ago(product.productId % 40),
    costSource: isMissing ? null : COST_SOURCES[product.productId % COST_SOURCES.length],
    costCurrency: isGbp && product.productId % GBP_COST_STEP === 0 ? 'GBP' : 'TRY',
    isLocked: product.productId % LOCKED_STEP === 0,
  };
}

function listCosts(request: Parameters<DemoRoute['handle']>[0]) {
  const { query } = request;
  const sourceId = Number(query.get('sourceId') ?? 0);
  const scoped = CATALOG_PRODUCTS.filter((product) => !sourceId || product.sources.some((source) => source.id === sourceId));
  const rows = scoped.map(costRow);
  const filtered = rows.filter((row) => matchesSearch(row, query.get('search'), ['productName', 'supplierSku', 'barcode']));
  const page = paginate(filtered, query, 50);
  return {
    total: page.totalCount,
    page: page.page,
    pageSize: page.pageSize,
    items: page.items,
    overallTotal: rows.length,
    overallFilled: rows.filter((row) => row.buyingPrice !== null).length,
  };
}

const costSources: CostSourceSummary[] = DEMO_DATA_SOURCES.map((source, index) => {
  const products = CATALOG_PRODUCTS.filter((product) => product.sources.some((item) => item.id === source.id));
  const withCost = products.filter((product) => product.productId % MISSING_COST_STEP !== 0).length;
  const fromErp = Math.round(withCost * 0.6);
  const fromExcel = Math.round(withCost * 0.3);
  return {
    dataSourceId: source.id,
    displayName: source.displayName,
    erp: source.erp,
    country: source.store.country,
    currency: source.store.currency,
    policy: SOURCE_POLICIES[index % SOURCE_POLICIES.length],
    productCount: products.length,
    withCost,
    withErpPrice: products.length - 3,
    fromErp,
    fromExcel,
    fromManual: withCost - fromErp - fromExcel,
    locked: products.filter((product) => product.productId % LOCKED_STEP === 0).length,
  };
});

const moderationItems: CostModerationItem[] = CATALOG_PRODUCTS.slice(20, 20 + MODERATION_COUNT).map((product, index) => ({
  id: index + 1,
  productId: product.productId,
  productName: product.name,
  costItemName: product.name.replace(/ (Siyah|Gri|Bej|Premium)$/, ''),
  price: Math.round(product.cost * 1.08),
  confidence: 0.62 + index * 0.06,
  reason: 'Ad benzerliği orta düzeyde; elle onay gerekli.',
  createdAt: ago(index + 1),
}));

// ── Ürün taslakları ─────────────────────────────────────────────────────────

const DRAFT_STATUS_CYCLE = [
  ProductDraftStatus.Draft,
  ProductDraftStatus.AwaitingApproval,
  ProductDraftStatus.Approved,
  ProductDraftStatus.Completed,
  ProductDraftStatus.Rejected,
  ProductDraftStatus.Queued,
];

const draftContext: ProductDraftContext = {
  externalDispatchEnabled: false,
  dispatchNotice: 'Demo modunda ERP\'ye gönderim kapalıdır.',
  stores: DEMO_DATA_SOURCES.map((source) => ({
    id: source.id,
    name: source.store.name,
    erpSources: [{ id: source.id, name: `${source.erp} ${source.displayName}`, connectorType: source.erp, country: source.store.country, supportsDispatch: true }],
  })),
  categories: DEMO_CATEGORIES.map(({ id, name }) => ({ id, name })),
  boxes: [1, 2, 3, 4, 5, 6].map((desi) => ({ id: desi, boxCode: `KT-${desi}`, name: `Koli ${desi} desi` })),
};

function buildDraft(index: number): ProductDraft {
  const product = CATALOG_PRODUCTS[60 + index];
  const source = DEMO_DATA_SOURCES[index % DEMO_DATA_SOURCES.length];
  const status = DRAFT_STATUS_CYCLE[index % DRAFT_STATUS_CYCLE.length];
  return {
    id: `draft-${index + 1}`,
    draftNumber: `TSL-${2600 + index + 1}`,
    storeId: source.id,
    storeName: source.store.name,
    status,
    name: `${product.name} (yeni varyant)`,
    brand: product.make,
    model: product.vehicleModel,
    modelYear: product.modelYear,
    supplierSku: `${product.sku}-N`,
    barcode: null,
    internalCategoryId: product.categoryId,
    categoryName: product.categoryName,
    boxId: product.desi,
    boxName: `Koli ${product.desi} desi`,
    price: product.price,
    currency: source.store.currency,
    stockQuantity: 25 + index * 5,
    vatRate: product.vatRate,
    desi: product.desi,
    description: 'Demo taslak ürün açıklaması.',
    imageUrls: [],
    note: null,
    rejectionReason: status === ProductDraftStatus.Rejected ? 'Görsel eksik.' : null,
    cancellationReason: null,
    localProductId: status === ProductDraftStatus.Completed ? product.productId : null,
    createdAt: ago(index + 1),
    updatedAt: ago(index),
    destinations: [{ target: 1, dataSourceId: source.id, name: `${source.erp} ${source.displayName}`, status: 0, idempotencyKey: `demo-key-${index + 1}` }],
  };
}

const drafts: ProductDraft[] = Array.from({ length: DRAFT_COUNT }, (_, index) => buildDraft(index));

// ── Eksik ürün taraması (product-gap) ───────────────────────────────────────

const gapPairs: ProductGapScanPair[] = [
  { id: 1, dataSourceAId: 1, dataSourceAName: DEMO_DATA_SOURCES[0].displayName, dataSourceBId: 3, dataSourceBName: DEMO_DATA_SOURCES[2].displayName, isActive: true, createdAt: ago(60) },
  { id: 2, dataSourceAId: 2, dataSourceAName: DEMO_DATA_SOURCES[1].displayName, dataSourceBId: 3, dataSourceBName: DEMO_DATA_SOURCES[2].displayName, isActive: true, createdAt: ago(45) },
];

const GAP_STATUS_CYCLE = [
  ProductGapCandidateStatus.Pending,
  ProductGapCandidateStatus.Pending,
  ProductGapCandidateStatus.Incomplete,
  ProductGapCandidateStatus.Sent,
  ProductGapCandidateStatus.Resolved,
  ProductGapCandidateStatus.Ignored,
];

function buildGapCandidate(index: number): ProductGapCandidate {
  const product = CATALOG_PRODUCTS[index * 4];
  const pair = gapPairs[index % gapPairs.length];
  const status = GAP_STATUS_CYCLE[index % GAP_STATUS_CYCLE.length];
  return {
    id: index + 1,
    scanPairId: pair.id,
    existingProductId: product.productId,
    productName: product.name,
    productSku: product.sku,
    productBarcode: product.barcode,
    productPrice: product.price,
    productPurchasePrice: product.cost,
    productCurrency: 'TRY',
    productStockQuantity: product.stock,
    productVatRate: product.vatRate,
    productDesi: product.desi,
    productBrand: product.make,
    productModel: product.vehicleModel,
    productModelYear: product.modelYear,
    productDescription: null,
    productInternalCategoryId: product.categoryId,
    productImageCount: 1,
    existingDataSourceId: pair.dataSourceAId,
    existingDataSourceName: pair.dataSourceAName,
    missingDataSourceId: pair.dataSourceBId,
    missingDataSourceName: pair.dataSourceBName,
    matchKey: index % 2 === 0 ? product.sku : product.barcode,
    matchType: index % 2 === 0 ? ProductGapMatchType.Sku : ProductGapMatchType.Barcode,
    status,
    missingFields: status === ProductGapCandidateStatus.Incomplete ? ['barcode', 'warehouse'] : [],
    productDraftId: status === ProductGapCandidateStatus.Sent ? `draft-${index}` : null,
    dispatchStatus: status === ProductGapCandidateStatus.Sent ? 6 : null,
    dispatchError: null,
    dispatchExternalId: status === ProductGapCandidateStatus.Sent ? `EXT-${5000 + index}` : null,
    detectedAt: ago(index + 1),
    resolvedAt: status === ProductGapCandidateStatus.Resolved ? ago(index) : null,
    ignoredReason: status === ProductGapCandidateStatus.Ignored ? 'Bu pazarda satışı planlanmıyor.' : null,
  };
}

const gapCandidates: ProductGapCandidate[] = Array.from({ length: GAP_CANDIDATE_COUNT }, (_, index) => buildGapCandidate(index));

const gapDispatchLog: ProductGapDispatchLog[] = gapCandidates
  .filter((candidate) => candidate.status === ProductGapCandidateStatus.Sent)
  .map((candidate) => ({
    id: candidate.id,
    candidateId: candidate.id,
    productId: candidate.existingProductId,
    productName: candidate.productName,
    productSku: candidate.productSku,
    sourceName: candidate.existingDataSourceName,
    targetName: candidate.missingDataSourceName,
    sentByUserId: 1,
    sentByName: 'Demo Kullanıcı',
    sentAt: ago(candidate.id),
    wasEdited: candidate.id % 2 === 0,
    includedImages: true,
    sentFields: { name: candidate.productName, sku: candidate.productSku, price: String(candidate.productPrice) },
    dispatchStatus: candidate.dispatchStatus,
    dispatchError: null,
    erpExternalId: candidate.dispatchExternalId,
    deletedFromErpAt: null,
    canRetry: false,
    canDeleteFromErp: true,
  }));

function filterCandidates(query: URLSearchParams): ProductGapCandidate[] {
  const pairId = query.get('pairId');
  const status = query.get('status');
  return gapCandidates
    .filter((candidate) => pairId === null || candidate.scanPairId === Number(pairId))
    .filter((candidate) => status === null || candidate.status === Number(status));
}

export const productCostRoutes: DemoRoute[] = [
  get('/product-costs', listCosts),
  get('/product-costs/sources', () => costSources),
  get('/product-costs/moderation', () => ({ total: moderationItems.length, items: moderationItems })),
  get('/product-drafts/context', () => draftContext),
  get('/product-drafts', () => drafts),
  get('/product-drafts/:id', (request) => {
    const draft = drafts.find((item) => item.id === request.params.id);
    return draft ?? new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'Taslak bulunamadı' });
  }),
  get('/product-gap/pairs', () => gapPairs),
  get('/product-gap/candidates', (request) => filterCandidates(request.query)),
  get('/product-gap/dispatch-log', () => gapDispatchLog),
];
