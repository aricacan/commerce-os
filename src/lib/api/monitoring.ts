import { request } from './core';

// ─── Monitoring (sistem sağlığı / hata / denetim kaydı paneli) ────────────────
// Backend DTO'ları record olarak tanımlı (bkz. Modules/Monitoring), ASP.NET Core
// varsayılan camelCase JSON serileştirmesiyle alan adları burada birebir aynı.
export interface AuditLogEntryDto {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: number | null;
  userEmail: string | null;
  ipAddress: string | null;
  details: string | null;
  severity: 'Info' | 'Warning' | 'Critical';
  createdAt: string;
  correlationId: string | null;
}

export interface BusinessEventDto {
  id: number;
  eventType: string;
  description: string;
  payloadJson: string | null;
  storeId: number | null;
  createdAt: string;
  correlationId: string | null;
}

// Exceptions ve Slow Requests uçları aynı şekli döndürür (category "SlowRequest" ise
// yavaş istek kaydıdır).
export interface AppEventDto {
  id: number;
  occurredAtUtc: string;
  level: 'Warning' | 'Error' | 'Critical';
  category: string;
  message: string;
  stackTrace: string | null;
  requestPath: string | null;
  httpMethod: string | null;
  statusCode: number | null;
  durationMs: number | null;
  correlationId: string | null;
  userId: number | null;
}

export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AuditLogQuery {
  userId?: number;
  action?: string;
  severity?: 'Info' | 'Warning' | 'Critical';
  from?: string;
  to?: string;
  /** Virgülle ayrılmış EntityType listesi (ör. "SystemSetting,PagePermission") — sunucu
   * tarafında `AuditLogs.EntityType IN (...)` olarak uygulanır. Boşsa filtre yok. */
  entityTypes?: string;
  page?: number;
  pageSize?: number;
}

export interface BusinessEventsQuery {
  eventType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface ExceptionsQuery {
  level?: 'Warning' | 'Error' | 'Critical';
  category?: string;
  page?: number;
  pageSize?: number;
}

// Tek bir stok kaynağının kendi uyarı sayısı. BaseTrack (DEMO UK deposu) ile SentosTrack
// (Türkiye potansiyel stoğu) farklı şeyleri ölçer, bu yüzden TOPLANMAZLAR — her kaynak
// kendi satırında durur (bkz. backend OperationsStockSourceDto).
// available=false: o modülün sorgusu başarısız oldu; 0 değil "—" gösterilir.
export interface OperationsStockSourceDto {
  label: string;
  criticalCount: number;
  totalCount: number;
  available: boolean;
}

// "Operasyon" sekmesi özeti — teknik loglar değil, iş-uyarı sayıları (kritik stok,
// kategori uyuşmazlığı).
export interface OperationsSummaryDto {
  stockSources: OperationsStockSourceDto[];
  categoryMismatchCount: number;
  generatedAt: string;
}

// Sağlık kontrolünün SAKLANAN sonucu: state 'Ok' | 'Failing' | 'Passive'
// (Passive = kapalı ya da yapılandırılmamış — hata değil).
export interface HealthCheckResultDto {
  key: string;
  name: string;
  groupName: string;
  state: 'Ok' | 'Failing' | 'Passive';
  message: string | null;
  lastRunUtc: string;
  durationMs: number;
  consecutiveFailures: number;
}

// Aynı hatanın TEK satırı: kaç kez oldu, ilk/son ne zaman. Düz liste aynı bozukluğu
// yüzlerce kez gösteriyor, gerçekten yeni olan hata aralarında kayboluyordu.
export interface AppEventGroupDto {
  fingerprint: string | null;
  level: string;
  category: string | null;
  sampleMessage: string;
  requestPath: string | null;
  count: number;
  firstSeenUtc: string;
  lastSeenUtc: string;
  lastCorrelationId: string | null;
}

// Route başına gecikme özeti (bellekteki ölçüm penceresi). En kötüden iyiye sıralı gelir.
export interface RoutePerformanceDto {
  method: string;
  route: string;
  requestCount: number;
  averageMs: number;
  p95Ms: number;
  p99Ms: number;
  overBudgetCount: number;
  /** 5xx / 429 ile biten istek — "çalışmayan uç". */
  failedCount: number;
}

// Güvenlik kaydı: denetim tablosunun yalnız güvenlik eylemleri (giriş/çıkış, izin, rol, kullanıcı).
// `action` sunucuda önek eşleşmesidir: "PermissionDenied" hem gerçek reddi hem gölge kaydı getirir.
export interface SecurityLogQuery {
  action?: string;
  page?: number;
  pageSize?: number;
}

export const monitoringApi = {
  getHealthChecks: () => request<HealthCheckResultDto[]>('/monitoring/health-checks'),
  getExceptionGroups: (hours = 24, limit = 50) =>
    request<AppEventGroupDto[]>(`/monitoring/exception-groups?hours=${hours}&limit=${limit}`),
  runHealthChecks: () => request<HealthCheckResultDto[]>('/monitoring/health-checks/run', { method: 'POST' }),

  getRoutePerformance: (hours = 24) =>
    request<RoutePerformanceDto[]>(`/monitoring/route-performance?hours=${hours}`),

  getSecurityLog: (params?: SecurityLogQuery) => {
    const q = new URLSearchParams();
    if (params?.action) q.set('action', params.action);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    return request<PagedResultDto<AuditLogEntryDto>>(`/monitoring/security-log?${q}`);
  },

  getOperationsSummary: () => request<OperationsSummaryDto>('/monitoring/operations-summary'),

  getAuditLog: (params?: AuditLogQuery) => {
    const q = new URLSearchParams();
    if (params?.userId) q.set('userId', String(params.userId));
    if (params?.action) q.set('action', params.action);
    if (params?.severity) q.set('severity', params.severity);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.entityTypes) q.set('entityTypes', params.entityTypes);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    return request<PagedResultDto<AuditLogEntryDto>>(`/monitoring/audit-log?${q}`);
  },

  getBusinessEvents: (params?: BusinessEventsQuery) => {
    const q = new URLSearchParams();
    if (params?.eventType) q.set('eventType', params.eventType);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    return request<PagedResultDto<BusinessEventDto>>(`/monitoring/business-events?${q}`);
  },

  getExceptions: (params?: ExceptionsQuery) => {
    const q = new URLSearchParams();
    if (params?.level) q.set('level', params.level);
    if (params?.category) q.set('category', params.category);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    return request<PagedResultDto<AppEventDto>>(`/monitoring/exceptions?${q}`);
  },

};
