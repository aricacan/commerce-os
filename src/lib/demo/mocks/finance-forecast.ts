// Satış Görünümü (talep tahmin terminali): tahmin serileri, göstergeler, olaylar ve model kayıtları.
import type {
  DataQuality,
  ForecastEvent,
  ForecastPoint,
  ForecastReadResponse,
  ForecastSeries,
  ForecastServiceResponse,
  HistoryPoint,
  IndicatorValue,
  TerminalTimeframe,
} from '../../../types/forecast';
import { FINANCE_PLATFORMS, monthFigures, round2 } from '../data/finance-base';
import { ago, createRng } from '../seed';
import { post, get, type DemoRequest, type DemoRoute } from '../router';

const HOURS_PER_DAY = 24;
const MS_PER_HOUR = 3_600_000;
const AVERAGE_ORDER_VALUE = 640;
const GROSS_MARGIN = 0.21;
const BAND_RATIO = 0.18;
const STOREA_POINTS = 14;

interface TimeframeSpec {
  stepHours: number;
  history: number;
  horizon: number;
}

const TIMEFRAMES: Record<TerminalTimeframe, TimeframeSpec> = {
  Hour: { stepHours: 1, history: 72, horizon: 24 },
  Day: { stepHours: HOURS_PER_DAY, history: 120, horizon: 30 },
  Week: { stepHours: HOURS_PER_DAY * 7, history: 52, horizon: 12 },
  Month: { stepHours: HOURS_PER_DAY * 30, history: 24, horizon: 6 },
  Year: { stepHours: HOURS_PER_DAY * 365, history: 3, horizon: 1 },
};

const CATEGORY_SERIES = [{ key: 'category:paspas', name: 'Paspas', share: 0.31 }, { key: 'category:bagaj', name: 'Bagaj', share: 0.22 }, { key: 'category:ic', name: 'İç Aksesuar', share: 0.26 }, { key: 'category:bakim', name: 'Bakım', share: 0.21 }];
const MODEL_NAMES = ['ETS', 'Theta', 'SeasonalNaive', 'AutoARIMA'];

function dailyBaseRevenue(share: number): number {
  const now = new Date();
  const figures = monthFigures(now.getFullYear(), now.getMonth() === 0 ? 12 : now.getMonth());
  return (figures.revenue / 30) * share;
}

function buildPoints(spec: TimeframeSpec, share: number, seed: number) {
  const rng = createRng(seed);
  const stepDays = spec.stepHours / HOURS_PER_DAY;
  const base = dailyBaseRevenue(share) * Math.max(stepDays, 1 / HOURS_PER_DAY);
  const total = spec.history + spec.horizon;
  const startMs = Date.now() - spec.history * spec.stepHours * MS_PER_HOUR;
  const values = Array.from({ length: total }, (_, index) => {
    const seasonal = 1 + 0.12 * Math.sin((index / Math.max(1, 7 / stepDays)) * Math.PI * 2);
    const trend = 1 + (index / total) * 0.08;
    return { timestamp: new Date(startMs + index * spec.stepHours * MS_PER_HOUR).toISOString(), revenue: round2(base * seasonal * trend * rng.float(0.88, 1.12)) };
  });
  return values;
}

function seriesFor(key: string, displayName: string, share: number, parentKey: string | null, dimension: ForecastSeries['dimension'], spec: TimeframeSpec, level: number, seed: number): ForecastSeries {
  const rng = createRng(seed + 7);
  const points = buildPoints(spec, share, seed);
  const history: HistoryPoint[] = points.slice(0, spec.history).map((point) => ({
    timestamp: point.timestamp, revenue: point.revenue, orders: Math.max(1, Math.round(point.revenue / AVERAGE_ORDER_VALUE)),
    grossProfit: round2(point.revenue * GROSS_MARGIN), outsideBand: rng.chance(0.06),
  }));
  const forecast: ForecastPoint[] = points.slice(spec.history).map((point) => ({
    timestamp: point.timestamp, revenue: point.revenue, orders: Math.max(1, Math.round(point.revenue / AVERAGE_ORDER_VALUE)),
    lower90: round2(point.revenue * (1 - BAND_RATIO)), upper90: round2(point.revenue * (1 + BAND_RATIO)),
  }));
  const selectedModel = MODEL_NAMES[seed % MODEL_NAMES.length];
  const quality: DataQuality | null = level === 0
    ? { totalBuckets: spec.history, filledBuckets: spec.history, winsorizedBuckets: 3, cancelledExcluded: 41, cancelledExcludedAmount: 26_400, dormantSeries: 0, sparseSeries: 1, estimatedProfitOrders: 120, estimatedProfitRevenue: 71_000, scopeFilteredOrders: 0 }
    : null;
  return {
    key, displayName, level, parentKey, dimension, state: 'Dense', selectedModel, baselineWon: false,
    modelScores: MODEL_NAMES.map((name, index) => ({ name, mase: round2(0.71 + index * 0.09), isBaseline: name === 'SeasonalNaive' })),
    history, forecast,
    accuracy: { mase: 0.74, mapeDaily: 12.4, mapeWeekly: 7.8, mapeMonthly: 4.9, coverage90: 88.6, coverage90Adjusted: 90.2, bias: -0.6, backtestWindows: 12, unmeasuredReason: null },
    indicators: indicatorsFor(key, history),
    events: level === 0 ? EVENTS : [],
    quality,
  };
}

