'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  monitoringApi,
  type AuditLogQuery,
  type BusinessEventsQuery,
  type ExceptionsQuery,
  type SecurityLogQuery,
} from '../../lib/api';

// Panolar "canlı" takip için otomatik yenilenebilir; kapalıyken (undefined) React Query
// yalnızca odak/mount'ta tazeler.
const KEYS = {
  healthChecks: ['monitoring', 'health-checks'] as const,
  exceptionGroups: (hours: number, limit: number) => ['monitoring', 'exception-groups', hours, limit] as const,
  routePerformance: (hours: number) => ['monitoring', 'route-performance', hours] as const,
  securityLog: (params: SecurityLogQuery) => ['monitoring', 'security-log', params] as const,
  operationsSummary: ['monitoring-operations-summary'] as const,
  auditLog: (params?: AuditLogQuery) => ['monitoring-audit-log', params ?? {}] as const,
  businessEvents: (params?: BusinessEventsQuery) => ['monitoring-business-events', params ?? {}] as const,
  exceptions: (params?: ExceptionsQuery) => ['monitoring-exceptions', params ?? {}] as const,
};

// Sağlık kontrollerinin SAKLANAN son sonucu. "Şimdi çalıştır" sonucu bu anahtara yazar
// (bkz. HealthChecksTab) — Genel Bakış kartı da aynı önbelleği okur.
export const HEALTH_CHECKS_KEY = KEYS.healthChecks;

export function useHealthChecks() {
  return useQuery({
    queryKey: KEYS.healthChecks,
    queryFn: monitoringApi.getHealthChecks,
    refetchInterval: 60_000,
  });
}

export function useExceptionGroups(hours: number, limit: number) {
  return useQuery({
    queryKey: KEYS.exceptionGroups(hours, limit),
    queryFn: () => monitoringApi.getExceptionGroups(hours, limit),
    staleTime: 15_000,
  });
}

export function useRoutePerformance(hours: number) {
  return useQuery({
    queryKey: KEYS.routePerformance(hours),
    queryFn: () => monitoringApi.getRoutePerformance(hours),
    staleTime: 30_000,
  });
}

export function useSecurityLog(params: SecurityLogQuery) {
  return useQuery({
    queryKey: KEYS.securityLog(params),
    queryFn: () => monitoringApi.getSecurityLog(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

// "Operasyon" sekmesi özeti (kritik stok + kategori uyuşmazlığı). Ayrı sorgu: backend'de
// de ayrı uç, başka modüllerin veritabanına gidiyor.
export function useOperationsSummary(refetchInterval?: number) {
  return useQuery({
    queryKey: KEYS.operationsSummary,
    queryFn: () => monitoringApi.getOperationsSummary(),
    staleTime: 15_000,
    refetchInterval,
  });
}

export function useAuditLog(params?: AuditLogQuery) {
  return useQuery({
    queryKey: KEYS.auditLog(params),
    queryFn: () => monitoringApi.getAuditLog(params),
    staleTime: 15_000,
  });
}

export function useBusinessEvents(params?: BusinessEventsQuery) {
  return useQuery({
    queryKey: KEYS.businessEvents(params),
    queryFn: () => monitoringApi.getBusinessEvents(params),
    staleTime: 15_000,
  });
}

export function useExceptions(params?: ExceptionsQuery) {
  return useQuery({
    queryKey: KEYS.exceptions(params),
    queryFn: () => monitoringApi.getExceptions(params),
    staleTime: 15_000,
  });
}
