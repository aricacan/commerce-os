import { request } from './core';

// ─── Sistem İzleme > SENTETİK KONTROLLER ──────────────────────────────────────
// Sunucu tarafındaki "bot" sayfaları, iş akışlarını ve modülleri düzenli aralıkla dener;
// burası yalnız sonuçları okur. Uçlar yalnız platform işletmecisine (sahip kiracıda
// SuperAdmin) açık — diğerlerine 403. Alan adları camelCase, birebir.

export type SyntheticLayer = 'pages' | 'workflows' | 'modules' | 'browser';
/** Elle çalıştırılabilen katmanlar — tarayıcı katmanı yalnız GitHub'dan tetiklenir. */
export type SyntheticRunnableLayer = Exclude<SyntheticLayer, 'browser'>;
export type SyntheticCheckStatus = 'passed' | 'failed' | 'slow' | 'skipped';
export type SyntheticTrigger = 'schedule' | 'manual' | 'github';

/**
 * Mesai saati (Türkiye saati): bu aralıkta hiçbir katman zamanlanmış olarak çalışmaz; elle
 * çalıştırma serbest. Başlangıç > bitiş ise aralık gece yarısını aşar (22 → 06).
 */
export interface SyntheticQuietHoursDto {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

export interface SyntheticSettingsDto {
  enabled: boolean;
  pagesEnabled: boolean;
  workflowsEnabled: boolean;
  modulesEnabled: boolean;
  /** Eski backend sürümü göndermez (ön yüz önce yayına çıkar) — yoksa ayar paneli gizlenir. */
  quietHours?: SyntheticQuietHoursDto;
}

export interface SyntheticLayerRunDto {
  layer: SyntheticLayer;
  startedAt: string;
  finishedAt: string | null;
  trigger: SyntheticTrigger;
  /** Katman hiç koşmadıysa nedeni ("sistem yoğun" gibi); koştuysa null. */
  skipReason: string | null;
}

export interface SyntheticStepDto {
  name: string;
  status: SyntheticCheckStatus;
  durationMs: number;
  error: string | null;
}

export interface SyntheticCheckDto {
  /** "page:/orders", "workflow:manual-order", "module:radar-preview", "browser:/orders". */
  key: string;
  layer: SyntheticLayer;
  name: string;
  path: string | null;
  status: SyntheticCheckStatus;
  failedStep: string | null;
  error: string | null;
  durationMs: number;
  finishedAt: string;
  steps: SyntheticStepDto[];
  /** Tarayıcı satırında modül anahtarı ("radar"); diğerlerinde yoksa ekran yoldan türetir. */
  module?: string | null;
  /** Tarayıcı satırında modül içi sekme ("companies"). */
  tab?: string | null;
  /** Sorunlu tarayıcı satırında ekran görüntüsünü taşıyan GitHub artifact sayfası. */
  artifactUrl?: string | null;
}

export interface SyntheticOverviewDto {
  settings: SyntheticSettingsDto;
  /** Botun giriş yapacağı hesap hazır mı; değilse kontroller koşamaz. */
  botReady: boolean;
  passed: number;
  total: number;
  lastRunAt: string | null;
  lastRuns: SyntheticLayerRunDto[];
  checks: SyntheticCheckDto[];
  /** Şu an mesai saati mi (zamanlanmış kontroller çalışmıyor). Eski backend göndermez. */
  inQuietHours?: boolean;
}

export interface SyntheticCheckRunDto {
  runId: string;
  trigger: SyntheticTrigger;
  status: SyntheticCheckStatus;
  failedStep: string | null;
  error: string | null;
  durationMs: number;
  finishedAt: string;
  steps: SyntheticStepDto[];
  artifactUrl?: string | null;
}

export interface SyntheticAccessDto {
  canView: boolean;
}

export interface SyntheticRunRequestDto {
  key?: string;
  layer?: SyntheticRunnableLayer;
}

export interface SyntheticRunReferenceDto {
  jobId: string;
}

const BASE_PATH = '/synthetic-checks';

export const syntheticChecksApi = {
  getAccess: () => request<SyntheticAccessDto>(`${BASE_PATH}/access`),
  getOverview: () => request<SyntheticOverviewDto>(BASE_PATH),
  getHistory: (key: string) =>
    request<SyntheticCheckRunDto[]>(`${BASE_PATH}/history?key=${encodeURIComponent(key)}`),
  run: (body: SyntheticRunRequestDto) =>
    request<SyntheticRunReferenceDto>(`${BASE_PATH}/run`, { method: 'POST', body: JSON.stringify(body) }),
  updateSettings: (settings: SyntheticSettingsDto) =>
    request<void>(`${BASE_PATH}/settings`, { method: 'PUT', body: JSON.stringify(settings) }),
};
