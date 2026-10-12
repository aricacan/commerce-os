import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Ekrandan başlatılan arka plan işleri (ERP'den yenile vb.). Sayfa değişse ya da yenilense de
// iş sürüyor görünsün diye localStorage'da tutulur; durumu BackgroundJobWatcher sorgular.

export type BackgroundJobKind = 'channel-fees' | 'cost-source';

export interface TrackedJob {
  /** İşin ekrandaki kimliği (ör. "cost-source:3") — aynı iş iki kez başlatılmasın. */
  key: string;
  jobId: string;
  kind: BackgroundJobKind;
  label: string;
  startedAt: number;
}

export interface FinishedJob {
  key: string;
  kind: BackgroundJobKind;
  ok: boolean;
  result: unknown;
  error: string | null;
  finishedAt: number;
}

interface BackgroundJobsState {
  running: Record<string, TrackedJob>;
  finished: Record<string, FinishedJob>;
  track: (job: TrackedJob) => void;
  complete: (key: string, outcome: Omit<FinishedJob, 'key' | 'kind' | 'finishedAt'>) => void;
  dismiss: (key: string) => void;
}

export const useBackgroundJobs = create<BackgroundJobsState>()(
  persist(
    (set) => ({
      running: {},
      finished: {},
      track: (job) => set((s) => {
        const { [job.key]: _previous, ...finished } = s.finished;
        return { running: { ...s.running, [job.key]: job }, finished };
      }),
      complete: (key, outcome) => set((s) => {
        const job = s.running[key];
        if (!job) return s;
        const { [key]: _done, ...running } = s.running;
        return { running, finished: { ...s.finished, [key]: { key, kind: job.kind, finishedAt: Date.now(), ...outcome } } };
      }),
      dismiss: (key) => set((s) => {
        const { [key]: _gone, ...finished } = s.finished;
        return { finished };
      }),
    }),
    { name: 'demo-background-jobs', storage: createJSONStorage(() => localStorage) },
  ),
);
