'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erpImportApi, erpSourcesApi, type ErpImportOrderRow } from '@/lib/api';

export function useErpSources() {
  return useQuery({ queryKey: ['erp-sources'], queryFn: erpSourcesApi.list, staleTime: 300_000 });
}

// Şablon sütunları backend kodunda sabit — uzun staleTime yeterli.
export function useErpImportOrderColumns() {
  return useQuery({
    queryKey: ['erp-import-order-columns'],
    queryFn: erpImportApi.orderColumns,
    staleTime: Infinity,
  });
}

export function useErpImportBatches() {
  return useQuery({ queryKey: ['erp-import-batches'], queryFn: erpImportApi.batches, staleTime: 30_000 });
}

// Ayrıştırma DB'ye dokunmaz — cache tazelemesi yok, sonuç önizleme olarak state'te tutulur.
export function useParseErpOrders() {
  return useMutation({
    mutationFn: ({ sourceId, file }: { sourceId: number; file: File }) =>
      erpImportApi.parseOrders(sourceId, file),
  });
}

// Kaydetme canlı sipariş verisini değiştirir — sipariş listeleri ve panolar da tazelenir.
export function useCommitErpOrders() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'Siparişler içe aktarıldı' } as const,
    mutationFn: (body: { fileName: string; sourceId: number; rows: ErpImportOrderRow[] }) =>
      erpImportApi.commitOrders(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['erp-import-batches'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUndoErpImport() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'İçe aktarma geri alındı' } as const,
    mutationFn: erpImportApi.undo,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['erp-import-batches'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
