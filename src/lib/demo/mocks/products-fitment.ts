// Araç uyumluluğu: tedarikçi Excel (fitment) paneli, uyumluluk onay kuyrukları.
import type {
  FitmentBatch,
  FitmentCategoryMap,
  FitmentEntry,
  FitmentProduct,
  FitmentProductSearchItem,
  FitmentRow,
  FitmentVehicle,
  ProductColorItem,
} from '../../api/fitment';
import type { CompatibilityCoverageDto, PendingCompatibilityDto } from '../../api/vehicle-compatibility';
import type { FitmentRefType, FitmentSource, VehicleFitmentPendingDto } from '../../api/vehicle-fitments';
import { CATALOG_PRODUCTS, DEMO_CATEGORIES, type CatalogProduct } from '../data/products-catalog';
import { get, type DemoRoute } from '../router';
import { ago, matchesSearch, paginate } from '../seed';

const FITMENT_ROW_COUNT = 60;
const BATCH_COUNT = 3;
const ROW_STATUS_CYCLE: FitmentRow['rowStatus'][] = ['Approved', 'Matched', 'Unmatched', 'Approved', 'Rejected', 'Matched'];
const PENDING_COMPAT_COUNT = 40;
const PENDING_FITMENT_COUNT = 36;
const COLORS = ['Siyah', 'Gri', 'Bej', 'Kırmızı', 'Mavi'];
const FITMENT_PAGE_SIZE = 50;
const MIN_CONFIDENCE = 0.5;
const CONFIDENCE_RANGE = 0.45;

const vehicleProducts = CATALOG_PRODUCTS.filter((product) => product.make !== null);

function yearRange(product: CatalogProduct): { start: number | null; end: number | null } {
  if (!product.modelYear) return { start: null, end: null };
  const [start, end] = product.modelYear.split('-').map(Number);
  return { start, end };
}

function siblingOf(product: CatalogProduct): CatalogProduct {
  const siblings = CATALOG_PRODUCTS.filter((item) => item.categoryId === product.categoryId && item.productId !== product.productId);
  return siblings[product.productId % siblings.length];
}

// ── Excel yüklemeleri ve satırlar ───────────────────────────────────────────

function buildVehicles(rowId: number, product: CatalogProduct): FitmentVehicle[] {
  const { start, end } = yearRange(product);
  const sibling = siblingOf(product);
  return [
    { id: rowId * 10 + 1, vehicleMake: product.make ?? '', vehicleModel: product.vehicleModel, startYear: start, endYear: end, resolvedProductId: sibling.productId, resolvedSku: sibling.sku, resolvedName: sibling.name, score: 0.91, status: 'Resolved' },
    { id: rowId * 10 + 2, vehicleMake: product.make ?? '', vehicleModel: 'Diğer kasa', startYear: start, endYear: end, resolvedProductId: null, resolvedSku: null, resolvedName: null, score: null, status: 'NotFound' },
  ];
}

function buildRow(index: number): FitmentRow {
  const id = index + 1;
  const product = vehicleProducts[index % vehicleProducts.length];
  const rowStatus = ROW_STATUS_CYCLE[index % ROW_STATUS_CYCLE.length];
  const matched = rowStatus !== 'Unmatched';
  return {
    id,
    batchId: (index % BATCH_COUNT) + 1,
    rowNumber: Math.floor(index / BATCH_COUNT) + 2,
    picture: null,
    category: product.categoryName,
    sku: `TED-${product.sku}`,
    barcode: product.barcode,
    brand: product.make,
    model: product.vehicleModel,
    year: product.modelYear,
    sourceStatus: 'Aktif',
    type: product.categoryName,
    description: product.name,
    pieceOfOrder: '1',
    suitableModelsRaw: `${product.make} ${product.vehicleModel} ${product.modelYear}`,
    colorOptionRaw: COLORS.slice(0, 1 + (index % 3)).join(', '),
    matchedProductId: matched ? product.productId : null,
    matchedProductName: matched ? product.name : null,
    rowStatus,
    vehicles: buildVehicles(id, product),
    parsedColorsPreview: COLORS.slice(0, 1 + (index % 3)),
  };
}

