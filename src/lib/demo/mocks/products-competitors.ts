// Rakip ürün eşleştirme, fiyat kararları (öneri/teklif) ve fiyat-stok tutarlılığı uçları.
import type { PriceStockConsistencyOverview, PriceStockConsistencyRow } from '../../../types/api';
import type {
  CompetitorListing,
  CompetitorMatch,
  CompetitorWorkspace,
} from '../../api/competitor-products';
import type {
  EbaySyncStatus,
  PricePolicy,
  PriceProposal,
  PriceRecommendation,
} from '../../api/price-intelligence';
import { CATALOG_PRODUCTS, placeholderImage, type CatalogProduct } from '../data/products-catalog';
import { get, type DemoRoute } from '../router';
import { ago, matchesSearch } from '../seed';

const GBP_TO_TRY = 42;
const LISTING_COUNT = 28;
const LISTING_STEP = 4;
const COMPETITOR_PAGE_SIZE = 30;
const UNDERCUT_RATE = 0.97;
const RECOMMENDATION_COUNT = 8;
const CONSISTENCY_STEP = 6;
const PRICE_DEVIATION_LIMIT_PCT = 5;
const PERCENT = 100;

type MatchStatus = CompetitorMatch['status'];
const MATCH_STATUS_CYCLE: (MatchStatus | null)[] = ['Approved', 'Suggested', 'Review', 'Suggested', 'Rejected', null, 'Approved'];
const SOURCES = ['ebay-export', 'supplier', 'manual'];

const round2 = (value: number): number => Number(value.toFixed(2));

// ── Rakip ürünler ───────────────────────────────────────────────────────────

function buildMatch(listingId: number, product: CatalogProduct, status: MatchStatus): CompetitorMatch {
  const score = status === 'Approved' ? 0.96 : status === 'Suggested' ? 0.88 : status === 'Review' ? 0.7 : 0.5;
  return {
    id: listingId * 10,
    productId: product.productId,
    sku: product.sku,
    productName: product.name,
    score,
    status,
    reasons: ['Marka ve model uyuşuyor', 'Kategori aynı'],
    conflicts: status === 'Review' ? ['Yıl aralığı farklı'] : [],
  };
}

function buildListing(index: number): CompetitorListing {
  const id = index + 1;
  const product = CATALOG_PRODUCTS[(index * LISTING_STEP + 1) % CATALOG_PRODUCTS.length];
  const status = MATCH_STATUS_CYCLE[index % MATCH_STATUS_CYCLE.length];
  return {
    id,
    source: SOURCES[index % SOURCES.length],
    externalId: `EXT-${900000 + id}`,
    title: `${product.categoryName} Set${product.make ? ` for ${product.make} ${product.vehicleModel}` : ' Universal'}`,
    brand: product.make,
    model: product.vehicleModel,
    modelYear: product.modelYear,
    category: product.categoryName,
    thickness: product.categoryName === 'Paspas' ? '3 mm' : null,
    price: round2((product.price * 0.94) / GBP_TO_TRY),
    currency: 'GBP',
    externalUrl: null,
    imageUrl: placeholderImage(`R${id}`),
    updatedAt: ago(index % 9),
    matches: status ? [buildMatch(id, product, status)] : [],
  };
}

const LISTINGS: CompetitorListing[] = Array.from({ length: LISTING_COUNT }, (_, index) => buildListing(index));

function countByStatus(status: MatchStatus): number {
  return LISTINGS.filter((listing) => listing.matches.some((match) => match.status === status)).length;
}

