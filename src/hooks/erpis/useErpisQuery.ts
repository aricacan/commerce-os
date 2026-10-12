'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  erpisQueryApi,
  type ErpisBreakdownKey,
  type ErpisBreakdownOrder,
  type ErpisQueryFilter,
  type ErpisSort,
  type ErpisUpdateItemRequest,
} from '@/lib/api';

// Normalize katman sorguları. Anahtarlar filtre nesnesini olduğu gibi taşır: filtre
// değişince tüm bağlı sorgular kendiliğinden tazelenir ve iki ekran arasında rakam
// tutarsızlığı oluşmaz.
const KEYS = {
  lines: (f: ErpisQueryFilter, s: ErpisSort) => ['erpis-q-lines', f, s] as const,
  line: (id: number) => ['erpis-q-line', id] as const,
  summary: (f: ErpisQueryFilter) => ['erpis-q-summary', f] as const,
  trend: (f: ErpisQueryFilter) => ['erpis-q-trend', f] as const,
  breakdown: (f: ErpisQueryFilter, by: string, limit: number, orderBy: string, asc: boolean) =>
    ['erpis-q-breakdown', f, by, limit, orderBy, asc] as const,
  dimensionTrend: (f: ErpisQueryFilter, by: string, limit: number) =>
    ['erpis-q-dim-trend', f, by, limit] as const,
  scopeSummary: (f: ErpisQueryFilter) => ['erpis-q-scope', f] as const,
  options: (f: ErpisQueryFilter) => ['erpis-q-options', f] as const,
  items: (f: ErpisQueryFilter, s: ErpisSort) => ['erpis-q-items', f, s] as const,
  item: (id: number) => ['erpis-q-item', id] as const,
  warehouseZones: (f: ErpisQueryFilter) => ['erpis-q-warehouse', f] as const,
  dataHealth: (f: ErpisQueryFilter) => ['erpis-q-health', f] as const,
  aging: (f: ErpisQueryFilter) => ['erpis-q-aging', f] as const,
  planning: (f: ErpisQueryFilter, s: ErpisSort) => ['erpis-q-planning', f, s] as const,
  mixed: (f: ErpisQueryFilter) => ['erpis-q-mixed', f] as const,
};

export function useErpisLines(filter: ErpisQueryFilter, sort: ErpisSort) {
  return useQuery({
    queryKey: KEYS.lines(filter, sort),
    queryFn: () => erpisQueryApi.lines(filter, sort),
    // Sayfa değişince tabloyu boşaltmak sıçrama yaratıyor; önceki sayfa yerinde kalır.
    placeholderData: (previous) => previous,
  });
}

export function useErpisLine(id: number | null) {
  return useQuery({
    queryKey: KEYS.line(id ?? 0),
    queryFn: () => erpisQueryApi.line(id!),
    enabled: id != null,
  });
}

export function useErpisOrdersSummary(filter: ErpisQueryFilter) {
  return useQuery({ queryKey: KEYS.summary(filter), queryFn: () => erpisQueryApi.summary(filter) });
}

export function useErpisOrdersTrend(filter: ErpisQueryFilter) {
  return useQuery({ queryKey: KEYS.trend(filter), queryFn: () => erpisQueryApi.trend(filter) });
}

export function useErpisBreakdown(
  filter: ErpisQueryFilter,
  by: ErpisBreakdownKey,
  limit = 10,
  orderBy: ErpisBreakdownOrder = 'amount',
  asc = false,
) {
  return useQuery({
    queryKey: KEYS.breakdown(filter, by, limit, orderBy, asc),
    queryFn: () => erpisQueryApi.breakdown(filter, by, limit, orderBy, asc),
    // İlk N değişince kartı boşaltmak sıçrama yaratıyor; önceki liste yerinde kalır.
    placeholderData: (previous) => previous,
  });
}

export function useErpisDimensionTrend(
  filter: ErpisQueryFilter, by: ErpisBreakdownKey, limit = 5,
) {
  return useQuery({
    queryKey: KEYS.dimensionTrend(filter, by, limit),
    queryFn: () => erpisQueryApi.dimensionTrend(filter, by, limit),
    placeholderData: (previous) => previous,
  });
}

export function useErpisScopeSummary(filter: ErpisQueryFilter) {
  return useQuery({
    queryKey: KEYS.scopeSummary(filter),
    queryFn: () => erpisQueryApi.scopeSummary(filter),
  });
}

export function useErpisFilterOptions(filter: ErpisQueryFilter) {
  return useQuery({
    queryKey: KEYS.options(filter),
    queryFn: () => erpisQueryApi.filterOptions(filter),
    placeholderData: (previous) => previous,
  });
}

export function useErpisItems(filter: ErpisQueryFilter, sort: ErpisSort) {
  return useQuery({
    queryKey: KEYS.items(filter, sort),
    queryFn: () => erpisQueryApi.items(filter, sort),
    placeholderData: (previous) => previous,
  });
}

export function useErpisItem(id: number | null) {
  return useQuery({
    queryKey: KEYS.item(id ?? 0),
    queryFn: () => erpisQueryApi.item(id!),
    enabled: id != null,
  });
}

export function useErpisWarehouseZones(filter: ErpisQueryFilter) {
  return useQuery({
    queryKey: KEYS.warehouseZones(filter),
    queryFn: () => erpisQueryApi.warehouseZones(filter),
  });
}

export function useErpisDataHealth(filter: ErpisQueryFilter) {
  return useQuery({
    queryKey: KEYS.dataHealth(filter),
    queryFn: () => erpisQueryApi.dataHealth(filter),
  });
}

export function useErpisPlanning(filter: ErpisQueryFilter, sort: ErpisSort) {
  return useQuery({
    queryKey: KEYS.planning(filter, sort),
    queryFn: () => erpisQueryApi.planning(filter, sort),
    placeholderData: (previous) => previous,
  });
}

export function useErpisAging(filter: ErpisQueryFilter) {
  return useQuery({
    queryKey: KEYS.aging(filter),
    queryFn: () => erpisQueryApi.aging(filter),
  });
}

// Kart düzeltmesi kartı Manual'a çeker ve listeyi/kırılımları etkiler; tüm normalize
// sorgular tazelenir. Yalnız düzenlenen kartı tazelemek, kırılımlarda eski markayı
// göstermeye devam ederdi.
export function useUpdateErpisItem() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Stok kartı güncellendi' } as const,
    mutationFn: (vars: { id: number; body: ErpisUpdateItemRequest }) =>
      erpisQueryApi.updateItem(vars.id, vars.body),
    onSuccess: () =>
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('erpis-q-') }),
  });
}

// Kalemleri birden çok firmaya dağılan siparişler.
export function useErpisMixedOrders(filter: ErpisQueryFilter) {
  return useQuery({
    queryKey: KEYS.mixed(filter),
    queryFn: () => erpisQueryApi.mixedOrders(filter),
  });
}

// Pano giriş ekranı: her firmanın dört dönemlik cirosu.
export function useErpisCompanyOverview() {
  return useQuery({
    queryKey: ['erpis-q-company-overview'],
    queryFn: () => erpisQueryApi.companyOverview('TL'),
  });
}
