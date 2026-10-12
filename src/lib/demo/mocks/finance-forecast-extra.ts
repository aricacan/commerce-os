// Satış Görünümü yardımcı uçları: izleme listesi, tarayıcı, satın alma danışmanı, alarmlar, ayarlar, agent raporları.
import type {
  AgentReport,
  AlertRule,
  ForecastModelRegistry,
  ForecastOnboardingStatus,
  ForecastSettings,
  ForecastUsageMetric,
  MoverRisk,
  MoverRow,
  MoversResponse,
  PurchaseAdvisorResult,
  PurchaseSuggestion,
  RuleBacktestPoint,
  RuleBacktestResult,
  ScreenerCondition,
  ScreenerField,
  ScreenerResponse,
  SkuForecastResult,
  SupplyLeadTime,
} from '../../../types/forecast';
import { DEMO_PRODUCTS } from '../data/core';
import { round2 } from '../data/finance-base';
import { ago, createRng } from '../seed';
import { DemoHttpResponse, get, post, type DemoRequest, type DemoRoute } from '../router';

const MOVER_COUNT = 30;
const CATEGORY_MOVER_COUNT = 8;
const DEFAULT_WINDOW_DAYS = 30;
const NOT_FOUND_STATUS = 404;
const SKU_FORECAST_DAYS = 30;
const BACKTEST_POINTS = 12;

function riskOf(stock: number, daysOfSupply: number): MoverRisk {
  if (stock === 0 || daysOfSupply < 7) return 'Stockout';
  return daysOfSupply > 120 ? 'Dead' : 'Healthy';
}

