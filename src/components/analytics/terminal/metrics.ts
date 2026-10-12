import type { ForecastPoint } from '../../../types/forecast';
import { compactTry, NUM } from './format';

/**
 * F2 — ana grafikte çizilebilecek metrikler.
 *
 * TAHMİN BANDI YALNIZCA MODELİN GERÇEKTEN TAHMİN ETTİĞİ METRİKTE: model ciroyu
 * (ve ondan türeyen adedi) tahmin ediyor. ASP ve brüt kâr için model çıktısı
 * YOKTUR — bu metriklerde tahmin çizgisi de bant da çizilmez. Olmayan bandı
 * çizmek, ölçülmemiş bir belirsizliği ölçülmüş gibi göstermek olurdu.
 *
 * STOK METRİĞİ BİLEREK YOK: stok geçmişi DailySignal'da tutuluyor ve bugün
 * 1 günlük. Tek noktalı bir seriyi "stok grafiği" diye sunmak yanıltıcı olur;
 * sinyal geçmişi olgunlaşınca eklenecek (bkz. sv2_terminal_plan.md Faz G · D grubu).
 */
export type ChartMetricKey = 'revenue' | 'units' | 'asp' | 'profit';

interface HistoryLike {
  revenue: number;
  orders: number;
  grossProfit: number;
}

export interface MetricConfig {
  key: ChartMetricKey;
  label: string;
  short: string;
  format: (v: number) => string;
  minMove: number;
  fromHistory: (h: HistoryLike) => number;
  /** Model bu metriği tahmin ediyor mu — false ise tahmin çizgisi çizilmez. */
  hasForecast: boolean;
  /** %90 conformal bant çizilsin mi (yalnızca ciroda ölçüldü). */
  forecastBand: boolean;
  fromForecast?: (f: ForecastPoint) => number;
}

const int = (v: number) => NUM.format(Math.round(v));

export const METRICS: Record<ChartMetricKey, MetricConfig> = {
  revenue: {
    key: 'revenue',
    label: 'Ciro',
    short: 'Ciro',
    format: compactTry,
    minMove: 1,
    fromHistory: (h) => h.revenue,
    hasForecast: true,
    forecastBand: true,
    fromForecast: (f) => f.revenue,
  },
  units: {
    key: 'units',
    label: 'Adet',
    short: 'Adet',
    format: int,
    minMove: 1,
    fromHistory: (h) => h.orders,
    hasForecast: true,
    // Adet tahmini A4'te AYRI modellenmiş ama conformal bandı ciro serisinde
    // ölçüldü — adet için ayrı bant YOK, o yüzden çizilmez.
    forecastBand: false,
    fromForecast: (f) => f.orders,
  },
  asp: {
    key: 'asp',
    label: 'Ortalama Satış Fiyatı',
    short: 'ASP',
    format: compactTry,
    minMove: 0.01,
    // ASP ayrı alan olarak SAKLANMAZ, burada türetilir — aynı sayıyı iki yerde
    // tutmak ikisinin sessizce birbirinden kayması demektir.
    fromHistory: (h) => (h.orders > 0 ? h.revenue / h.orders : 0),
    hasForecast: false,
    forecastBand: false,
  },
  profit: {
    key: 'profit',
    label: 'Brüt Kâr',
    short: 'Kâr',
    format: compactTry,
    minMove: 1,
    fromHistory: (h) => h.grossProfit,
    hasForecast: false,
    forecastBand: false,
  },
};

export const METRIC_ORDER: ChartMetricKey[] = ['revenue', 'units', 'asp', 'profit'];
