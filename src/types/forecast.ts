/**
 * Talep tahmin terminali tipleri — backend ForecastController'ın aynası.
 *
 * TASARIM NOTU: doğruluk alanlarının HEPSİ nullable. Ölçülemeyen metrik `null`
 * gelir ve arayüzde sayı GÖSTERİLMEZ, `unmeasuredReason` yazılır. Eski ekran
 * bu durumda clamp'lenmiş (%80 taban) ya da koda gömülü sabit değerler
 * gösteriyordu — kullanıcı modelin ölçülmediğini asla anlayamıyordu.
 */

export type TerminalTimeframe = 'Hour' | 'Day' | 'Week' | 'Month' | 'Year';

/** Dense: tüm modeller yarışır · Sparse: aralıklı talep · Dormant: tahmin yok. */
export type SeriesState = 'Dense' | 'Sparse' | 'Dormant';

export interface ModelScore {
  name: string;
  /** Mean Absolute Scaled Error. <1 = mevsimsel-naive tabanından iyi. */
  mase: number | null;
  isBaseline: boolean;
}

export interface ForecastPoint {
  timestamp: string;
  revenue: number;
  orders: number;
  lower90: number;
  upper90: number;
}

/**
 * Gerçekleşen kova. Grafiğin sütunları bunlardan çizilir.
 *
 * Saklanan koşu kendi kendine yeterlidir: geçmişi ayrıca sipariş ucundan çekmek
 * gerekseydi ekran iki kaynağı hizalamak zorunda kalır ve sessiz tarih kaymaları
 * mümkün olurdu.
 */
export interface HistoryPoint {
  timestamp: string;
  revenue: number;
  orders: number;
  /**
   * F2 — metrik seçici için. ASP AYRI alan değildir: revenue/orders olarak
   * arayüzde türetilir (bkz. terminal/metrics.ts).
   */
  grossProfit: number;
  /** %90 bandın DIŞINDA kalan gün — arayüzde kırmızı çizilir ("sorun", "düşüş" değil). */
  outsideBand: boolean;
}

export interface ForecastAccuracy {
  mase: number | null;
  mapeDaily: number | null;
  mapeWeekly: number | null;
  mapeMonthly: number | null;
  /** HAM %90 bant kapsaması — B2 düzeltmesi öncesi ölçüm. Hedef 90 ± 3. */
  coverage90: number | null;
  /**
   * B2 - coverage90 düşük ölçüldüyse bant genişletilir; bu alan GENİŞLETİLMİŞ
   * bandın aynı kalibrasyon setinde kaç kapsadığını taşır. null ise ölçek
   * uygulanmadı (coverage90 ile aynı kabul edilir). "Bant sağlam/dar" rozeti
   * BUNA bakmalı — coverage90 artık teslim edilen bandı tanımlamıyor.
   */
  coverage90Adjusted: number | null;
  bias: number | null;
  backtestWindows: number;
  unmeasuredReason: string | null;
}

export interface IndicatorValue {
  code: string;
  label: string;
  /**
   * A talep/momentum · B fiyat/elastikiyet · C kârlılık · D stok/tedarik ·
   * E kanal/portföy · F model sağlığı · G reklam (bkz. IndicatorPanel.GROUP_LABEL).
   */
  group: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  value: number | null;
  text: string | null;
  status: 'neutral' | 'ok' | 'warn' | 'bad';
  points: (number | null)[];
  seriesKey: string;
}

export interface ForecastEvent {
  timestamp: string;
  kind: 'regime_break' | 'dormant' | 'threshold' | 'model_fallback';
  seriesKey: string;
  message: string;
  severity: 'info' | 'warn' | 'bad';
}

export interface DataQuality {
  totalBuckets: number;
  filledBuckets: number;
  winsorizedBuckets: number;
  cancelledExcluded: number;
  cancelledExcludedAmount: number;
  dormantSeries: number;
  sparseSeries: number;

  /** A5 - kar sismesi yamasi. Satir kalemi olmayan siparise ortalama marj uygulandi. */
  estimatedProfitOrders: number;
  estimatedProfitRevenue: number;

  /** A3 - kapsam filtreleri uygulandiginda elenen siparis sayisi. Filtre "Tumu" ise 0. */
  scopeFilteredOrders: number;
}

/** A3 - veri kapsami filtreleri. Ucu de varsayilan 'All'. */
export type ProductStockFilter = 'All' | 'InStockOnly' | 'OutOfStockOnly';
export type ProductCostFilter = 'All' | 'HasCost' | 'NoCost';
export type SeriesDensityFilter = 'All' | 'DenseOnly' | 'SparseOnly';

export interface ScopeFilters {
  stockFilter: ProductStockFilter;
  costFilter: ProductCostFilter;
  densityFilter: SeriesDensityFilter;
}

