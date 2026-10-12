import { request } from './core';

// ─── Arka plan işleri (backend BackgroundJobsController) ──────────────────────
// Uzun işler (ERP'den yenileme vb.) HTTP isteğinde çalışınca zaman aşımına düşüyordu; artık
// sunucu işi kuyruğa alıp kimliğini döner, ekran durumunu sorgular (bkz. BackgroundJobWatcher).

export interface BackgroundJobStarted {
  jobId: string;
}

export interface BackgroundJobStatus {
  state: string;
  startedAt: string | null;
  finishedAt: string | null;
  result: unknown;
  error: string | null;
}

export const backgroundJobsApi = {
  status: (jobId: string) => request<BackgroundJobStatus>(`/background-jobs/${encodeURIComponent(jobId)}`),
};
