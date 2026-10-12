'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { monitoringUsersApi, type ActivityQuery } from '../../lib/api';

// Sistem İzleme > KULLANICILAR sorguları. Veriler dakikalar içinde değişir; 30 sn taze
// sayılması, sekmeler arasında gidip gelirken aynı isteğin tekrar atılmasını önler.
const STALE_MS = 30_000;

export interface SessionsQuery {
  days: number;
  userId?: number;
  page: number;
  pageSize: number;
}

const KEYS = {
  usersActivity: (days: number) => ['monitoring', 'users-activity', days] as const,
  sessions: (params: SessionsQuery) => ['monitoring', 'sessions', params] as const,
  activity: (params: ActivityQuery) => ['monitoring', 'activity', params] as const,
  activityDomains: ['monitoring', 'activity-domains'] as const,
  pageUsage: (days: number) => ['monitoring', 'page-usage', days] as const,
};

export function useUsersActivity(days: number) {
  return useQuery({
    queryKey: KEYS.usersActivity(days),
    queryFn: () => monitoringUsersApi.getUsersActivity(days),
    staleTime: STALE_MS,
  });
}

export function useSessions(params: SessionsQuery) {
  return useQuery({
    queryKey: KEYS.sessions(params),
    queryFn: () => monitoringUsersApi.getSessions(params),
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useActivity(params: ActivityQuery) {
  return useQuery({
    queryKey: KEYS.activity(params),
    queryFn: () => monitoringUsersApi.getActivity(params),
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

// Alan listesi sunucuda sabit bir dizi; oturum boyunca değişmez.
export function useActivityDomains() {
  return useQuery({
    queryKey: KEYS.activityDomains,
    queryFn: monitoringUsersApi.getActivityDomains,
    staleTime: Infinity,
  });
}

export function usePageUsage(days: number) {
  return useQuery({
    queryKey: KEYS.pageUsage(days),
    queryFn: () => monitoringUsersApi.getPageUsage(days),
    staleTime: STALE_MS,
  });
}