const EVENTS: ForecastEvent[] = [
  { timestamp: ago(21), kind: 'regime_break', seriesKey: 'total', message: 'Seviye kayması: kampanya haftasından sonra ortalama sipariş tutarı yükseldi.', severity: 'info' },
  { timestamp: ago(9), kind: 'threshold', seriesKey: 'total', message: 'Günlük ciro %90 bandının altında kaldı.', severity: 'warn' },
];

function sparkline(history: HistoryPoint[], pick: (point: HistoryPoint) => number): number[] {
  return history.slice(-STOREA_POINTS).map(pick);
}

function indicatorsFor(seriesKey: string, history: HistoryPoint[]): IndicatorValue[] {
  const last = history[history.length - 1];
  const previous = history[history.length - 8] ?? last;
  const growth = previous.revenue > 0 ? round2(((last.revenue - previous.revenue) / previous.revenue) * 100) : 0;
  const make = (code: string, label: string, group: IndicatorValue['group'], value: number, status: IndicatorValue['status'], text: string, points: number[]): IndicatorValue => ({
    code, label, group, value, text, status, points, seriesKey,
  });
  return [
    make('A1', 'Haftalık ivme', 'A', growth, growth >= 0 ? 'ok' : 'warn', `%${growth}`, sparkline(history, (point) => point.revenue)),
    make('A2', 'Günlük sipariş', 'A', last.orders, 'neutral', `${last.orders} sipariş`, sparkline(history, (point) => point.orders)),
    make('C1', 'Brüt marj', 'C', round2(GROSS_MARGIN * 100), 'ok', `%${round2(GROSS_MARGIN * 100)}`, sparkline(history, (point) => point.grossProfit)),
    make('D1', 'Stok kapsama günü', 'D', 34, 'ok', '34 gün', Array.from({ length: STOREA_POINTS }, (_, index) => 40 - index * 0.4)),
    make('F1', 'Model sağlığı', 'F', 0.74, 'ok', 'MASE 0.74', Array.from({ length: STOREA_POINTS }, (_, index) => 0.8 - index * 0.004)),
  ];
}

function buildSeries(timeframe: TerminalTimeframe): ForecastSeries[] {
  const spec = TIMEFRAMES[timeframe] ?? TIMEFRAMES.Day;
  const platformSeries = FINANCE_PLATFORMS.map((platform, index) =>
    seriesFor(`platform:${platform.name}`, platform.name, platform.share, 'total', 'platform', spec, 1, 100 + index));
  const categorySeries = CATEGORY_SERIES.map((category, index) =>
    seriesFor(category.key, category.name, category.share, 'total', 'category', spec, 1, 200 + index));
  return [seriesFor('total', 'Toplam', 1, null, null, spec, 0, 1), ...platformSeries, ...categorySeries];
}

function timeframeOf(request: DemoRequest): TerminalTimeframe {
  return (request.query.get('timeframe') as TerminalTimeframe | null) ?? 'Day';
}

function latest(request: DemoRequest): ForecastReadResponse {
  return {
    status: 'ok', message: null, computedAtUtc: ago(0, 6), isStale: false, staleReason: null, reconciliation: 'MinTrace',
    series: buildSeries(timeframeOf(request)),
  };
}

function recompute(request: DemoRequest): ForecastServiceResponse {
  const series = buildSeries(timeframeOf(request));
  return {
    computedAt: new Date().toISOString(), timeframe: timeframeOf(request), horizon: Number(request.query.get('horizon')) || 30,
    reconciliation: 'MinTrace', series, indicators: series[0].indicators, events: series[0].events,
  };
}

export const financeForecastRoutes: DemoRoute[] = [
  get('/forecast/latest', latest),
  post('/forecast/recompute', recompute),
];