export interface ForecastSeries {
  key: string;
  displayName: string;
  level: number;
  parentKey: string | null;
  /** B3 - "platform" | "category" | null. Toplam/Mağaza×ERP için null. */
  dimension: 'platform' | 'category' | null;
  state: SeriesState;
  selectedModel: string;
  /** Hiçbir aday taban modeli yenemedi — ekranda AÇIKÇA gösterilir. */
  baselineWon: boolean;
  modelScores: ModelScore[];
  history: HistoryPoint[];
  forecast: ForecastPoint[];
  accuracy: ForecastAccuracy;
  indicators: IndicatorValue[];
  events: ForecastEvent[];
  quality: DataQuality | null;
}

export interface ForecastReadResponse {
  status: 'ok' | 'not_computed';
  message: string | null;
  computedAtUtc: string | null;
  isStale: boolean;
  staleReason: string | null;
  reconciliation: 'MinTrace' | 'BottomUp' | 'None';
  series: ForecastSeries[];
}

export interface ForecastServiceResponse {
  computedAt: string;
  timeframe: TerminalTimeframe;
  horizon: number;
  reconciliation: 'MinTrace' | 'BottomUp' | 'None';
  series: ForecastSeries[];
  indicators: IndicatorValue[];
  events: ForecastEvent[];
}

// ── Faz C — SKU bazlı tahmin ────────────────────────────────────────────────

/** Hangi yöntemle üretildiği — ekranda GİZLENMEZ (bkz. SkuForecastService). */
export type SkuForecastTier =
  | 'Individual'
  | 'Global'
  | 'CategoryShare'
  | 'ColdStart'
  | 'InsufficientData';

export interface SkuForecastPoint {
  date: string;
  quantity: number;
  lower90: number;
  upper90: number;
}

/** C5 — yeniden sipariş noktası. Kiracının girdiği tedarik süresine göre hesaplanır. */
export interface ReorderPointResult {
  avgDailyDemand: number;
  leadTimeDaysUsed: number;
  safetyStock: number;
  reorderPointQuantity: number;
  country: string;
}

export interface SkuForecastResult {
  productId: number;
  productName: string;
  supplierSku: string | null;
  tier: SkuForecastTier;
  insufficientReason: string | null;
  forecast: SkuForecastPoint[];
  totalQuantity: number;
  mase: number | null;
  categorySharePercent: number | null;
  stockoutDaysCorrected: number;
  reorderPoint: ReorderPointResult | null;
}

/** C5 — kiracının ülke bazlı girdiği tedarik süresi (ör. TR→TR 1-2 saat, TR→UK 10-15 gün). */
export interface SupplyLeadTime {
  country: string;
  minHours: number;
  maxHours: number;
}

// ── Faz F3 — izleme listesi sekmeleri (çok satanlar · kategoriler · riskli) ──

/**
 * SKU risk sınıfı. `Unknown` = veri yetersiz — "sağlıklı" DEĞİL, sınıflandırılamadı.
 * Bu ayrım önemli: stok bilgisi olmayan bir ürünü yeşil göstermek yanıltıcı olur.
 */
export type MoverRisk = 'Stockout' | 'Dead' | 'Healthy' | 'Unknown';

export interface MoverRow {
  id: number;
  name: string;
  supplierSku: string | null;
  units: number;
  revenue: number;
  /** Önceki eşit pencereye göre adet değişimi. Önceki pencere boşsa null ("yeni"). */
  deltaPercent: number | null;
  /** Alış fiyatı bilinmiyorsa null — sıfır varsayılmaz. */
  marginPercent: number | null;
  stock: number | null;
  /** Faz G · D grubu — stok ÷ günlük ortalama talep. Satış yoksa null. */
  daysOfSupply: number | null;
  risk: MoverRisk;
}

export interface MoversResponse {
  skus: MoverRow[];
  categories: MoverRow[];
  /** Marj sütununun kapsaması — ekranda AÇIKÇA gösterilir. */
  marginCoverage: number;
  marginCoverageTotal: number;
  windowDays: number;
}

// ── Faz H1 — tarayıcı (screener) ───────────────────────────────────────────

export type ScreenerField =
  | 'Units'
  | 'Revenue'
  | 'DeltaPercent'
  | 'MarginPercent'
  | 'DaysOfSupply'
  | 'Stock';

export type ScreenerOperator = 'GreaterThan' | 'LessThan';

export interface ScreenerCondition {
  field: ScreenerField;
  operator: ScreenerOperator;
  value: number;
}

export interface ScreenerRequest {
  conditions: ScreenerCondition[];
  windowDays: number;
  sortBy: ScreenerField;
  sortAscending: boolean;
  limit: number;
}

