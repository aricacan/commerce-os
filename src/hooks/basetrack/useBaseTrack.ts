'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { baseTrackApi, type BaseTrackReportRow } from '@/lib/api';

const KEYS = {
  summary: ['basetrack-summary'] as const,
  batches: (filters: object) => ['basetrack-batches', filters] as const,
  events: (id: number) => ['basetrack-events', id] as const,
  linkedOrders: (id: number) => ['basetrack-linked-orders', id] as const,
  depot: (search: string) => ['basetrack-depot', search] as const,
  movements: (id: number) => ['basetrack-depot-movements', id] as const,
};

export function useBaseTrackSummary() {
  return useQuery({ queryKey: KEYS.summary, queryFn: baseTrackApi.summary, staleTime: 30_000 });
}

export function useBaseTrackSettings(enabled = true) {
  return useQuery({ queryKey: ['basetrack-settings'], queryFn: baseTrackApi.settings, staleTime: 300_000, enabled });
}

// Ayar değişikliği uyarı hesaplarını (transit, eşikler) ve depo etiketini etkiler.
export function useUpdateBaseTrackSettings() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Ayarlar kaydedildi' } as const,
    mutationFn: baseTrackApi.updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['basetrack-settings'] });
      qc.invalidateQueries({ queryKey: ['basetrack-stock-warnings'] });
    },
  });
}

export function useBaseTrackBatches(filters: {
  search?: string; state?: string; unmatchedOnly?: boolean; includeCompleted?: boolean;
}) {
  return useQuery({
    queryKey: KEYS.batches(filters),
    queryFn: () => baseTrackApi.batches(filters),
    staleTime: 30_000,
  });
}

export function useBaseTrackEvents(batchId: number | null) {
  return useQuery({
    queryKey: KEYS.events(batchId ?? 0),
    queryFn: () => baseTrackApi.events(batchId!),
    enabled: batchId !== null,
  });
}

// Kutu ↔ Sipariş eşleşmesi — batch'in ürününü içeren siparişler, satır açıldığında çekilir.
export function useBaseTrackLinkedOrders(batchId: number | null) {
  return useQuery({
    queryKey: KEYS.linkedOrders(batchId ?? 0),
    queryFn: () => baseTrackApi.linkedOrders(batchId!),
    enabled: batchId !== null,
    staleTime: 30_000,
  });
}

export function useBaseTrackStockWarnings(filters: { search?: string; level?: string }) {
  return useQuery({
    queryKey: ['basetrack-stock-warnings', filters],
    queryFn: () => baseTrackApi.stockWarnings(filters),
    staleTime: 60_000,
  });
}

// Şablon listesi sabit (backend kodunda tanımlı) — uzun staleTime yeterli.
export function useBaseTrackReportTemplates() {
  return useQuery({
    queryKey: ['basetrack-report-templates'],
    queryFn: baseTrackApi.reports.templates,
    staleTime: Infinity,
  });
}

// Snapshot okuması ucuzdur ama içerik sadece "Güncelle" ile değişir — otomatik
// yeniden çekmeye gerek yok, tazeleme mutasyonun cache'i ezmesiyle olur.
export function useBaseTrackReport(templateKey: string | null) {
  return useQuery({
    queryKey: ['basetrack-report', templateKey],
    queryFn: () => baseTrackApi.reports.get(templateKey!),
    enabled: templateKey !== null,
    staleTime: Infinity,
  });
}

export function useRefreshBaseTrackReport() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Rapor yenilendi' } as const,
    mutationFn: baseTrackApi.reports.refresh,
    onSuccess: (report) => {
      qc.setQueryData(['basetrack-report', report.templateKey], report);
      qc.invalidateQueries({ queryKey: ['basetrack-report-merged', report.templateKey] });
    },
  });
}

export function useBaseTrackReportUpload(templateKey: string | null) {
  return useQuery({
    queryKey: ['basetrack-report-upload', templateKey],
    queryFn: () => baseTrackApi.reports.upload.get(templateKey!),
    enabled: templateKey !== null,
    staleTime: Infinity,
  });
}

// Birleşik görünüm iki katmandan türetilir — biri değiştiğinde yeniden çekilmeli.
export function useBaseTrackReportMerged(templateKey: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['basetrack-report-merged', templateKey],
    queryFn: () => baseTrackApi.reports.merged(templateKey!),
    enabled: templateKey !== null && enabled,
    staleTime: Infinity,
  });
}

// Ayrıştırma DB'ye dokunmaz, bu yüzden cache tazelemesi yok — sonuç önizleme olarak
// bileşen state'inde tutulur, kullanıcı onaylarsa commit çalışır.
export function useParseBaseTrackReportUpload() {
  return useMutation({
    mutationFn: ({ templateKey, file }: { templateKey: string; file: File }) =>
      baseTrackApi.reports.upload.parse(templateKey, file),
  });
}