const ROWS: FitmentRow[] = Array.from({ length: FITMENT_ROW_COUNT }, (_, index) => buildRow(index));

function buildBatch(index: number): FitmentBatch {
  const id = index + 1;
  const rows = ROWS.filter((row) => row.batchId === id);
  const matchedRows = rows.filter((row) => row.rowStatus !== 'Unmatched').length;
  return {
    id,
    fileName: `tedarikci-uyumluluk-${id}.xlsx`,
    status: 'Completed',
    totalRows: rows.length,
    matchedRows,
    unmatchedRows: rows.length - matchedRows,
    approvedRows: rows.filter((row) => row.rowStatus === 'Approved').length,
    errorMessage: null,
    uploadedAt: ago(id * 6),
  };
}

const BATCHES: FitmentBatch[] = Array.from({ length: BATCH_COUNT }, (_, index) => buildBatch(index));

function listRows(query: URLSearchParams) {
  const batchId = Number(query.get('batchId') ?? 0);
  const status = query.get('status');
  const filtered = ROWS.filter((row) => !batchId || row.batchId === batchId)
    .filter((row) => !status || row.rowStatus === status)
    .filter((row) => matchesSearch(row, query.get('search'), ['sku', 'description', 'brand']));
  const page = paginate(filtered, query, FITMENT_PAGE_SIZE);
  return { items: page.items, totalCount: page.totalCount, page: page.page, pageSize: page.pageSize };
}

// ── Ürün bazlı uyumluluk ────────────────────────────────────────────────────

function toFitmentProduct(product: CatalogProduct): FitmentProduct {
  return {
    productId: product.productId,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    brand: product.make,
    category: product.categoryName,
    fitmentCount: 1 + (product.productId % 4),
    colorCount: product.productId % 3,
  };
}

function listFitmentProducts(query: URLSearchParams) {
  const filtered = vehicleProducts.filter((product) => matchesSearch(product, query.get('search'), ['name', 'sku', 'barcode']));
  const page = paginate(filtered.map(toFitmentProduct), query, FITMENT_PAGE_SIZE);
  return { items: page.items, totalCount: page.totalCount, page: page.page, pageSize: page.pageSize };
}

function productDetail(productId: number): { fitments: FitmentEntry[]; colors: ProductColorItem[] } {
  const product = CATALOG_PRODUCTS.find((item) => item.productId === productId);
  if (!product?.make) return { fitments: [], colors: [] };
  const { start, end } = yearRange(product);
  const sibling = siblingOf(product);
  const count = 1 + (productId % 4);
  return {
    fitments: Array.from({ length: count }, (_, index) => ({
      id: productId * 10 + index,
      vehicleMake: product.make ?? '',
      vehicleModel: index === 0 ? product.vehicleModel : `${product.vehicleModel} Plus`,
      startYear: start,
      endYear: end,
      resolvedProductId: index === 0 ? sibling.productId : null,
      resolvedSku: index === 0 ? sibling.sku : null,
      resolvedName: index === 0 ? sibling.name : null,
    })),
    colors: COLORS.slice(0, productId % 3).map((color, index) => ({ id: productId * 10 + index, color })),
  };
}

const CATEGORY_MAPS: FitmentCategoryMap[] = DEMO_CATEGORIES.map((category) => ({
  id: category.id,
  supplierCategory: `${category.name} (tedarikçi)`,
  internalCategoryId: category.id,
  internalCategoryName: category.name,
  isAutoLearned: category.id % 2 === 0,
}));

function productSearch(query: URLSearchParams): FitmentProductSearchItem[] {
  const categoryId = Number(query.get('categoryId') ?? 0);
  return CATALOG_PRODUCTS.filter((product) => !categoryId || product.categoryId === categoryId)
    .filter((product) => matchesSearch(product, query.get('q'), ['name', 'sku']))
    .slice(0, 20)
    .map((product) => ({ productId: product.productId, sku: product.sku, name: product.name, category: product.categoryName }));
}

// ── Uyumluluk onay kuyrukları ───────────────────────────────────────────────

const COUNTRIES: ('TR' | 'UK')[] = ['TR', 'UK'];