function buildMovers(count: number, windowDays: number, seed: number, named: (index: number) => { id: number; name: string; sku: string | null }): MoverRow[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, (_, index) => {
    const entity = named(index);
    const units = Math.round(rng.int(20, 260) * (windowDays / DEFAULT_WINDOW_DAYS));
    const stock = rng.int(0, 400);
    const daysOfSupply = units > 0 ? round2((stock / units) * windowDays) : null;
    return {
      id: entity.id, name: entity.name, supplierSku: entity.sku, units, revenue: round2(units * rng.float(180, 920)),
      deltaPercent: rng.chance(0.1) ? null : round2(rng.float(-28, 46)), marginPercent: round2(rng.float(8, 34)),
      stock, daysOfSupply, risk: daysOfSupply === null ? 'Unknown' : riskOf(stock, daysOfSupply),
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

const productEntity = (index: number) => ({ id: DEMO_PRODUCTS[index].id, name: DEMO_PRODUCTS[index].name, sku: DEMO_PRODUCTS[index].sku });
const CATEGORY_NAMES = ['Paspas', 'Bagaj', 'İç Aksesuar', 'Bakım', 'Aydınlatma', 'Elektronik', 'Dış Aksesuar', 'Lastik Bakım'];

function movers(request: DemoRequest): MoversResponse {
  const windowDays = Number(request.query.get('windowDays')) || DEFAULT_WINDOW_DAYS;
  const limit = Number(request.query.get('limit')) || MOVER_COUNT;
  return {
    skus: buildMovers(MOVER_COUNT, windowDays, 11, productEntity).slice(0, limit),
    categories: buildMovers(CATEGORY_MOVER_COUNT, windowDays, 12, (index) => ({ id: index + 1, name: CATEGORY_NAMES[index], sku: null })),
    marginCoverage: 112, marginCoverageTotal: 120, windowDays,
  };
}

// ── Tarayıcı ve alarm kuralları ────────────────────────────────────────────────

const FIELD_VALUE: Record<ScreenerField, (row: MoverRow) => number | null> = {
  Units: (row) => row.units, Revenue: (row) => row.revenue, DeltaPercent: (row) => row.deltaPercent,
  MarginPercent: (row) => row.marginPercent, DaysOfSupply: (row) => row.daysOfSupply, Stock: (row) => row.stock,
};

function matches(row: MoverRow, conditions: ScreenerCondition[]): boolean | null {
  for (const condition of conditions) {
    const value = FIELD_VALUE[condition.field](row);
    if (value === null) return null;
    const passed = condition.operator === 'GreaterThan' ? value > condition.value : value < condition.value;
    if (!passed) return false;
  }
  return true;
}

function screen(request: DemoRequest): ScreenerResponse {
  const body = (request.body ?? {}) as { conditions?: ScreenerCondition[]; windowDays?: number; sortBy?: ScreenerField; sortAscending?: boolean; limit?: number };
  const windowDays = body.windowDays ?? DEFAULT_WINDOW_DAYS;
  const candidates = buildMovers(MOVER_COUNT, windowDays, 11, productEntity);
  const results = candidates.map((row) => ({ row, ok: matches(row, body.conditions ?? []) }));
  const sortKey = FIELD_VALUE[body.sortBy ?? 'Revenue'];
  const direction = body.sortAscending ? 1 : -1;
  const rows = results.filter((item) => item.ok === true).map((item) => item.row)
    .sort((a, b) => ((sortKey(a) ?? 0) - (sortKey(b) ?? 0)) * direction).slice(0, body.limit ?? 25);
  return { rows, totalCandidates: candidates.length, excludedUnknown: results.filter((item) => item.ok === null).length, windowDays };
}

const ALERT_RULES: AlertRule[] = [
  { id: 1, name: 'Stok bitmek üzere (hızlı satan)', conditions: [{ field: 'DaysOfSupply', operator: 'LessThan', value: 10 }, { field: 'Units', operator: 'GreaterThan', value: 100 }], windowDays: 30, isEnabled: true, cooldownHours: 24, lastFiredAtUtc: ago(1), lastMatchCount: 4 },
  { id: 2, name: 'Düşüşteki ürünler', conditions: [{ field: 'DeltaPercent', operator: 'LessThan', value: -20 }], windowDays: 30, isEnabled: true, cooldownHours: 48, lastFiredAtUtc: ago(3), lastMatchCount: 7 },
  { id: 3, name: 'Düşük marjlı çok satanlar', conditions: [{ field: 'MarginPercent', operator: 'LessThan', value: 12 }, { field: 'Revenue', operator: 'GreaterThan', value: 20000 }], windowDays: 14, isEnabled: false, cooldownHours: 72, lastFiredAtUtc: null, lastMatchCount: null },
];

function backtest(request: DemoRequest): RuleBacktestResult {
  const body = (request.body ?? {}) as { stepDays?: number };
  const rng = createRng(31);
  const points: RuleBacktestPoint[] = Array.from({ length: BACKTEST_POINTS }, (_, index) => ({
    asOfUtc: ago((BACKTEST_POINTS - index) * (body.stepDays ?? 14)), matchCount: index === 2 ? null : rng.int(2, 11),
    totalCandidates: 120, excludedUnknown: index === 2 ? 120 : rng.int(0, 6), unmeasurableReason: index === 2 ? 'Bu tarihte stok geçmişi yok.' : null,
  }));
  const measured = points.filter((point) => point.matchCount !== null);
  return {
    points, measuredPoints: measured.length, unmeasurablePoints: points.length - measured.length,
    averageMatches: round2(measured.reduce((sum, point) => sum + (point.matchCount ?? 0), 0) / measured.length), notice: null,
  };
}

// ── Satın alma danışmanı ───────────────────────────────────────────────────────

function purchaseAdvice(request: DemoRequest): PurchaseAdvisorResult {
  const windowDays = Number(request.query.get('windowDays')) || DEFAULT_WINDOW_DAYS;
  const limit = Number(request.query.get('limit')) || 15;
  const rng = createRng(61);
  const suggestions: PurchaseSuggestion[] = DEMO_PRODUCTS.slice(0, limit).map((product, index) => {
    const recentUnits = rng.int(40, 220);
    const stock = rng.int(0, 90);
    return {
      productId: product.id, name: product.name, supplierSku: product.sku, recentUnits, stock,
      daysOfSupply: round2((stock / recentUnits) * windowDays), marginPercent: round2(rng.float(12, 34)),
      reorderPoint: { avgDailyDemand: round2(recentUnits / windowDays), leadTimeDaysUsed: 14, safetyStock: 18, reorderPointQuantity: Math.round(recentUnits / windowDays * 14) + 18, country: 'TR' },
      suggestedQuantity: Math.round(recentUnits * 1.3 - stock), urgency: Math.max(8, 96 - index * 6),
    };
  });
  return {
    suggestions,
    narrative: 'Öncelik sırası stok kapsama gününe göre belirlendi. Paspas ve bagaj grubunda üç ürün önümüzdeki iki hafta içinde tükenebilir; tedarik süresi 14 gün olduğundan bu siparişler bu hafta verilmeli.',
    notice: null, windowDays, missingLeadTimeCount: 2,
  };
}

// ── Ayarlar ve durum ───────────────────────────────────────────────────────────

const SETTINGS: ForecastSettings = {
  seasonLengthDay: 7, timezoneOffsetHours: 3, currency: 'TRY', holidayCountry: 'TR', sparseOrdersPerBucket: 2,
  dormantHorizonMultiple: 3, winsorizeSigma: 3, paretoTopFraction: 0.2, layoutJson: '',
};

const LEAD_TIMES: SupplyLeadTime[] = [
  { country: 'TR', minHours: 24, maxHours: 72 },
  { country: 'UK', minHours: 240, maxHours: 360 },
  { country: 'CN', minHours: 720, maxHours: 1080 },
];

const ONBOARDING: ForecastOnboardingStatus = {
  daysOfSignalHistory: 412, totalUnlocked: true, categoryUnlocked: true, skuUnlocked: true,
  message: 'Tüm tahmin katmanları açık: toplam, kategori ve ürün bazında tahmin üretilebiliyor.',
};

const MODEL_REGISTRY: ForecastModelRegistry = {
  settings: SETTINGS,
  series: ['total', 'platform:Trendyol', 'platform:Hepsiburada', 'platform:Amazon', 'category:paspas'].map((seriesKey, index) => ({
    seriesKey, selectedModel: ['ETS', 'Theta', 'AutoARIMA', 'ETS', 'Theta'][index], baselineWon: false, mase: round2(0.7 + index * 0.04), computedAtUtc: ago(0, 6),
  })),
};

const USAGE: ForecastUsageMetric[] = Array.from({ length: 10 }, (_, index) => ({
  jobName: 'nightly-forecast', computedAtUtc: ago(index), durationMs: 184_000 + index * 3_100, seriesCount: 28,
}));

// ── Ürün tahmini ve agent raporları ────────────────────────────────────────────

function skuForecast(request: DemoRequest): SkuForecastResult | DemoHttpResponse {
  const product = DEMO_PRODUCTS.find((item) => item.id === Number(request.params.id));
  if (!product) return new DemoHttpResponse(NOT_FOUND_STATUS);
  const horizon = Number(request.query.get('horizon')) || SKU_FORECAST_DAYS;
  const rng = createRng(product.id);
  const forecast = Array.from({ length: horizon }, (_, index) => {
    const quantity = round2(rng.float(2, 9));
    return { date: ago(-index - 1).slice(0, 10), quantity, lower90: round2(quantity * 0.6), upper90: round2(quantity * 1.45) };
  });
  return {
    productId: product.id, productName: product.name, supplierSku: product.sku, tier: 'Individual', insufficientReason: null, forecast,
    totalQuantity: round2(forecast.reduce((sum, point) => sum + point.quantity, 0)), mase: 0.81, categorySharePercent: null, stockoutDaysCorrected: 3,
    reorderPoint: { avgDailyDemand: 5.4, leadTimeDaysUsed: 14, safetyStock: 20, reorderPointQuantity: 96, country: 'TR' },
  };
}

function report(title: string, evidence: AgentReport['evidence'], narrative: string): AgentReport {
  return { title, evidence, narrative, notice: null, generatedAtUtc: new Date().toISOString() };
}

const DEMAND_REPORT = report('Talep analizi', [
  { kind: 'trend', text: 'Son 30 günde toplam sipariş adedi önceki döneme göre %9 arttı.', severity: 'info' },
  { kind: 'category', text: 'Paspas kategorisi payını %29\'dan %31\'e çıkardı.', severity: 'info' },
  { kind: 'risk', text: '4 çok satan üründe stok kapsama süresi 10 günün altında.', severity: 'warn' },
], 'Talep genel olarak yükselişte. Büyümenin ana kaynağı Trendyol ve web sitesi; stok riski taşıyan ürünler için sipariş planı gözden geçirilmeli.');

const ANOMALY_REPORT = report('Anomali taraması', [
  { kind: 'spike', text: 'Geçen çarşamba günlük ciro beklenen bandın %24 üzerinde kapandı (kampanya etkisi).', severity: 'info' },
  { kind: 'drop', text: 'Amazon kanalında üç gündür sipariş sayısı bandın altında.', severity: 'bad' },
], 'Bir olumlu, bir olumsuz sapma var. Amazon düşüşü listeleme veya fiyat kaynaklı olabilir; ilan durumunu kontrol edin.');

const PRICE_REPORT = report('Fiyat stratejisi', [
  { kind: 'elasticity', text: 'Bagaj havuzu grubunda %5 fiyat artışı adetleri yalnızca %2 düşürdü.', severity: 'info' },
  { kind: 'margin', text: '6 üründe marj %12 altına indi.', severity: 'warn' },
], 'Bagaj grubunda fiyat artışı için alan var. Düşük marjlı altı ürün için maliyet güncellemesi veya fiyat revizyonu önerilir.');

const ASK_REPORT = report('Cevap', [{ kind: 'info', text: 'Demo modunda soru-cevap örnek bir yanıt döndürür.', severity: 'info' }],
  'Bu bir demo yanıtıdır. Gerçek kurulumda soru, kiracının kendi satış verisiyle yanıtlanır.');

export const financeForecastExtraRoutes: DemoRoute[] = [
  get('/forecast/movers', movers),
  post('/forecast/screen', screen),
  post('/forecast/rule-backtest', backtest),
  get('/forecast/purchase-advice', purchaseAdvice),
  get('/forecast/alert-rules', () => ALERT_RULES),
  get('/forecast/lead-times', () => LEAD_TIMES),
  get('/forecast/settings', () => SETTINGS),
  get('/forecast/onboarding-status', () => ONBOARDING),
  get('/forecast/model-registry', () => MODEL_REGISTRY),
  get('/forecast/usage', () => USAGE),
  get('/forecast/sku/:id', skuForecast),
  get('/forecast/agent/demand-analysis', () => DEMAND_REPORT),
  get('/forecast/agent/anomaly', () => ANOMALY_REPORT),
  get('/forecast/agent/price-strategy', () => PRICE_REPORT),
  post('/forecast/agent/ask', () => ASK_REPORT),
];
