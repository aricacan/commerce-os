import { request } from './core';
import type {
  AgentReport,
  RuleBacktestRequest,
  RuleBacktestResult,
  ForecastModelRegistry,
  ForecastOnboardingStatus,
  ForecastReadResponse,
  ForecastServiceResponse,
  ForecastSettings,
  ForecastUsageMetric,
  AlertRule,
  PurchaseAdvisorResult,
  MoversResponse,
  ScreenerRequest,
  ScreenerResponse,
  ScopeFilters,
  SkuForecastResult,
  SupplyLeadTime,
  TerminalTimeframe,
} from '../../types/forecast';

export const forecastApi = {
  /**
   * Son kaydedilmiş tahmin koşusu — hızlı yol.
   *
   * Gecelik iş sonucu tabloya yazar; 16 seriyi canlı hesaplamak gerçek veride
   * 345 saniye sürüyor, o yüzden ekran her açılışta canlı koşmaz.
   */
  latest: (timeframe: TerminalTimeframe = 'Day') =>
    request<ForecastReadResponse>(`/forecast/latest?timeframe=${timeframe}`),

  /** "Yeniden hesapla" — canlı koşu, uzun sürer. */
  recompute: (
    params: {
      timeframe?: TerminalTimeframe;
      horizon?: number;
      categoryId?: number;
      scope?: Partial<ScopeFilters>;
    } = {},
  ) => {
    const qs = new URLSearchParams();
    qs.set('timeframe', params.timeframe ?? 'Day');
    qs.set('horizon', String(params.horizon ?? 30));
    if (params.categoryId) qs.set('categoryId', String(params.categoryId));
    // A3 - kapsam filtreleri. Boş bırakılan alan backend'de 'All' varsayılanına düşer.
    if (params.scope?.stockFilter) qs.set('stockFilter', params.scope.stockFilter);
    if (params.scope?.costFilter) qs.set('costFilter', params.scope.costFilter);
    if (params.scope?.densityFilter) qs.set('densityFilter', params.scope.densityFilter);
    // Genel 25sn varsayılanı (core.ts REQUEST_TIMEOUT_MS) burada YETMEZ — gerçek veride
    // tek seri ~30sn, tüm hiyerarşi ~6dk sürüyor (bkz. ForecastController yorumu). Eski
    // varsayılan, servis aslında çalışırken bile ekranda "yanıt vermedi" gösteriyordu.
    return request<ForecastServiceResponse>(
      `/forecast/recompute?${qs}`,
      { method: 'POST' },
      true,
      10 * 60_000,
    );
  },

  /** Faz C — tek SKU için adet tahmini. Katman ekranda AÇIKÇA gösterilir. */
  skuForecast: (productId: number, horizon = 30) =>
    request<SkuForecastResult>(`/forecast/sku/${productId}?horizon=${horizon}`, {}, true, 60_000),

  /** C5 — tedarik süresi ayarları (ülke bazlı, kiracı kendisi girer). */
  leadTimes: {
    list: () => request<SupplyLeadTime[]>('/forecast/lead-times'),
    upsert: (dto: SupplyLeadTime) =>
      request<SupplyLeadTime>('/forecast/lead-times', {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
    remove: (country: string) =>
      request<void>(`/forecast/lead-times/${country}`, { method: 'DELETE' }),
  },

  /** Faz F3 — izleme listesi sekmeleri: çok satanlar · kategoriler · riskli. */
  movers: (windowDays = 30, limit = 25) =>
    request<MoversResponse>(`/forecast/movers?windowDays=${windowDays}&limit=${limit}`, {}, true, 60_000),

  /** H1 — tarayıcı: kullanıcının kendi filtresiyle SKU tarama. */
  screen: (req: ScreenerRequest) =>
    request<ScreenerResponse>('/forecast/screen', { method: 'POST', body: JSON.stringify(req) }, true, 90_000),

  /** I2 — Satın Alma Danışmanı. Sayılar deterministik, anlatı LLM'den. */
  purchaseAdvice: (windowDays = 30, limit = 15) =>
    request<PurchaseAdvisorResult>(`/forecast/purchase-advice?windowDays=${windowDays}&limit=${limit}`, {}, true, 180_000),

  /** H2 — kullanıcı tanımlı alarm kuralları. */
  alertRules: {
    list: () => request<AlertRule[]>('/forecast/alert-rules'),
    upsert: (dto: AlertRule) =>
      request<AlertRule>('/forecast/alert-rules', { method: 'PUT', body: JSON.stringify(dto) }),
    remove: (id: number) => request<void>(`/forecast/alert-rules/${id}`, { method: 'DELETE' }),
  },

  /** Faz D — motora gömülü varsayımların (mevsim/saat dilimi/para birimi/tatil/eşikler) kiracı ayarı. */
  settings: {
    get: () => request<ForecastSettings>('/forecast/settings'),
    /** Motor ayarları (Admin). Çalışma alanı düzenine DOKUNMAZ — o saveLayout'un işi. */
    update: (dto: ForecastSettings) =>
      request<ForecastSettings>('/forecast/settings', {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
    /** F5 — yalnızca çalışma alanı düzeni; ekranı gören herkes kaydedebilir, motor ayarlarını ezmez. */
    saveLayout: (layoutJson: string) =>
      request<ForecastSettings>('/forecast/settings/layout', {
        method: 'PUT',
        body: JSON.stringify({ layoutJson }),
      }),
  },

  /** D1 — kaç günlük sinyal geçmişi var, hangi tahmin katmanı açıldı. */
  onboardingStatus: () => request<ForecastOnboardingStatus>('/forecast/onboarding-status'),

  /** D2 — en son koşuda seri başına hangi modelin kazandığı + o anki eşikler. */
  modelRegistry: () => request<ForecastModelRegistry>('/forecast/model-registry'),

  /** D3 — kiracı başına eğitim süresi/kaynak tüketimi (son N koşu). */
  usage: (limit = 30) => request<ForecastUsageMetric[]>(`/forecast/usage?limit=${limit}`),

  /** I1/I4/I5 — agent raporları ve Co-Pilot. Kanıt deterministik, anlatı LLM'den. */
  agent: {
    demandAnalysis: () => request<AgentReport>('/forecast/agent/demand-analysis', {}, true, 180_000),
    anomaly: () => request<AgentReport>('/forecast/agent/anomaly', {}, true, 180_000),
    priceStrategy: () => request<AgentReport>('/forecast/agent/price-strategy', {}, true, 180_000),
    ask: (question: string) =>
      request<AgentReport>('/forecast/agent/ask', { method: 'POST', body: JSON.stringify({ question }) }, true, 180_000),
  },

  /** H3 — kural backtest'i. Geçmiş nokta sayısı kadar tarama koşar, uzun sürebilir. */
  ruleBacktest: (req: RuleBacktestRequest) =>
    request<RuleBacktestResult>('/forecast/rule-backtest', { method: 'POST', body: JSON.stringify(req) }, true, 300_000),
};