export interface ScreenerResponse {
  rows: MoverRow[];
  totalCandidates: number;
  /** Ölçülemeyen değer yüzünden elenen satır — ekranda AÇIKÇA gösterilir. */
  excludedUnknown: number;
  windowDays: number;
}

// ── Faz I2 — Satın Alma Danışmanı ──────────────────────────────────────────

export interface PurchaseSuggestion {
  productId: number;
  name: string;
  supplierSku: string | null;
  recentUnits: number;
  stock: number | null;
  daysOfSupply: number | null;
  marginPercent: number | null;
  /** C5 yeniden sipariş noktası. Tedarik süresi girilmemişse null — uydurulmaz. */
  reorderPoint: ReorderPointResult | null;
  suggestedQuantity: number;
  /** 0-100. DETERMİNİSTİK formülle hesaplanır, yapay zekâdan gelmez. */
  urgency: number;
}

export interface PurchaseAdvisorResult {
  suggestions: PurchaseSuggestion[];
  /** LLM anlatısı. Servis erişilemezse null olur ve notice doldurulur. */
  narrative: string | null;
  notice: string | null;
  windowDays: number;
  missingLeadTimeCount: number;
}

// ── Faz H2 — kullanıcı tanımlı alarmlar ────────────────────────────────────

export interface AlertRule {
  id: number;
  name: string;
  conditions: ScreenerCondition[];
  windowDays: number;
  isEnabled: boolean;
  /** Alarm yorgunluğuna karşı susturma penceresi (saat). */
  cooldownHours: number;
  lastFiredAtUtc: string | null;
  lastMatchCount: number | null;
}

// ── Faz D — motora gömülü varsayımların kiracı ayarına çevrilmesi ──────────

/**
 * Kayıt yoksa backend Defaults() döner (mevsim 7, saat dilimi +3, TRY, TR, vb.) —
 * DEMO hiç ayar girmese bile davranış bugünkü hardcode'larla AYNI kalır.
 */
export interface ForecastSettings {
  seasonLengthDay: number;
  timezoneOffsetHours: number;
  currency: string;
  holidayCountry: string;
  sparseOrdersPerBucket: number;
  dormantHorizonMultiple: number;
  winsorizeSigma: number;
  paretoTopFraction: number;
  /** F5 — çalışma alanı (zaman dilimi · metrik · pane'ler · sekme) JSON metni. Boş = varsayılan. */
  layoutJson: string;
}

/** F5 — kaydedilen düzenin şekli. Bilinmeyen alan gelirse yok sayılır. */
export interface SavedLayout {
  timeframe?: TerminalTimeframe;
  metric?: string;
  panes?: string[];
  watchTab?: string;
}

/** D1 — kaç günlük sinyal geçmişi var, hangi tahmin katmanı açıldı. */
export interface ForecastOnboardingStatus {
  daysOfSignalHistory: number;
  totalUnlocked: boolean;
  categoryUnlocked: boolean;
  skuUnlocked: boolean;
  message: string;
}

/** D2 — en son koşuda seri başına hangi modelin kazandığı. */
export interface ForecastModelRegistryEntry {
  seriesKey: string;
  selectedModel: string;
  baselineWon: boolean;
  mase: number | null;
  computedAtUtc: string;
}

export interface ForecastModelRegistry {
  series: ForecastModelRegistryEntry[];
  settings: ForecastSettings;
}

/** D3 — kiracı başına eğitim süresi/kaynak tüketimi (fiyatlandırma buna dayanacak). */
export interface ForecastUsageMetric {
  jobName: string;
  computedAtUtc: string;
  durationMs: number;
  seriesCount: number;
}

/** I1/I4 — agent kanıtı. Deterministik toplanır, LLM üretmez. */
export interface AgentEvidence {
  kind: string;
  text: string;
  severity: 'info' | 'warn' | 'bad';
}

/** I1/I4 — agent raporu. `narrative` yoksa kanıtlar yine geçerlidir. */
export interface AgentReport {
  title: string;
  evidence: AgentEvidence[];
  narrative: string | null;
  notice: string | null;
  generatedAtUtc: string;
}

/** H3 — kural backtest'i: tek bir geçmiş değerlendirme noktası. */
export interface RuleBacktestPoint {
  asOfUtc: string;
  /** Kurala uyan ürün sayısı. Ölçülemediyse null — sıfır DEĞİL. */
  matchCount: number | null;
  totalCandidates: number;
  excludedUnknown: number;
  unmeasurableReason: string | null;
}

export interface RuleBacktestResult {
  points: RuleBacktestPoint[];
  averageMatches: number | null;
  measuredPoints: number;
  unmeasurablePoints: number;
  notice: string | null;
}

export interface RuleBacktestRequest {
  conditions: ScreenerCondition[];
  windowDays: number;
  monthsBack: number;
  stepDays: number;
}
