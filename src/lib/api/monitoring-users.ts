import { request } from './core';
import type { PagedResultDto } from './monitoring';

// ─── Sistem İzleme > KULLANICILAR ─────────────────────────────────────────────
// Backend: Modules/Monitoring MonitoringUsersController. Alan adları camelCase, birebir.

export interface ActivityChangeDto {
  field: string;
  label: string;
  old: string | null;
  new: string | null;
}

/** "Ahmet · manuel sipariş MS-0042 oluşturdu" — özet yapan kişiyi içermez. */
export interface ActivityEntryDto {
  id: number;
  createdAt: string;
  actorUserId: number | null;
  actorName: string;
  actorEmail: string | null;
  domain: string;
  eventType: string;
  summary: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  changes: ActivityChangeDto[];
  correlationId: string | null;
}

export interface ActivityQuery {
  actorUserId?: number;
  domain?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export type SessionStatus = 'Open' | 'Logout' | 'Timeout';

export interface UserSessionDto {
  id: number;
  userId: number;
  userName: string;
  userEmail: string | null;
  startedAt: string;
  lastSeenAt: string;
  /** Çıkış anı ya da (nabız kesildiyse) son nabız; açık oturumda null. */
  endedAt: string | null;
  status: SessionStatus;
  activeSeconds: number;
  pageViews: number;
  actions: number;
  ipAddress: string | null;
  /** "Chrome · Windows" */
  device: string | null;
}

export interface UserActivitySummaryDto {
  userId: number;
  userName: string;
  userEmail: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  sessions: number;
  activeSeconds: number;
  pageViews: number;
  actions: number;
  /** Aktivite Akışı'na düşen iş işlemi sayısı (sipariş, fiyat, cari…). */
  businessActions: number;
}

/** Yol normalleştirilmiştir: kayıt kimlikleri "[id]" olur (/orders/[id]). */
export interface PageUsageDto {
  path: string;
  views: number;
  uniqueUsers: number;
  avgDurationMs: number;
  lastViewedAt: string | null;
  clientErrors: number;
}

export const monitoringUsersApi = {
  getActivity: (params?: ActivityQuery) => {
    const q = new URLSearchParams();
    if (params?.actorUserId) q.set('actorUserId', String(params.actorUserId));
    if (params?.domain) q.set('domain', params.domain);
    if (params?.search) q.set('search', params.search);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    return request<PagedResultDto<ActivityEntryDto>>(`/monitoring/activity?${q}`);
  },

  getActivityDomains: () => request<string[]>('/monitoring/activity/domains'),

  getSessions: (params: { userId?: number; days: number; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams({ days: String(params.days) });
    if (params.userId) q.set('userId', String(params.userId));
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    return request<PagedResultDto<UserSessionDto>>(`/monitoring/sessions?${q}`);
  },

  getUsersActivity: (days: number) =>
    request<UserActivitySummaryDto[]>(`/monitoring/users-activity?days=${days}`),

  getPageUsage: (days: number) =>
    request<PageUsageDto[]>(`/monitoring/page-usage?days=${days}`),
};
