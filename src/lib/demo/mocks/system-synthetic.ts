// Sistem İzleme > Sentetik Kontroller: bot kontrol sonuçları ve geçmişi.
import type {
  SyntheticCheckDto,
  SyntheticCheckRunDto,
  SyntheticLayer,
  SyntheticOverviewDto,
  SyntheticSettingsDto,
  SyntheticStepDto,
} from '../../api/synthetic-checks';
import { get, type DemoRoute } from '../router';
import { ago, createRng } from '../seed';

const HISTORY_LENGTH = 12;
const SLOW_THRESHOLD_MS = 1500;
const QUIET_START_HOUR = 9;
const QUIET_END_HOUR = 19;

const SETTINGS: SyntheticSettingsDto = {
  enabled: true,
  pagesEnabled: true,
  workflowsEnabled: true,
  modulesEnabled: true,
  quietHours: { enabled: true, startHour: QUIET_START_HOUR, endHour: QUIET_END_HOUR },
};

// [anahtar, katman, ad, yol, süre ms]
type CheckSeed = [string, SyntheticLayer, string, string | null, number];

const CHECK_SEEDS: CheckSeed[] = [
  ['page:/dashboard', 'pages', 'Pano', '/dashboard', 420],
  ['page:/orders', 'pages', 'Siparişler', '/orders', 780],
  ['page:/products', 'pages', 'Ürünler', '/products', 640],
  ['page:/customers', 'pages', 'Müşteriler', '/customers', 510],
  ['page:/finance/pnl', 'pages', 'Kâr-Zarar', '/finance/pnl', 1720],
  ['page:/logistics', 'pages', 'Lojistik', '/logistics', 560],
  ['page:/omnichannel', 'pages', 'Omnichannel', '/omnichannel', 690],
  ['page:/system/users', 'pages', 'Kullanıcılar', '/system/users', 330],
  ['workflow:manual-order', 'workflows', 'Manuel sipariş akışı', null, 1210],
  ['workflow:price-update', 'workflows', 'Fiyat güncelleme akışı', null, 940],
  ['workflow:return-approval', 'workflows', 'İade onay akışı', null, 870],
  ['module:omnichannel-bot', 'modules', 'Omnichannel bot yanıtı', null, 1330],
  ['module:erp-sync', 'modules', 'ERP stok eşitleme', null, 980],
  ['module:radar-preview', 'modules', 'B2B Outreach önizleme', null, 760],
  ['browser:/orders', 'browser', 'Tarayıcı · Siparişler', '/orders', 2100],
];

function stepsFor(durationMs: number): SyntheticStepDto[] {
  return [
    { name: 'Sayfa/uç isteği', status: 'passed', durationMs: Math.round(durationMs * 0.6), error: null },
    { name: 'Yanıt doğrulama', status: 'passed', durationMs: Math.round(durationMs * 0.3), error: null },
    { name: 'Veri tutarlılığı', status: 'passed', durationMs: Math.round(durationMs * 0.1), error: null },
  ];
}

const buildChecks = (): SyntheticCheckDto[] => {
  const rng = createRng(9091);
  return CHECK_SEEDS.map(([key, layer, name, path, durationMs]) => ({
    key,
    layer,
    name,
    path,
    status: durationMs > SLOW_THRESHOLD_MS ? 'slow' : 'passed',
    failedStep: null,
    error: null,
    durationMs,
    finishedAt: ago(0, 0, rng.int(2, 40)),
    steps: stepsFor(durationMs),
    module: layer === 'browser' ? 'orders' : null,
    tab: null,
    artifactUrl: null,
  }));
};

function buildOverview(): SyntheticOverviewDto {
  const checks = buildChecks();
  return {
    settings: SETTINGS,
    botReady: true,
    passed: checks.filter((check) => check.status === 'passed').length,
    total: checks.length,
    lastRunAt: ago(0, 0, 4),
    lastRuns: (['pages', 'workflows', 'modules', 'browser'] as const).map((layer, index) => ({
      layer,
      startedAt: ago(0, 0, 6 + index * 11),
      finishedAt: ago(0, 0, 5 + index * 11),
      trigger: layer === 'browser' ? 'github' : 'schedule',
      skipReason: null,
    })),
    checks,
    inQuietHours: false,
  };
}

function buildHistory(key: string): SyntheticCheckRunDto[] {
  const seed = CHECK_SEEDS.find(([checkKey]) => checkKey === key);
  const baseDuration = seed?.[4] ?? 600;
  const rng = createRng(key.length * 131);
  return Array.from({ length: HISTORY_LENGTH }, (_, index) => {
    const durationMs = Math.round(baseDuration * rng.float(0.8, 1.25));
    return {
      runId: `run-${HISTORY_LENGTH - index}`,
      trigger: index % 4 === 0 ? 'manual' : 'schedule',
      status: durationMs > SLOW_THRESHOLD_MS ? 'slow' : 'passed',
      failedStep: null,
      error: null,
      durationMs,
      finishedAt: ago(0, index * 2, rng.int(0, 30)),
      steps: stepsFor(durationMs),
      artifactUrl: null,
    };
  });
}

export const systemSyntheticRoutes: DemoRoute[] = [
  get('/synthetic-checks/access', () => ({ canView: true })),
  get('/synthetic-checks/history', (req) => buildHistory(req.query.get('key') ?? '')),
  get('/synthetic-checks', buildOverview),
];