function compatibilityCoverage(): CompatibilityCoverageDto[] {
  return COUNTRIES.map((country) => {
    const inCountry = vehicleProducts.filter((product) => product.sources.some((source) => source.store.country === country));
    const withApproved = Math.round(inCountry.length * 0.62);
    const withPendingOnly = Math.round(inCountry.length * 0.25);
    return {
      country,
      vehicleProducts: inCountry.length,
      withApproved,
      withPendingOnly,
      withoutAny: inCountry.length - withApproved - withPendingOnly,
      pendingRows: withPendingOnly * 3,
      approvedPercent: Number(((withApproved / Math.max(1, inCountry.length)) * 100).toFixed(1)),
    };
  });
}

function confidenceFor(index: number): number {
  return Number((MIN_CONFIDENCE + ((index * 37) % 100) / 100 * CONFIDENCE_RANGE).toFixed(2));
}

const PENDING_COMPAT: PendingCompatibilityDto[] = Array.from({ length: PENDING_COMPAT_COUNT }, (_, index) => {
  const product = vehicleProducts[index % vehicleProducts.length];
  return {
    productId: product.productId,
    productName: product.name,
    country: product.sources[0].store.country,
    vehicleModelId: 100 + index,
    vehicle: `${product.make} ${product.vehicleModel} ${product.modelYear}`,
    source: 'TitleParse',
    confidence: confidenceFor(index),
  };
});

function pendingCompatibility(query: URLSearchParams): PendingCompatibilityDto[] {
  const country = query.get('country');
  const skip = Number(query.get('skip') ?? 0);
  const take = Number(query.get('take') ?? PENDING_COMPAT_COUNT);
  return PENDING_COMPAT.filter((row) => !country || row.country === country).slice(skip, skip + take);
}

const FITMENT_SOURCES: FitmentSource[] = ['TitleParse', 'Fitment', 'Manual'];
const FITMENT_REF_TYPES: FitmentRefType[] = ['ErpProduct', 'SiteCatalogItem'];

const PENDING_FITMENTS: VehicleFitmentPendingDto[] = Array.from({ length: PENDING_FITMENT_COUNT }, (_, index) => {
  const product = vehicleProducts[(index * 2) % vehicleProducts.length];
  const { start, end } = yearRange(product);
  return {
    id: index + 1,
    refType: FITMENT_REF_TYPES[index % FITMENT_REF_TYPES.length],
    refId: product.productId,
    productName: product.name,
    make: product.make ?? '',
    model: product.vehicleModel ?? '',
    generation: index % 3 === 0 ? 'Mk2' : null,
    yearFrom: start,
    yearTo: end,
    source: FITMENT_SOURCES[index % FITMENT_SOURCES.length],
    confidence: confidenceFor(index + 7),
  };
});

function pendingFitments(query: URLSearchParams) {
  const skip = Number(query.get('skip') ?? 0);
  const take = Number(query.get('take') ?? PENDING_FITMENT_COUNT);
  const filtered = PENDING_FITMENTS.filter((row) => !query.get('make') || row.make === query.get('make'))
    .filter((row) => !query.get('model') || row.model === query.get('model'))
    .filter((row) => !query.get('source') || row.source === query.get('source'))
    .filter((row) => !query.get('refType') || row.refType === query.get('refType'));
  return { items: filtered.slice(skip, skip + take), total: filtered.length };
}

export const productFitmentRoutes: DemoRoute[] = [
  get('/fitment/batches', () => BATCHES),
  get('/fitment/rows', (request) => listRows(request.query)),
  get('/fitment/products', (request) => listFitmentProducts(request.query)),
  get('/fitment/products/:id/fitments', (request) => productDetail(Number(request.params.id))),
  get('/fitment/category-maps', () => CATEGORY_MAPS),
  get('/fitment/product-search', (request) => productSearch(request.query)),
  get('/vehicle-compatibility/coverage', compatibilityCoverage),
  get('/vehicle-compatibility/pending', (request) => pendingCompatibility(request.query)),
  get('/vehicle-fitments/pending', (request) => pendingFitments(request.query)),
];
