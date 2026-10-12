// Trendyol kampanya karar destek: yüklemeler, kampanya analizi, en iyi aksiyonlar, komisyon tarifesi, ürün maliyetleri.
import type {
  BestAction,
  BestActionsResponse,
  CampaignAnalysis,
  CampaignUploadInfo,
  OfferAnalysis,
  PaginatedResult,
  ProductCostInfo,
  TariffReference,
  TariffRow,
} from '../../../types/api';
import { DEMO_PRODUCTS } from '../data/core';
import { round2 } from '../data/finance-base';
import { ago, createRng, matchesSearch, paginate } from '../seed';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';

const NOT_FOUND_STATUS = 404;
const VAT_PERCENT = 20;
const SHIPPING_COST = 62;
const BOX_COST = 7.5;
const OFFERS_PER_UPLOAD = 36;
const BEST_ACTION_PRODUCT_COUNT = 40;
const TARIFF_PRODUCT_COUNT = 60;
const TARIFF_TIER_COUNT = 4;
const COST_PRODUCT_COUNT = 90;
const BARCODE_BASE = 8_680_000_000_000;

interface UploadSeed {
  id: number;
  fileName: string;
  campaignType: 'Flash' | 'Starred' | 'Plus' | 'Opportunity';
  status: CampaignUploadInfo['status'];
  totalRows: number;
  matchedRows: number;
  ageDays: number;
}

const UPLOAD_SEEDS: UploadSeed[] = [
  { id: 4, fileName: 'flash-urunler-ekim.xlsx', campaignType: 'Flash', status: 'Completed', totalRows: 120, matchedRows: 116, ageDays: 2 },
  { id: 3, fileName: 'yildizli-urunler-q4.xlsx', campaignType: 'Starred', status: 'Completed', totalRows: 86, matchedRows: 86, ageDays: 6 },
  { id: 2, fileName: 'plus-kampanyasi-ekim.xlsx', campaignType: 'Plus', status: 'PartialMatch', totalRows: 64, matchedRows: 51, ageDays: 11 },
  { id: 1, fileName: 'komisyon-tarifesi-guncel.xlsx', campaignType: 'Opportunity', status: 'Completed', totalRows: TARIFF_PRODUCT_COUNT, matchedRows: TARIFF_PRODUCT_COUNT, ageDays: 18 },
];

const UPLOADS: CampaignUploadInfo[] = UPLOAD_SEEDS.map((seed) => ({
  id: seed.id, fileName: seed.fileName, campaignType: seed.campaignType, status: seed.status,
  totalRows: seed.totalRows, matchedRows: seed.matchedRows,
  errorMessage: seed.status === 'PartialMatch' ? `${seed.totalRows - seed.matchedRows} satır katalogda eşleşmedi.` : null,
  uploadedAt: ago(seed.ageDays),
}));

// ── Teklif analizi ─────────────────────────────────────────────────────────────

const TIME_WINDOWS = ['3 Gün', '7 Gün', '14 Gün'];
const COMMISSION_SOURCES = ['Tarife', 'TarifeReferansYok', 'MevcutKomisyon'];
const RECOMMENDATION_TEXT: Record<string, string> = {
  Yap: 'Kâr marjı yüksek, hacim artışı beklenen seviyede.',
  DikkatliDegerlendir: 'Marj sınırda; stok ve reklam bütçesiyle birlikte değerlendirin.',
  Yapma: 'Kampanya fiyatında kâr kalmıyor.',
};

function buildOffer(uploadSeed: UploadSeed, productIndex: number): OfferAnalysis {
  const product = DEMO_PRODUCTS[productIndex % DEMO_PRODUCTS.length];
  const rng = createRng(uploadSeed.id * 1000 + productIndex);
  const discount = uploadSeed.campaignType === 'Flash' ? rng.float(10, 28) : rng.float(4, 14);
  const listPrice = product.price;
  const salePrice = round2(listPrice * (1 - discount / 100));
  const commissionRate = rng.float(9, 17, 1);
  const commissionAmount = round2((salePrice * commissionRate) / 100);
  const kdvAmount = round2((salePrice * VAT_PERCENT) / (100 + VAT_PERCENT));
  const netProfit = round2(salePrice - commissionAmount - product.cost - BOX_COST - SHIPPING_COST - kdvAmount);
  return {
    offerId: uploadSeed.id * 1000 + productIndex,
    barcode: String(BARCODE_BASE + product.id * 17),
    productName: product.name, brand: product.brand,
    salePrice, commissionRate, commissionAmount,
    buyingPrice: product.cost, boxCost: BOX_COST, shippingCost: SHIPPING_COST, kdvAmount,
    netProfit,
    profitMargin: round2((netProfit / salePrice) * 100),
    roi: round2((netProfit / (product.cost + BOX_COST)) * 100),
    isProfitable: netProfit > 0,
    campaignType: uploadSeed.campaignType,
    timeWindow: rng.pick(TIME_WINDOWS),
    startDate: ago(-1).slice(0, 10), endDate: ago(-8).slice(0, 10),
    listPrice, currentSellingPrice: round2(listPrice * 0.97), discountPercent: round2(discount),
    commissionSource: rng.pick(COMMISSION_SOURCES),
    estimatedVolumeMultiplier: rng.float(1.2, 3.4, 1),
  };
}

