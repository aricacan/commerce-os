// Analiz sayfaları: anomali, kohort, kanibalizasyon.
import type {
  AnomalyAnalysis,
  AnomalyGroup,
  AnomalyOverview,
  CannibalizationMatrix,
  CannibalizationPair,
  CohortAnalyticsResponse,
  CohortMatrixRow,
} from '../../../types/api';
import { ago, createRng, dayAgo } from '../seed';
import { DEMO_STORES } from '../data/core';
import { BRAND_SHARES, CATEGORY_SHARES, PLATFORM_SHARES, TOP_PRODUCTS, type Weighted } from '../data/dashboard-catalog';
import { dayMetrics, storeShare } from '../data/dashboard-series';
import { get, post, type DemoRequest, type DemoRoute } from '../router';

const DEFAULT_WINDOW_DAYS = 60;
const CRITICAL_Z = 3;
const WARNING_Z = 2;
const HEALTH_SCORE = 82;
const COHORT_MIN_SIZE = 70;
const COHORT_MAX_SIZE = 170;
const COHORT_MAX_MONTHS = 12;
const ORDERS_PER_RETAINED_CUSTOMER = 1.4;
const AVERAGE_ORDER_VALUE = 820;
const RETENTION_CURVE = [1, 0.36, 0.27, 0.22, 0.19, 0.17, 0.15, 0.14, 0.13, 0.12, 0.115, 0.11];
const SIMULATED_JOB_ID = 'demo-job';
const PAIR_SCORE_STEP = 0.07;
const CANNIBALIZATION_PERIOD_DAYS = 90;
const HOURLY_LABELS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

// Her grup için sabit bir sapma (z-skoru): bir kısmı uyarı, biri kritik olsun.
const Z_SCORES = [0.4, -0.8, 1.2, 2.4, 3.6, -1.1, 0.2, 1.6, -2.3, 0.9];

function statusOf(zScore: number): AnomalyGroup['status'] {
  if (Math.abs(zScore) >= CRITICAL_Z) return 'critical';
  return Math.abs(zScore) >= WARNING_Z ? 'warning' : 'normal';
}

function groupSource(groupBy: string): Weighted[] {
  if (groupBy === 'platform') return PLATFORM_SHARES;
  if (groupBy === 'product') return TOP_PRODUCTS.map(({ product, weight }) => ({ label: product.name, weight }));
  return CATEGORY_SHARES;
}

function buildAnalysis({ query }: DemoRequest): AnomalyAnalysis {
  const groupBy = query.get('groupBy') ?? 'category';
  const windowDays = Number(query.get('days')) || DEFAULT_WINDOW_DAYS;
  const dailyOrders = dayMetrics(dayAgo(1), 1).orders;

  const groups: AnomalyGroup[] = groupSource(groupBy).map((item, index) => {
    const mean = Number((dailyOrders * item.weight).toFixed(1));
    const stdDev = Number(Math.max(0.8, mean * 0.22).toFixed(1));
    const zScore = Z_SCORES[index % Z_SCORES.length];
    const rng = createRng(index + 11);
    return {
      name: item.label,
      currentCount: Math.max(0, Math.round(mean + zScore * stdDev)),
      mean,
      stdDev,
      zScore,
      status: statusOf(zScore),
      activeDays: windowDays - rng.int(0, 6),
      hourly: HOURLY_LABELS.map((hour) => ({ hour, count: Math.max(0, Math.round((mean / 6) * rng.float(0.4, 1.6))) })),
    };
  }).sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

  return {
    groupBy,
    totalGroups: groups.length,
    anomalyCount: groups.filter((group) => group.status !== 'normal').length,
    windowDays,
    groups,
  };
}

function buildOverview(): AnomalyOverview {
  const groups = buildAnalysis({ query: new URLSearchParams() } as DemoRequest).groups;
  const critical = groups.filter((group) => group.status === 'critical').length;
  const warning = groups.filter((group) => group.status === 'warning').length;
  return { totalAnomalies: critical + warning, criticalCount: critical, warningCount: warning, unreadCount: 2, healthScore: HEALTH_SCORE };
}

