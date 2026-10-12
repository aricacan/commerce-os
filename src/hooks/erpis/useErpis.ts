'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  erpisApi, type ErpisAnalyticsFilter, type ErpisRankingDimension, type ErpisSqlSource,
} from '@/lib/api';

const KEYS = {
  companies: ['erpis-companies'] as const,
  datasets: ['erpis-datasets'] as const,
  uploads: (companyId?: number | null, datasetId?: number | null) =>
    ['erpis-uploads', companyId ?? null, datasetId ?? null] as const,
  rows: (uploadId: number, page: number) => ['erpis-rows', uploadId, page] as const,
  mappings: (datasetId?: number | null) => ['erpis-mappings', datasetId ?? null] as const,
  summary: (filter: ErpisAnalyticsFilter) => ['erpis-summary', filter] as const,
  trend: (filter: ErpisAnalyticsFilter, granularity: string) =>
    ['erpis-trend', filter, granularity] as const,
  ranking: (filter: ErpisAnalyticsFilter, dimension: string) =>
    ['erpis-ranking', filter, dimension] as const,
};

// Firma ve rapor tipi nadiren değişir — sık sık yeniden çekmek gereksiz istek üretir.
const SLOW_CHANGING = 300_000;

export function useErpisCompanies() {
  return useQuery({ queryKey: KEYS.companies, queryFn: erpisApi.companies, staleTime: SLOW_CHANGING });
}

export function useErpisDatasets() {
  return useQuery({ queryKey: KEYS.datasets, queryFn: erpisApi.datasets, staleTime: SLOW_CHANGING });
}

export function useErpisUploads(
  companyId?: number | null, datasetId?: number | null,
  page = 1, pageSize = 25,
) {
  return useQuery({
    // Sayfa anahtarın PARÇASI: olmasaydı sayfa değiştirince önbellekteki ilk sayfa
    // gösterilir ve liste hiç değişmezdi.
    queryKey: [...KEYS.uploads(companyId, datasetId), page, pageSize],
    queryFn: () => erpisApi.uploads(companyId, datasetId, page, pageSize),
  });
}

export function useErpisRows(uploadId: number | null, page: number, pageSize: number) {
  return useQuery({
    queryKey: KEYS.rows(uploadId ?? 0, page),
    queryFn: () => erpisApi.uploadRows(uploadId!, page, pageSize),
    enabled: uploadId != null,
  });
}

export function useErpisMappings(datasetId?: number | null) {
  return useQuery({ queryKey: KEYS.mappings(datasetId), queryFn: () => erpisApi.mappings(datasetId) });
}

export function useErpisSummary(filter: ErpisAnalyticsFilter, enabled = true) {
  return useQuery({ queryKey: KEYS.summary(filter), queryFn: () => erpisApi.summary(filter), enabled });
}

export function useErpisTrend(filter: ErpisAnalyticsFilter, granularity: 'month' | 'day', enabled = true) {
  return useQuery({
    queryKey: KEYS.trend(filter, granularity),
    queryFn: () => erpisApi.trend(filter, granularity),
    enabled,
  });
}

export function useErpisRanking(
  filter: ErpisAnalyticsFilter, dimension: ErpisRankingDimension, enabled = true,
) {
  return useQuery({
    queryKey: KEYS.ranking(filter, dimension),
    queryFn: () => erpisApi.ranking(filter, dimension),
    enabled,
  });
}

// Yükleme, analiz sonuçlarını da değiştirir — tüm erpis sorguları tazelenir. Seçici
// invalidasyon (sadece uploads) yeni satırları grafiklere yansıtmazdı.
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('erpis-') });
}

export function useCommitErpisUpload() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Rapor yüklendi' } as const,
    mutationFn: (vars: Parameters<typeof erpisApi.commitUpload>) =>
      erpisApi.commitUpload(vars[0], vars[1]),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteErpisUpload() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Yükleme silindi' } as const,
    mutationFn: erpisApi.deleteUpload,
    onSuccess: () => invalidateAll(qc),
  });
}

export function useCreateErpisCompany() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Firma eklendi' } as const,
    mutationFn: erpisApi.createCompany,
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateErpisCompany() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Firma güncellendi' } as const,
    mutationFn: (vars: { id: number; body: Parameters<typeof erpisApi.updateCompany>[1] }) =>
      erpisApi.updateCompany(vars.id, vars.body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteErpisCompany() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Firma silindi' } as const,
    mutationFn: erpisApi.deleteCompany,
    onSuccess: () => invalidateAll(qc),
  });
}

