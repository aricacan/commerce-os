import { getBackendUrl, request } from './core';

// ─── Hangfire Panel (tüm zamanlanmış işlerin izleme paneli) ───────────────────
// Backend DTO'ları record olarak tanımlı (bkz. HangfirePanel.Application/DTOs), ASP.NET Core
// varsayılan camelCase JSON serileştirmesiyle alan adları burada birebir aynı.

/** Backend'deki HangfireRunStatus sabitleriyle birebir. */
export type HangfireRunStatus =
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'processing'
  | 'enqueued'
  | 'retrying'
  | 'scheduled'
  | 'deleted'
  | 'never'
  | 'unregistered'
  | 'unknown';

export interface HangfireJobErrorDto {
  type: string | null;
  message: string | null;
  /** Yığın (stack trace) — açılır bölümde gösterilir. */
  details: string | null;
}

export interface HangfireJobRunDto {
  hangfireJobId: string;
  status: HangfireRunStatus;
  startedAtUtc: string | null;
  finishedAtUtc: string | null;
  durationMs: number | null;
  reason: string | null;
  error: HangfireJobErrorDto | null;
}

// Ön yüz (Vercel) backend'den (VPS) önce yayına çıkar: arada eski backend bu alanları
// göndermez, lastStatus da ham Hangfire durum adı olabilir. Yeni alanlar bu yüzden
// opsiyonel okunur (bkz. 11 Eyl canlı çökmesi).
export interface HangfireJobInfoDto {
  jobId: string;
  displayName: string;
  apiDescription: string;
  cronExpression: string;
  scopeTag: string;
  affectedStoreNames: string[];
  isRegistered?: boolean;
  lastExecutionUtc: string | null;
  lastStatus: HangfireRunStatus | string;
  nextExecutionUtc: string | null;
  lastRun?: HangfireJobRunDto | null;
  registrationError?: string | null;
}

export interface HangfireStoreOptionDto {
  code: string;
  name: string;
}

export interface HangfireServerStatusDto {
  isActive: boolean;
  serverCount: number;
  lastHeartbeatUtc: string | null;
}

export interface HangfireServerDto {
  name: string;
  workerCount: number;
  queues: string[];
  startedAtUtc: string;
  heartbeatUtc: string | null;
}

export interface HangfireQueueDto {
  name: string;
  length: number;
  fetched: number | null;
}

export interface HangfireProcessingJobDto {
  hangfireJobId: string;
  /** null → elle kuyruğa alınmış tek seferlik iş. */
  recurringJobId: string | null;
  displayName: string;
  startedAtUtc: string | null;
  runningSeconds: number;
  serverId: string | null;
  serverAlive: boolean;
  isStuck: boolean;
}

export interface HangfireRuntimeDto {
  serverStatus: HangfireServerStatusDto;
  servers: HangfireServerDto[];
  queues: HangfireQueueDto[];
  processing: HangfireProcessingJobDto[];
  failedCount: number;
  stuckThresholdMinutes: number;
}

// Çalıştır / Yeniden dene / Hangfire'da aç düğmeleri: kurulumun sahibi kiracıda SuperAdmin mi.
export interface HangfirePanelAccessDto {
  canOperate: boolean;
}

export interface HangfireRunReferenceDto {
  hangfireJobId: string;
}

export interface HangfireDashboardSessionDto {
  code: string;
  expiresInSeconds: number;
}

const DASHBOARD_LOGIN_PATH = '/hangfire-login';

export const hangfirePanelApi = {
  getJobs: (store?: string) =>
    request<HangfireJobInfoDto[]>(`/hangfire-panel/jobs${store ? `?store=${encodeURIComponent(store)}` : ''}`),
  getStores: () => request<HangfireStoreOptionDto[]>('/hangfire-panel/stores'),
  getRuntime: () => request<HangfireRuntimeDto>('/hangfire-panel/runtime'),
  getAccess: () => request<HangfirePanelAccessDto>('/hangfire-panel/access'),
  getJobHistory: (jobId: string) =>
    request<HangfireJobRunDto[]>(`/hangfire-panel/jobs/${encodeURIComponent(jobId)}/history`),
  triggerJob: (jobId: string) =>
    request<HangfireRunReferenceDto>(`/hangfire-panel/jobs/${encodeURIComponent(jobId)}/trigger`, { method: 'POST' }),
  retryRun: (hangfireJobId: string) =>
    request<HangfireRunReferenceDto>(`/hangfire-panel/runs/${encodeURIComponent(hangfireJobId)}/retry`, { method: 'POST' }),
  createDashboardSession: () =>
    request<HangfireDashboardSessionDto>('/hangfire-panel/dashboard-session', { method: 'POST' }),
};

/**
 * Gömülü /hangfire paneline giriş adresi — API alan adında (çerez orada yazılır, ön yüz
 * alan adında değil). `returnPath` yalnız /hangfire altındaki bir sayfa olabilir; backend
 * başka bir yolu yok sayar.
 */
export function hangfireDashboardLoginUrl(code: string, returnPath?: string): string {
  const params = new URLSearchParams({ code });
  if (returnPath) params.set('returnPath', returnPath);
  return `${getBackendUrl(DASHBOARD_LOGIN_PATH)}?${params.toString()}`;
}

/** Gömülü panelde tek bir çalışmanın ayrıntı sayfası. */
export function hangfireRunDetailsPath(hangfireJobId: string): string {
  return `/hangfire/jobs/details/${encodeURIComponent(hangfireJobId)}`;
}