function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  const cursor = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);
  while (cursor <= end && months.length < COHORT_MAX_MONTHS * 2) {
    months.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months.slice(-COHORT_MAX_MONTHS);
}

function buildCohort({ query }: DemoRequest): CohortAnalyticsResponse {
  const now = dayAgo(0);
  const from = query.get('from') || `${Number(now.slice(0, 4)) - 1}-01`;
  const to = query.get('to') || now.slice(0, 7);
  const months = monthsBetween(from, to).filter((month) => month <= now);
  const currentIndex = (month: string) => (Number(now.slice(0, 4)) - Number(month.slice(0, 4))) * 12 + Number(now.slice(5, 7)) - Number(month.slice(5, 7));

  const matrix: CohortMatrixRow[] = months.map((month) => {
    const rng = createRng(Number(month.replace(/-/g, '')));
    const cohortSize = rng.int(COHORT_MIN_SIZE, COHORT_MAX_SIZE);
    const offsets = Math.min(currentIndex(month), RETENTION_CURVE.length - 1);
    return {
      cohortMonth: `${month}T00:00:00`,
      cohortSize,
      cells: Array.from({ length: offsets + 1 }, (_, offset) => {
        const retentionRate = offset === 0 ? 1 : Number((RETENTION_CURVE[offset] * rng.float(0.85, 1.15)).toFixed(3));
        const customerCount = Math.round(cohortSize * retentionRate);
        const orderCount = Math.round(customerCount * ORDERS_PER_RETAINED_CUSTOMER);
        return { monthOffset: offset, customerCount, orderCount, totalRevenue: orderCount * AVERAGE_ORDER_VALUE, retentionRate };
      }),
    };
  });

  return {
    matrix,
    maxMonthOffset: Math.max(0, ...matrix.map((row) => row.cells.length - 1)),
    totalCohorts: matrix.length,
  };
}

function pairsFor(storeId: number, storeName: string): CannibalizationPair[] {
  const brands = BRAND_SHARES.map((share) => share.label);
  return brands.flatMap((first, i) => brands.slice(i + 1).map((second, j) => ({
    storeId,
    storeName,
    brand1: first,
    brand2: second,
    score: Number(Math.max(0.05, 0.62 - (i + j) * PAIR_SCORE_STEP - storeId * 0.01).toFixed(2)),
    dataPoints: 90 - (i + j) * 7,
  })));
}

function buildCannibalization({ stores }: DemoRequest): CannibalizationMatrix {
  const scoped = DEMO_STORES
    .map((store, index) => ({ store, storeId: index + 1 }))
    .filter(({ store }) => storeShare([store.code]) > 0 && (stores.length === 0 || stores.includes(store.code)));
  return {
    calculatedAt: ago(0, 5),
    lastJobRanAt: ago(0, 5),
    periodDays: CANNIBALIZATION_PERIOD_DAYS,
    multiStore: scoped.length > 1,
    brands: BRAND_SHARES.map((share) => share.label),
    matrix: scoped.flatMap(({ store, storeId }) => pairsFor(storeId, store.name)),
  };
}

export const dashboardAnalyticsRoutes: DemoRoute[] = [
  get('/anomaly/overview', buildOverview),
  get('/anomaly/analysis', buildAnalysis),
  post('/anomaly/trigger', () => ({ jobId: SIMULATED_JOB_ID, message: 'Anomali tespiti demo verisiyle yeniden hesaplandı.' })),
  get('/cohort-analytics', buildCohort),
  get('/cannibalization/matrix', buildCannibalization),
  post('/cannibalization/trigger', () => ({ jobId: SIMULATED_JOB_ID })),
  get('/cannibalization/job-status/:id', () => ({ state: 'Succeeded', finishedAt: new Date().toISOString() })),
];