export function useCreateErpisDataset() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Rapor tipi eklendi' } as const,
    mutationFn: erpisApi.createDataset,
    onSuccess: () => invalidateAll(qc),
  });
}

// ── SQL Canlı Senkron (Ayarlar > Canlı Veri) ────────────────────────────────

// 15 sn: panel açıkken "Şimdi çalıştır"ın sonucunu ya da tetiğin arka planda yaptığı
// değişikliği kullanıcı sayfayı yenilemeden görsün. Diğer erpis sorgularından farklı
// olarak burada tazelik önemli — durum saniyeler içinde değişebiliyor.
const SQL_SOURCES_KEY = ['erpis-sql-sources'] as const;

export function useErpisSqlSources() {
  return useQuery({
    queryKey: SQL_SOURCES_KEY,
    queryFn: erpisApi.sqlSources,
    refetchInterval: 15_000,
  });
}

type SqlSourceUpdate = { key: string; body: Parameters<typeof erpisApi.updateSqlSource>[1] };

// Önbellek ANINDA güncellenir (iyimser), sunucu yanıtı gelince kesin değerle yazılır.
//
// NEDEN: panel her değişiklikte TÜM ayarı gönderiyor (PUT tam kayıt bekliyor) ve gövdeyi
// ekrandaki kaynaktan kuruyor. Önceden önbellek yalnız "geçersiz kılınıp" arkadan yeniden
// çekiliyordu; bu arada kaynak BAYAT kalıyordu. Kullanıcı kaynağı "Açık" yapıp liste
// tazelenmeden sıklığı değiştirince ikinci kayıt eski isEnabled=false değerini gönderip
// kaynağı SESSİZCE KAPATIYORDU — canlıda iki kaynak da böyle kapalı kaldı, otomatik tur
// hiç çalışmadı ve "senkron çalışmıyor" gibi göründü.
export function useUpdateErpisSqlSource() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Kaynak ayarı güncellendi' } as const,
    mutationFn: (vars: SqlSourceUpdate) => erpisApi.updateSqlSource(vars.key, vars.body),
    onMutate: async ({ key, body }: SqlSourceUpdate) => {
      // Arkada koşan 15 sn'lik yoklama iyimser değeri eski veriyle ezmesin.
      await qc.cancelQueries({ queryKey: SQL_SOURCES_KEY });
      const previous = qc.getQueryData<ErpisSqlSource[]>(SQL_SOURCES_KEY);
      qc.setQueryData<ErpisSqlSource[]>(SQL_SOURCES_KEY, (list) =>
        list?.map((s) => (s.key === key ? { ...s, ...body } : s)));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      // Kayıt reddedildi (ör. "ERP şirket kodu girilmeli"): ekran sunucudaki gerçeğe döner.
      if (context?.previous) qc.setQueryData(SQL_SOURCES_KEY, context.previous);
    },
    onSuccess: (updated) => {
      qc.setQueryData<ErpisSqlSource[]>(SQL_SOURCES_KEY, (list) =>
        list?.map((s) => (s.key === updated.key ? updated : s)));
      invalidateAll(qc);
    },
  });
}

// Sonuç toast İLE değil, çağıran bileşende (ErpisSqlSourcesTab) satır içinde gösteriliyor:
// "başarılı/kaç satır" ile "hata" farklı görsel ağırlık istiyor, genel toast'a sığmıyor.
export function useRunErpisSqlSourceNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: string; confirmMassClose?: boolean }) =>
      erpisApi.runSqlSourceNow(vars.key, vars.confirmMassClose ?? false),
    onSuccess: () => invalidateAll(qc),
  });
}

// Önizle hiçbir şey yazmaz — önbelleği geçersiz kılmaya gerek yok.
export function usePreviewErpisSqlSource() {
  return useMutation({ mutationFn: erpisApi.previewSqlSource });
}

export function useTestErpisSqlConnection() {
  return useMutation({ mutationFn: erpisApi.testSqlConnection });
}

export function useDeleteErpisMapping() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Şablon silindi' } as const,
    mutationFn: erpisApi.deleteMapping,
    onSuccess: () => invalidateAll(qc),
  });
}
