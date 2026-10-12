'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  erpisCatalogApi,
  type ErpisDictionaryKind,
  type ErpisSegmentQuery,
} from '@/lib/api';

const KEYS = {
  segments: (q: ErpisSegmentQuery) => ['erpis-c-segments', q] as const,
  categories: ['erpis-c-categories'] as const,
  dictionaries: (kind: ErpisDictionaryKind | null) => ['erpis-c-dictionaries', kind] as const,
  candidates: (kind: ErpisDictionaryKind) => ['erpis-c-candidates', kind] as const,
  parseStatus: ['erpis-c-parse-status'] as const,
};

// Aday taraması tüm kataloğun çözülemeyen metnini okuyor; her odak değişiminde yeniden
// çalıştırmak gereksiz. Sözlük değişince zaten geçersiz kılınıyor.
const CANDIDATE_STALE = 120_000;

export function useErpisSegments(query: ErpisSegmentQuery) {
  return useQuery({
    queryKey: KEYS.segments(query),
    queryFn: () => erpisCatalogApi.segments(query),
    placeholderData: (previous) => previous,
  });
}

export function useErpisCategories() {
  return useQuery({ queryKey: KEYS.categories, queryFn: erpisCatalogApi.categories });
}

export function useErpisDictionaries(kind: ErpisDictionaryKind | null) {
  return useQuery({
    queryKey: KEYS.dictionaries(kind),
    queryFn: () => erpisCatalogApi.dictionaries(kind),
  });
}

export function useErpisDictionaryCandidates(kind: ErpisDictionaryKind, enabled = true) {
  return useQuery({
    queryKey: KEYS.candidates(kind),
    queryFn: () => erpisCatalogApi.candidates(kind),
    staleTime: CANDIDATE_STALE,
    enabled,
  });
}

// Bilgi kaynağı değişince analiz sonuçları da değişir (etiketlenen segment kırılımda
// görünür, eklenen marka yeniden ayrıştırmada tanınır). Bu yüzden hem katalog hem sorgu
// önbelleği tazelenir — yalnız birini tazelemek ekranda eski rakamı bırakırdı.
function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({
    predicate: (q) => {
      const key = String(q.queryKey[0]);
      return key.startsWith('erpis-c-') || key.startsWith('erpis-q-')
        || key === 'erpis-sku-routes' || key.startsWith('erpis-card-');
    },
  });
}

export function useUpdateErpisSegment() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Segment etiketi kaydedildi' } as const,
    mutationFn: (vars: { id: number; label: string | null; kind: string | null }) =>
      erpisCatalogApi.updateSegment(vars.id, { label: vars.label, kind: vars.kind }),
    onSuccess: () => invalidate(qc),
  });
}

export function useRenameErpisCategory() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Kategori adı güncellendi' } as const,
    mutationFn: (vars: { id: number; name: string }) =>
      erpisCatalogApi.renameCategory(vars.id, vars.name),
    onSuccess: () => invalidate(qc),
  });
}

export function useCreateErpisDictionaryEntry() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Sözlüğe eklendi' } as const,
    mutationFn: erpisCatalogApi.createDictionaryEntry,
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateErpisDictionaryEntry() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Sözlük kaydı güncellendi' } as const,
    mutationFn: (vars: {
      id: number; value: string; aliases: string[]; isActive: boolean;
    }) => erpisCatalogApi.updateDictionaryEntry(vars.id, vars),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteErpisDictionaryEntry() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Sözlük kaydı silindi' } as const,
    mutationFn: erpisCatalogApi.deleteDictionaryEntry,
    onSuccess: () => invalidate(qc),
  });
}

// Yalnız yazma yetkisi olana sorulur — uç SuperAdmin/Admin'e kapalı, diğerlerine 403 döner.
export function useErpisParseStatus(enabled: boolean) {
  return useQuery({
    queryKey: KEYS.parseStatus,
    queryFn: erpisCatalogApi.parseStatus,
    enabled,
  });
}

export function useErpisReparse() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Yeniden ayrıştırma tamamlandı' } as const,
    mutationFn: erpisCatalogApi.reparse,
    onSuccess: () => invalidate(qc),
  });
}

// ── Kalıp → firma kuralları ────────────────────────────────────────────────

export function useErpisSkuRoutes() {
  return useQuery({
    queryKey: ['erpis-sku-routes'],
    queryFn: erpisCatalogApi.routes,
  });
}

export function useSaveErpisSkuRoute() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Kural kaydedildi' } as const,
    mutationFn: erpisCatalogApi.saveRoute,
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteErpisSkuRoute() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Kural silindi' } as const,
    mutationFn: erpisCatalogApi.deleteRoute,
    onSuccess: () => invalidate(qc),
  });
}

// ── Kart adı kuralları ───────────────────────────────────────────────────────
//
// Kural değişince filtre seçenekleri ve tüm sorgular tazeleniyor (bkz. invalidate):
// eşleştirme SORGU ANINDA yapıldığı için yeniden içe aktarım gerekmiyor, ama ekrandaki
// sayılar eski kalmamalı.

export function useErpisCardMatrix() {
  return useQuery({
    queryKey: ['erpis-card-matrix'],
    queryFn: erpisCatalogApi.cardMatrix,
  });
}

export function useSaveErpisCardTag() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Kart adı kaydedildi' } as const,
    mutationFn: erpisCatalogApi.saveCardTag,
    onSuccess: () => invalidate(qc),
  });
}

export function useFillUnnamedErpisCardTags() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Adsız satırlar dolduruldu' } as const,
    mutationFn: erpisCatalogApi.fillUnnamedCardTags,
    onSuccess: () => invalidate(qc),
  });
}

// Kuralları kayıtlı kartlara uygular. Deneme çalıştırması hiçbir şeyi değiştirmez.
export function useApplyErpisSkuRoutes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: erpisCatalogApi.applyRoutes,
    onSuccess: () => invalidate(qc),
  });
}
