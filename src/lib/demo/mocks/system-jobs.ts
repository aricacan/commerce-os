// Arka plan işleri: Hangfire paneli, iş durumu sorgusu ve dışa aktarım işleri.
import type {
  HangfireJobInfoDto,
  HangfireJobRunDto,
  HangfireRuntimeDto,
  HangfireStoreOptionDto,
} from '../../api/hangfire';
import { DEMO_STORES } from '../data/core';
import { DEMO_BLOCKED_MESSAGE } from '../config';
import { get, type DemoRoute } from '../router';
import { ago, createRng } from '../seed';

const HISTORY_LENGTH = 10;
const WORKER_COUNT = 8;
const STUCK_THRESHOLD_MINUTES = 30;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;

// [kimlik, ad, açıklama, cron (UTC), kapsam]
type JobSeed = [string, string, string, string, string];

const JOB_SEEDS: JobSeed[] = [
  ['order-sync', 'Sipariş eşitleme', 'Pazaryeri ve ERP siparişlerini çeker.', '*/5 * * * *', 'Tüm mağazalar'],
  ['stock-sync', 'Stok eşitleme', 'ERP stoklarını pazaryerlerine gönderir.', '*/15 * * * *', 'Tüm mağazalar'],
  ['price-sync', 'Fiyat eşitleme', 'Güncel satış fiyatlarını kanallara yazar.', '0 * * * *', 'Tüm mağazalar'],
  ['currency-rates', 'Döviz kurları', 'GBP/TRY ve diğer kurları günceller.', '30 6 * * *', 'Sistem'],
  ['daily-report-mail', 'Günlük özet e-postası', 'Yönetim özetini e-posta ile gönderir.', '30 5 * * *', 'Sistem'],
  ['invoice-generation', 'Günlük fatura üretimi', 'Kargolanan siparişlerin faturalarını oluşturur.', '0 18 * * *', 'Tüm mağazalar'],
  ['anomaly-scan', 'Anomali taraması', 'Satış ve stok sapmalarını arar.', '0 */3 * * *', 'Tüm mağazalar'],
  ['order-lifecycle', 'Sipariş yaşam döngüsü', 'Teslim edilen siparişleri tamamlandı yapar.', '15 1 * * *', 'Tüm mağazalar'],
  ['monitoring-health', 'Sağlık kontrolleri', 'Entegrasyon sağlık sonuçlarını yeniler.', '*/10 * * * *', 'Sistem'],
];

const rng = createRng(2203);

function intervalMinutes(cron: string): number {
  const stepMatch = /^\*\/(\d+)/.exec(cron);
  if (stepMatch) return Number(stepMatch[1]);
  return cron.split(' ')[1].includes('*') ? MINUTES_PER_HOUR : HOURS_PER_DAY * MINUTES_PER_HOUR;
}

function buildRun(jobId: string, minutesAgo: number, index: number): HangfireJobRunDto {
  const durationMs = rng.int(300, 42000);
  const finished = ago(0, 0, minutesAgo);
  return {
    hangfireJobId: `${jobId}-${1000 - index}`,
    status: 'succeeded',
    startedAtUtc: ago(0, 0, minutesAgo + 1),
    finishedAtUtc: finished,
    durationMs,
    reason: null,
    error: null,
  };
}

function buildJobs(): HangfireJobInfoDto[] {
  return JOB_SEEDS.map(([jobId, displayName, apiDescription, cronExpression, scopeTag]) => {
    const minutes = intervalMinutes(cronExpression);
    const lastRun = buildRun(jobId, rng.int(1, Math.max(2, minutes - 1)), 0);
    return {
      jobId,
      displayName,
      apiDescription,
      cronExpression,
      scopeTag,
      affectedStoreNames: scopeTag === 'Sistem' ? [] : DEMO_STORES.map((store) => store.name),
      isRegistered: true,
      lastExecutionUtc: lastRun.finishedAtUtc,
      lastStatus: 'succeeded',
      nextExecutionUtc: ago(0, 0, -rng.int(1, minutes)),
      lastRun,
      registrationError: null,
    };
  });
}

const STORE_OPTIONS: HangfireStoreOptionDto[] = DEMO_STORES.map((store) => ({ code: store.code, name: store.name }));

const buildRuntime = (): HangfireRuntimeDto => ({
  serverStatus: { isActive: true, serverCount: 1, lastHeartbeatUtc: ago(0, 0, 0) },
  servers: [
    { name: 'demo-worker-1', workerCount: WORKER_COUNT, queues: ['critical', 'default'], startedAtUtc: ago(6), heartbeatUtc: ago(0, 0, 0) },
  ],
  queues: [
    { name: 'critical', length: 0, fetched: 0 },
    { name: 'default', length: 2, fetched: 1 },
  ],
  processing: [
    { hangfireJobId: 'stock-sync-1042', recurringJobId: 'stock-sync', displayName: 'Stok eşitleme', startedAtUtc: ago(0, 0, 1), runningSeconds: 48, serverId: 'demo-worker-1', serverAlive: true, isStuck: false },
  ],
  failedCount: 0,
  stuckThresholdMinutes: STUCK_THRESHOLD_MINUTES,
});

export const systemJobRoutes: DemoRoute[] = [
  get('/hangfire-panel/jobs/:jobId/history', (req) => {
    const minutes = intervalMinutes(JOB_SEEDS.find(([jobId]) => jobId === req.params.jobId)?.[3] ?? '0 * * * *');
    return Array.from({ length: HISTORY_LENGTH }, (_, index) => buildRun(req.params.jobId, (index + 1) * minutes, index + 1));
  }),
  get('/hangfire-panel/jobs', buildJobs),
  get('/hangfire-panel/stores', () => STORE_OPTIONS),
  get('/hangfire-panel/runtime', buildRuntime),
  get('/hangfire-panel/access', () => ({ canOperate: true })),

  // Demo'da uzun iş başlatılamadığı için sorgulanan her iş tamamlanmış görünür.
  get('/background-jobs/:jobId', () => ({
    state: 'Succeeded',
    startedAt: ago(0, 0, 1),
    finishedAt: ago(0, 0, 0),
    result: null,
    error: null,
  })),
  get('/export-jobs/:jobId', () => ({ state: 'Failed', errorMessage: DEMO_BLOCKED_MESSAGE })),
];