function analysisFor(uploadId: number): CampaignAnalysis | null {
  const seed = UPLOAD_SEEDS.find((item) => item.id === uploadId);
  if (!seed) return null;
  const offers = Array.from({ length: OFFERS_PER_UPLOAD }, (_, index) => buildOffer(seed, index * 2));
  const profitable = offers.filter((offer) => offer.isProfitable);
  return {
    uploadId: seed.id, fileName: seed.fileName, campaignType: seed.campaignType,
    totalOffers: offers.length,
    profitableOffers: profitable.length,
    unprofitableOffers: offers.length - profitable.length,
    unmatchedOffers: seed.totalRows - seed.matchedRows,
    totalPotentialProfit: round2(profitable.reduce((sum, offer) => sum + offer.netProfit, 0)),
    averageMargin: round2(offers.reduce((sum, offer) => sum + offer.profitMargin, 0) / offers.length),
    offers,
  };
}

// ── En iyi aksiyonlar ──────────────────────────────────────────────────────────

function buildBestAction(productIndex: number): BestAction {
  const options = UPLOAD_SEEDS.filter((seed) => seed.campaignType !== 'Opportunity').map((seed) => buildOffer(seed, productIndex));
  const best = options.reduce((top, option) => (option.netProfit > top.netProfit ? option : top), options[0]);
  const rng = createRng(productIndex + 404);
  const level = best.profitMargin > 14 ? 'Yap' : best.profitMargin > 4 ? 'DikkatliDegerlendir' : 'Yapma';
  return {
    barcode: best.barcode, productName: best.productName, brand: best.brand, buyingPrice: best.buyingPrice,
    bestCampaignType: best.campaignType, bestTimeWindow: best.timeWindow ?? '',
    bestSalePrice: best.salePrice, bestNetProfit: best.netProfit, bestProfitMargin: best.profitMargin,
    bestWeightedScore: round2(best.netProfit * (best.estimatedVolumeMultiplier ?? 1) * rng.float(0.9, 1.1)),
    allOptions: options,
    listPrice: best.listPrice, discountPercent: best.discountPercent, estimatedVolumeMultiplier: best.estimatedVolumeMultiplier,
    recommendationLevel: level, recommendation: RECOMMENDATION_TEXT[level],
  };
}

function bestActions(): BestActionsResponse {
  const actions = Array.from({ length: BEST_ACTION_PRODUCT_COUNT }, (_, index) => buildBestAction(index))
    .sort((a, b) => b.bestWeightedScore - a.bestWeightedScore);
  return {
    totalProducts: actions.length,
    productsWithMultipleOptions: actions.filter((action) => action.allOptions.length > 1).length,
    totalWeightedProfit: round2(actions.reduce((sum, action) => sum + action.bestWeightedScore, 0)),
    actions,
  };
}

// ── Komisyon tarifesi ──────────────────────────────────────────────────────────

function tariffRow(productIndex: number): TariffRow {
  const product = DEMO_PRODUCTS[productIndex];
  const base = product.price;
  const commissionAt = (tier: number) => round2(16 - tier * 2.5);
  return {
    barcode: String(BARCODE_BASE + product.id * 17),
    productName: product.name,
    commissionBasePrice: base,
    tier1PriceLow: round2(base * 0.92), tier1Commission: commissionAt(TARIFF_TIER_COUNT - 3),
    tier2PriceLow: round2(base * 0.85), tier2Commission: commissionAt(TARIFF_TIER_COUNT - 2),
    tier3PriceLow: round2(base * 0.78), tier3Commission: commissionAt(TARIFF_TIER_COUNT - 1),
    tier4Commission: commissionAt(TARIFF_TIER_COUNT),
  };
}

function tariff(): TariffReference {
  const upload = UPLOADS.find((item) => item.campaignType === 'Opportunity');
  return {
    uploadId: upload?.id ?? null, fileName: upload?.fileName ?? null, uploadedAt: upload?.uploadedAt ?? null,
    totalProducts: TARIFF_PRODUCT_COUNT,
    rows: Array.from({ length: TARIFF_PRODUCT_COUNT }, (_, index) => tariffRow(index)),
  };
}

// ── Ürün maliyetleri ───────────────────────────────────────────────────────────

const PRODUCT_COSTS: ProductCostInfo[] = DEMO_PRODUCTS.slice(0, COST_PRODUCT_COUNT).map((product) => ({
  id: product.id, productId: product.id, productName: product.name,
  barcode: String(BARCODE_BASE + product.id * 17),
  buyingPrice: product.cost, packagingCost: BOX_COST, updatedAt: ago(product.id % 30),
}));

function productCosts(request: DemoRequest): PaginatedResult<ProductCostInfo> {
  const search = request.query.get('search');
  const filtered = PRODUCT_COSTS.filter((cost) => matchesSearch(cost, search, ['productName', 'barcode']));
  const page = paginate(filtered, request.query, 50);
  return { items: page.items, totalCount: page.totalCount, page: page.page, pageSize: page.pageSize };
}

export const financeCampaignRoutes: DemoRoute[] = [
  get('/campaign/uploads', () => UPLOADS),
  get('/campaign/analysis/:id', (request) => analysisFor(Number(request.params.id)) ?? new DemoHttpResponse(NOT_FOUND_STATUS)),
  get('/campaign/best-actions', bestActions),
  get('/campaign/tariff', tariff),
  get('/campaign/product-costs', productCosts),
];