export function useCommitBaseTrackReportUpload() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Rapor kaydedildi' } as const,
    mutationFn: ({ templateKey, fileName, rows }: {
      templateKey: string; fileName: string; rows: BaseTrackReportRow[];
    }) => baseTrackApi.reports.upload.commit(templateKey, { fileName, rows }),
    onSuccess: (upload) => {
      qc.setQueryData(['basetrack-report-upload', upload.templateKey], upload);
      qc.invalidateQueries({ queryKey: ['basetrack-report-merged', upload.templateKey] });
    },
  });
}

export function useDeleteBaseTrackReportUpload() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Rapor silindi' } as const,
    mutationFn: baseTrackApi.reports.upload.remove,
    onSuccess: (_, templateKey) => {
      qc.invalidateQueries({ queryKey: ['basetrack-report-upload', templateKey] });
      qc.invalidateQueries({ queryKey: ['basetrack-report-merged', templateKey] });
    },
  });
}

export function useBaseTrackDepot(search: string) {
  return useQuery({
    queryKey: KEYS.depot(search),
    queryFn: () => baseTrackApi.depot.list(search || undefined),
    staleTime: 30_000,
  });
}

export function useBaseTrackDepotMovements(itemId: number | null) {
  return useQuery({
    queryKey: KEYS.movements(itemId ?? 0),
    queryFn: () => baseTrackApi.depot.movements(itemId!),
    enabled: itemId !== null,
  });
}

// Tüm mutasyonlar batch/özet/depo cache'lerini birlikte tazeler — state hareketi
// her üç görünümü de etkileyebilir.
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['basetrack-summary'] });
    qc.invalidateQueries({ queryKey: ['basetrack-batches'] });
    qc.invalidateQueries({ queryKey: ['basetrack-events'] });
    qc.invalidateQueries({ queryKey: ['basetrack-depot'] });
    qc.invalidateQueries({ queryKey: ['basetrack-depot-movements'] });
    // Sipariş/sevkiyat/depo mutasyonlarının hepsi InTransit/DepotQty'yi değiştirebilir,
    // bu da Stok Uyarıları hesabına (potential/depotShortage) girer — bu cache'i unutmak
    // Excel yüklendikten sonra panelin 60sn'e kadar bayat risk göstermesine yol açıyordu.
    qc.invalidateQueries({ queryKey: ['basetrack-stock-warnings'] });
  };
}

export function useImportOrders() {
  const invalidate = useInvalidateAll();
  return useMutation({
    meta: { successMessage: 'Siparişler içe aktarıldı' } as const, mutationFn: baseTrackApi.importOrders, onSuccess: invalidate });
}

export function useImportDispatch() {
  const invalidate = useInvalidateAll();
  return useMutation({
    meta: { successMessage: 'Sevkiyat içe aktarıldı' } as const, mutationFn: baseTrackApi.importDispatch, onSuccess: invalidate });
}

export function useTransitionBatch() {
  const invalidate = useInvalidateAll();
  return useMutation({
    meta: { successMessage: 'Durum güncellendi' } as const,
    mutationFn: ({ batchId, ...body }: {
      batchId: number; fromState: string; toState: string; quantity: number; note?: string;
    }) => baseTrackApi.transition(batchId, body),
    onSuccess: invalidate,
  });
}

export function useRenameRoom() {
  const invalidate = useInvalidateAll();
  return useMutation({
    meta: { successMessage: 'Oda adı değiştirildi' } as const,
    mutationFn: ({ date, label }: { date: string; label: string }) => baseTrackApi.renameRoom(date, label),
    onSuccess: invalidate,
  });
}

export function useDeleteRoom() {
  const invalidate = useInvalidateAll();
  return useMutation({
    meta: { successMessage: 'Oda silindi' } as const, mutationFn: (date: string) => baseTrackApi.deleteRoom(date), onSuccess: invalidate });
}

export function useArriveBatch() {
  const invalidate = useInvalidateAll();
  return useMutation({
    meta: { successMessage: 'Varış kaydedildi' } as const,
    mutationFn: ({ batchId, quantity }: { batchId: number; quantity?: number }) =>
      baseTrackApi.arrive(batchId, quantity),
    onSuccess: invalidate,
  });
}

export function useAddDepotMovement() {
  const invalidate = useInvalidateAll();
  return useMutation({
    meta: { successMessage: 'Hareket eklendi' } as const, mutationFn: baseTrackApi.depot.addMovement, onSuccess: invalidate });
}

export function useImportDepotExcel() {
  const invalidate = useInvalidateAll();
  return useMutation({
    meta: { successMessage: 'Excel içe aktarıldı' } as const, mutationFn: baseTrackApi.depot.importExcel, onSuccess: invalidate });
}

export function useDeleteDepotItem() {
  const invalidate = useInvalidateAll();
  return useMutation({
    meta: { successMessage: 'Kayıt silindi' } as const, mutationFn: baseTrackApi.depot.remove, onSuccess: invalidate });
}
