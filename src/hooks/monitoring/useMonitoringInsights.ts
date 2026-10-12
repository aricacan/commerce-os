'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  monitoringInsightsApi,
  type InsightFixRequest,
  type InsightStatus,
  type MonitoringInsightsViewDto,
  type NavPageRefDto,
} from '../../lib/api';

// Sistem İzleme > ÖNERİLER. Analiz günde en fazla birkaç kez değişir (sabah otomatik +
// elle "Analiz et"); dakikalık tazeleme gereksiz — 5 dk taze sayılır.
const STALE_MS = 5 * 60_000;

const KEYS = {
  all: ['monitoring', 'insights'] as const,
  latest: (periodDays: number) => ['monitoring', 'insights', 'latest', periodDays] as const,
  summary: ['monitoring', 'insights', 'summary'] as const,
};

// Uçlar yalnız SuperAdmin'e açık; bu kancaları kullanan bileşenler de yalnız ona çizilir
// (bkz. visibleMonitoringTabs) — diğer rollerde istek hiç atılmaz.
export function useInsights(periodDays: number) {
  return useQuery({
    queryKey: KEYS.latest(periodDays),
    queryFn: () => monitoringInsightsApi.getLatest(periodDays),
    staleTime: STALE_MS,
  });
}

export function useInsightSummary() {
  return useQuery({
    queryKey: KEYS.summary,
    queryFn: monitoringInsightsApi.getSummary,
    staleTime: STALE_MS,
  });
}

export function useAnalyzeInsights(periodDays: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (navPages: NavPageRefDto[]) => monitoringInsightsApi.analyze(periodDays, navPages),
    onSuccess: (view: MonitoringInsightsViewDto) => {
      qc.setQueryData(KEYS.latest(periodDays), view);
      void qc.invalidateQueries({ queryKey: KEYS.summary });
    },
  });
}

export function useUpdateInsightStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: InsightStatus }) => monitoringInsightsApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

// ── Düzelt ─────────────────────────────────────────────────────────────────
// Önizleme hiçbir şey yazmaz ama CANLI durumu okur: her açılışta yeniden istenir, önbelleğe
// alınmaz (dakikalar önceki "uygulanabilir" cevabı onay penceresinde gösterilmemeli).
export function useInsightFixPreview(insightId: number, evidenceFingerprint: string) {
  return useQuery({
    queryKey: [...KEYS.all, 'fix-preview', insightId, evidenceFingerprint] as const,
    queryFn: () => monitoringInsightsApi.previewFix({ insightId, evidenceFingerprint, choice: null }),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

// Uygulama/geri alma kartın sonucunu ve geçmiş listesini değiştirir — öneri görünümü tazelenir.
export function useApplyInsightFix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InsightFixRequest) => monitoringInsightsApi.applyFix(body),
    onSettled: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUndoInsightFix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fixId: number) => monitoringInsightsApi.undoFix(fixId),
    onSettled: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
