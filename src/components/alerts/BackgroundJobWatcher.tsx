'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backgroundJobsApi } from '../../lib/api/background-jobs';
import type { FeeRefreshResult } from '../../lib/api/channel-fees';
import type { CostSourceSummary } from '../../lib/api/product-cost';
import { pushAlert } from '../../stores/alert-stack';
import { useAuthStore } from '../../stores/auth';
import { useBackgroundJobs, type BackgroundJobKind, type TrackedJob } from '../../stores/background-jobs';

const POLL_INTERVAL_MS = 3_000;
// İş bu kadar süre hiç başlamazsa işçi çalışmıyor demektir — sonsuza dek beklenmez.
const MAX_QUEUE_WAIT_MS = 2 * 60_000;
// Başlamış bir işin bitmesi için üst sınır (en uzun ERP yenilemesi birkaç dakika sürer).
const MAX_RUN_MS = 30 * 60_000;
const QUEUED_STATES = new Set(['Enqueued', 'Scheduled', 'Awaiting']);
const FAILED_STATES = new Set(['Failed', 'Deleted']);

// İş türüne göre: bitince yenilenecek listeler ve kullanıcıya gösterilecek özet.
const KINDS: Record<BackgroundJobKind, { queryKeys: string[][]; describe: (job: TrackedJob, result: unknown) => string }> = {
  'channel-fees': {
    queryKeys: [['channel-fees'], ['orders']],
    describe: (_job, result) => {
      const updated = ((result as FeeRefreshResult[] | null) ?? []).reduce((sum, r) => sum + (r.ordersUpdated ?? 0), 0);
      return `Kesintiler ERP'den yenilendi · ${updated} sipariş güncellendi.`;
    },
  },
  'cost-source': {
    queryKeys: [['cost-sources'], ['product-costs']],
    describe: (job, result) => {
      const summary = result as CostSourceSummary | null;
      return summary
        ? `${summary.displayName}: ERP'den yenilendi · ${summary.withCost}/${summary.productCount} ürünün maliyeti var.`
        : `${job.label}: ERP'den yenilendi.`;
    },
  },
};

// Uygulama genelinde tek izleyici: başlatılan işleri sayfa değişse de sorgular, bitince
// listeleri yeniler ve sonucu bildirir.
export function BackgroundJobWatcher() {
  const queryClient = useQueryClient();
  const running = useBackgroundJobs((s) => s.running);
  const complete = useBackgroundJobs((s) => s.complete);
  const polling = useRef(false);
  // Oturum açılmadan sorgu atılmaz: açılıştaki 401 kendi token yenilemesini tetikleyip
  // uygulamanın oturum kurulumuyla yarışabilir.
  const signedIn = useAuthStore((s) => s.user !== null && !s.isLoading);
  const hasJobs = Object.keys(running).length > 0;

  useEffect(() => {
    if (!hasJobs || !signedIn) return;

    const finish = (job: TrackedJob, ok: boolean, result: unknown, error: string | null) => {
      complete(job.key, { ok, result, error });
      if (ok) {
        KINDS[job.kind].queryKeys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
        pushAlert(KINDS[job.kind].describe(job, result), 'success', 6000);
      } else {
        pushAlert(`${job.label}: ${error}`, 'error', 8000);
      }
    };

    const check = async (job: TrackedJob) => {
      const elapsed = Date.now() - job.startedAt;
      try {
        const status = await backgroundJobsApi.status(job.jobId);
        if (status.state === 'Succeeded') return finish(job, true, status.result, null);
        if (FAILED_STATES.has(status.state)) return finish(job, false, null, status.error ?? 'İş başarısız oldu.');
        if (QUEUED_STATES.has(status.state) && elapsed > MAX_QUEUE_WAIT_MS)
          return finish(job, false, null, 'iş kuyrukta bekliyor ama başlamadı — arka plan işçisi kapalı olabilir.');
        if (elapsed > MAX_RUN_MS) return finish(job, false, null, 'iş beklenenden uzun sürüyor; sonucu birkaç dakika sonra kontrol edin.');
      } catch (err) {
        // Sunucu işi tanımıyorsa (silinmiş/yeniden kurulmuş depo) izlemeyi bırak; geçici ağ hatasında devam et.
        if (elapsed > MAX_QUEUE_WAIT_MS) finish(job, false, null, err instanceof Error ? err.message : 'durum okunamadı.');
      }
    };

    const tick = async () => {
      if (polling.current) return;
      polling.current = true;
      try {
        await Promise.all(Object.values(useBackgroundJobs.getState().running).map(check));
      } finally {
        polling.current = false;
      }
    };

    void tick();
    const timer = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasJobs, signedIn, complete, queryClient]);

  return null;
}