function workspace(query: URLSearchParams): CompetitorWorkspace {
  const status = query.get('status') ?? 'all';
  const page = Math.max(1, Number(query.get('page') ?? 1));
  const pageSize = Math.max(1, Number(query.get('pageSize') ?? COMPETITOR_PAGE_SIZE));

  const filtered = LISTINGS.filter((listing) => matchesSearch(listing, query.get('search'), ['title', 'externalId', 'brand']))
    .filter((listing) => {
      if (status === 'all') return true;
      if (status === 'Unmatched') return listing.matches.length === 0;
      return listing.matches.some((match) => match.status === status);
    });

  return {
    summary: {
      listingCount: LISTINGS.length,
      suggestedCount: countByStatus('Suggested'),
      reviewCount: countByStatus('Review'),
      approvedCount: countByStatus('Approved'),
      rejectedCount: countByStatus('Rejected'),
      unmatchedCount: LISTINGS.filter((listing) => listing.matches.length === 0).length,
    },
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

// ── Fiyat zekâsı ────────────────────────────────────────────────────────────

const POLICY: PricePolicy = {
  isEnabled: true,
  simulationOnly: true,
  emergencyStop: false,
  requireApproval: true,
  minimumMarginPercent: 12,
  maximumChangePercent: 10,
  competitorUndercutAmount: 5,
  defaultCommissionPercent: 14,
  defaultShippingCost: 38,
  defaultServiceFee: 6,
  baseCurrency: 'TRY',
};

function buildRecommendation(index: number): PriceRecommendation {
  const listing = LISTINGS[index % LISTINGS.length];
  const match = listing.matches[0] ?? buildMatch(listing.id, CATALOG_PRODUCTS[index], 'Suggested');
  const product = CATALOG_PRODUCTS[match.productId - 1];
  const competitorPrice = round2((listing.price ?? 0) * GBP_TO_TRY);
  const recommended = Math.max(Math.round(competitorPrice * UNDERCUT_RATE), Math.round(product.cost * 1.25));
  return {
    id: index + 1,
    productId: product.productId,
    sku: product.sku,
    productName: product.name,
    competitorTitle: listing.title,
    currentPrice: product.price,
    competitorPriceInBase: competitorPrice,
    knownCost: product.cost,
    safeFloorPrice: Math.round(product.cost * 1.25),
    recommendedPrice: recommended,
    expectedMarginPercent: round2(((recommended - product.cost) / recommended) * PERCENT),
    currency: 'TRY',
    action: recommended < product.price ? 'Düşür' : 'Artır',
    explanation: 'Rakip fiyatın hemen altı; asgari marj korunuyor.',
    calculatedAt: ago(0, index + 1),
  };
}

const RECOMMENDATIONS: PriceRecommendation[] = Array.from({ length: RECOMMENDATION_COUNT }, (_, index) => buildRecommendation(index));

const PROPOSAL_STATUSES = ['PendingApproval', 'Simulated', 'PendingApproval', 'Rejected'];

const PROPOSALS: PriceProposal[] = PROPOSAL_STATUSES.map((status, index) => {
  const recommendation = RECOMMENDATIONS[index];
  return {
    id: index + 1,
    productId: recommendation.productId,
    sku: recommendation.sku,
    productName: recommendation.productName,
    marketplace: 'simulation',
    currentPrice: recommendation.currentPrice,
    proposedPrice: recommendation.recommendedPrice,
    currency: recommendation.currency,
    status,
    simulationOnly: true,
    reason: recommendation.explanation,
    createdAt: ago(index + 1),
    approvedAt: status === 'Simulated' ? ago(index) : null,
    executedAt: null,
    executionError: null,
  };
});

const EBAY_STATUS: EbaySyncStatus = {
  configured: false,
  mode: 'simulation',
  lastRun: {
    id: 1,
    provider: 'ebay',
    mode: 'simulation',
    status: 'Completed',
    receivedCount: 120,
    updatedCount: 18,
    error: null,
    startedAt: ago(0, 5),
    completedAt: ago(0, 5),
  },
};

// ── Fiyat/stok tutarlılığı ──────────────────────────────────────────────────

const CONSISTENCY_MARKETPLACES = ['Amazon', 'eBay', 'Web Sitesi'];

function buildConsistencyRow(product: CatalogProduct, index: number): PriceStockConsistencyRow {
  const driftsPrice = index % 3 === 0;
  const driftsStock = index % 4 === 0;
  const externalPriceTry = product.price * (driftsPrice ? 1.12 : 1);
  const externalStock = product.stock + (driftsStock ? 6 : 0);
  return {
    id: index + 1,
    productId: product.productId,
    sku: product.sku,
    productName: product.name,
    marketplace: CONSISTENCY_MARKETPLACES[index % CONSISTENCY_MARKETPLACES.length],
    externalUrl: null,
    ourPrice: product.price,
    externalPriceOriginal: round2(externalPriceTry / GBP_TO_TRY),
    externalCurrency: 'GBP',
    externalPriceTry: round2(externalPriceTry),
    priceDeviationPct: round2(((externalPriceTry - product.price) / product.price) * PERCENT),
    fxRateUnavailable: false,
    ourStock: product.stock,
    externalStock,
    stockDelta: externalStock - product.stock,
    hasPriceDeviation: driftsPrice,
    hasStockDeviation: driftsStock,
    lastSyncedAt: ago(0, index % 12),
  };
}

function consistencyOverview(): PriceStockConsistencyOverview {
  const rows = CATALOG_PRODUCTS.filter((_, index) => index % CONSISTENCY_STEP === 0).map(buildConsistencyRow);
  const priceDeviationCount = rows.filter((row) => row.hasPriceDeviation && Math.abs(row.priceDeviationPct ?? 0) > PRICE_DEVIATION_LIMIT_PCT).length;
  const stockDeviationCount = rows.filter((row) => row.hasStockDeviation).length;
  return {
    totalListings: rows.length,
    priceDeviationCount,
    stockDeviationCount,
    consistentCount: rows.filter((row) => !row.hasPriceDeviation && !row.hasStockDeviation).length,
    fxRateUnavailable: false,
    rows,
  };
}

export const productCompetitorRoutes: DemoRoute[] = [
  get('/competitor-products', (request) => workspace(request.query)),
  get('/price-intelligence/policy', () => POLICY),
  get('/price-intelligence/recommendations', () => RECOMMENDATIONS),
  get('/price-intelligence/proposals', () => PROPOSALS),
  get('/price-intelligence/ebay/status', () => EBAY_STATUS),
  get('/pricestockconsistency/overview', consistencyOverview),
];
