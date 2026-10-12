'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hangfirePanelApi } from '../../lib/api';
import { describeError } from '../../lib/errors';
import { pushAlert } from '../../stores/alert-stack';

const JOBS_KEY = 'hangfire-panel-jobs';
const RUNTIME_KEY = 'hangfire-panel-runtime';
const HISTORY_KEY = 'hangfire-panel-history';

const KEYS = {
  jobs: (store?: string) => [JOBS_KEY, store ?? ''] as const,
  stores: ['hangfire-panel-stores'] as const,
  runtime: [RUNTIME_KEY] as const,
  history: (jobId: string) => [HISTORY_KEY, jobId] as const,
  access: ['hangfire-panel-access'] as const,
};

const JOBS_REFRESH_MS = 30_000;
const RUNTIME_REFRESH_MS = 15_000;
const STORES_STALE_MS = 5 * 60_000;
// Tetiklenen iş kuyruktan alınıp bitene kadar birkaç saniye geçer; hemen yenilemek
// "Kuyrukta" gösterir, kısa bir süre sonra yenilemek sonucu da yakalar.
const AFTER_ACTION_REFRESH_MS = 4_000;

export function useHangfireJobs(store?: string) {
  return useQuery({
    queryKey: KEYS.jobs(store),
    queryFn: () => hangfirePanelApi.getJobs(store),
    staleTime: JOBS_REFRESH_MS / 2,
    refetchInterval: JOBS_REFRESH_MS,
  });
}

export function useHangfireStores() {
  return useQuery({
    queryKey: KEYS.stores,
    queryFn: () => hangfirePanelApi.getStores(),
    staleTime: STORES_STALE_MS,
  });
}

// Sunucular, kuyruk derinliği, çalışan/takılı işler — kısa aralıkla yenilenir.
export function useHangfireRuntime() {
  return useQuery({
    queryKey: KEYS.runtime,
    queryFn: () => hangfirePanelApi.getRuntime(),
    staleTime: RUNTIME_REFRESH_MS / 2,
    refetchInterval: RUNTIME_REFRESH_MS,
  });
}

// İşlem yetkisi oturum boyunca değişmez; bir kez sorulur. Hata/yükleniyor → düğme yok
// (güvenli taraf; sunucu zaten 403 döner).
export function useHangfireAccess() {
  const query = useQuery({
    queryKey: KEYS.access,
    queryFn: () => hangfirePanelApi.getAccess(),
    staleTime: Infinity,
  });
  return query.data?.canOperate ?? false;
}

// Geçmiş yalnız çekmece açıkken çekilir (jobId null → sorgu kapalı).
export function useHangfireJobHistory(jobId: string | null) {
  return useQuery({
    queryKey: KEYS.history(jobId ?? ''),
    queryFn: () => hangfirePanelApi.getJobHistory(jobId ?? ''),
    enabled: jobId !== null,
  });
}

/** Panelin tüm sorgularını (liste, çalışma durumu, geçmiş) yeniler. */
export function useRefreshHangfirePanel() {
  const queryClient = useQueryClient();
  return () => {
    [JOBS_KEY, RUNTIME_KEY, HISTORY_KEY].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };
}

function useRefreshAfterAction() {
  const refresh = useRefreshHangfirePanel();
  return () => {
    refresh();
    setTimeout(refresh, AFTER_ACTION_REFRESH_MS);
  };
}

// Panelden manuel "şimdi çalıştır". Kayıtlı olmayan iş backend'de 409 ile reddedilir;
// mesajı olduğu gibi (Türkçe ProblemDetails) gösterilir.
export function useTriggerHangfireJob() {
  const refreshAfterAction = useRefreshAfterAction();
  return useMutation({
    // Hata burada anlamlı cümleyle gösteriliyor — global bildirim çift olmasın.
    meta: { silentError: true } as const,
    mutationFn: (job: { jobId: string; displayName: string }) => hangfirePanelApi.triggerJob(job.jobId),
    onSuccess: (result, job) => {
      pushAlert(`"${job.displayName}" kuyruğa alındı (#${result.hangfireJobId}).`, 'success');
      refreshAfterAction();
    },
    onError: (error) => {
      pushAlert(describeError(error), 'error');
    },
  });
}

export function useRetryHangfireRun() {
  const refreshAfterAction = useRefreshAfterAction();
  return useMutation({
    meta: { silentError: true } as const,
    mutationFn: (hangfireJobId: string) => hangfirePanelApi.retryRun(hangfireJobId),
    onSuccess: (result) => {
      pushAlert(`#${result.hangfireJobId} yeniden kuyruğa alındı.`, 'success');
      refreshAfterAction();
    },
    onError: (error) => {
      pushAlert(describeError(error), 'error');
    },
  });
}

export function useCreateHangfireDashboardSession() {
  return useMutation({
    meta: { silentError: true } as const,
    mutationFn: () => hangfirePanelApi.createDashboardSession(),
    onError: (error) => {
      pushAlert(describeError(error), 'error');
    },
  });
}
