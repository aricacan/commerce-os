'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sentosTrackApi } from '@/lib/api/sentostrack';

// Tüm sorgular mağaza koduna (store) göre ayrı cache'lenir — StoreA ve StoreB karışmaz.

export function useSentosTrackOverview() {
  return useQuery({
    queryKey: ['sentostrack-overview'],
    queryFn: sentosTrackApi.overview,
    staleTime: 30_000,
  });
}

export function useSentosTrackWarnings(store?: string, level?: string) {
  return useQuery({
    queryKey: ['sentostrack-warnings', store ?? 'all', level ?? 'all'],
    queryFn: () => sentosTrackApi.warnings(store, level),
    staleTime: 15_000,
  });
}

export function useSentosStock(store: string, search: string) {
  return useQuery({
    queryKey: ['sentostrack-sentos-stock', store, search],
    queryFn: () => sentosTrackApi.sentosStock(store, search),
    staleTime: 30_000,
  });
}

export function useRefreshSentosStock(store: string, search: string) {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Stok yenilendi' } as const,
    mutationFn: () => sentosTrackApi.refreshSentosStock(store, search),
    onSuccess: (data) => {
      qc.setQueryData(['sentostrack-sentos-stock', store, search], data);
    },
  });
}

export function usePotentialStock(store: string, search: string) {
  return useQuery({
    queryKey: ['sentostrack-potential-stock', store, search],
    queryFn: () => sentosTrackApi.potentialStock(store, search),
    staleTime: 15_000,
  });
}

// Excel yükleme baseline'ı sıfırlar → potansiyel stok, uyarılar ve genel bakış hepsi değişir.
export function useUploadPotentialStock(store: string) {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Potansiyel stok yüklendi' } as const,
    mutationFn: (file: File) => sentosTrackApi.uploadPotentialStock(store, file),
    onSuccess: () => invalidateStore(qc, store),
  });
}

// Manuel düşüm tetikleme — sipariş satırlarını potansiyel stoktan düşer.
export function useConsume(store: string) {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Stok düşüldü' } as const,
    mutationFn: () => sentosTrackApi.consume(store),
    onSuccess: () => invalidateStore(qc, store),
  });
}

export function useSentosTrackSettings(store: string) {
  return useQuery({
    queryKey: ['sentostrack-settings', store],
    queryFn: () => sentosTrackApi.settings(store),
    staleTime: 300_000,
  });
}

// Eşik değişikliği uyarı seviyelerini yeniden hesaplattırır.
export function useUpdateSentosTrackSettings(store: string) {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Ayarlar kaydedildi' } as const,
    mutationFn: (dto: { orangeThreshold: number; yellowThreshold: number; depletionDaysThreshold: number }) =>
      sentosTrackApi.updateSettings(store, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sentostrack-settings', store] });
      qc.invalidateQueries({ queryKey: ['sentostrack-warnings'] });
    },
  });
}

function invalidateStore(qc: ReturnType<typeof useQueryClient>, store: string) {
  qc.invalidateQueries({ queryKey: ['sentostrack-potential-stock', store] });
  qc.invalidateQueries({ queryKey: ['sentostrack-warnings'] });
  qc.invalidateQueries({ queryKey: ['sentostrack-overview'] });
}
