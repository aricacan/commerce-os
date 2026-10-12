'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { categoryMismatchApi } from '../../lib/api';
import type {
  DeadCategoryMappingItem,
  DeadCategoryMappingListResponse,
} from '../../lib/api/category-mismatch';
import { formatDateTime } from '../../lib/format';
import { toast } from '../../lib/toast';

const COLUMN_COUNT = 6;

// Ölü eşleme = ham kategori id'si ERP'nin canlı ağacında HİÇ YOK. Uyuşmazlıktan ayrı
// gösterilir çünkü çözümü de farklıdır: burada düzeltilecek bir ad yok, eşleme artık
// hiçbir ürünü çözemez — tek doğru eylem silmektir.
export function DeadCategoryMappingsTable() {
  const queryClient = useQueryClient();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery<DeadCategoryMappingListResponse>({
    queryKey: ['category-mismatch-dead'],
    queryFn: () => categoryMismatchApi.listDead(),
    staleTime: 10 * 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoryMismatchApi.deleteDead(id),
    onSuccess: () => {
      toast.success('Ölü eşleme silindi.');
      setConfirmingId(null);
      queryClient.invalidateQueries({ queryKey: ['category-mismatch-dead'] });
    },
    onError: () => {
      toast.error('Eşleme silinemedi.');
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-[var(--fg-muted)]">Ölü eşlemeler yükleniyor...</div>;
  }

  // Frontend backend'den önce yayına çıkar — uç henüz yoksa panel çökmemeli, sadece
  // "veri yok" demeli.
  if (isError) {
    return (
      <div className="p-8 text-center text-xs text-[var(--fg-muted)]">
        Ölü eşleme raporu henüz kullanılabilir değil.
      </div>
    );
  }

  const items: DeadCategoryMappingItem[] = data?.items ?? [];

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-ui-xs font-bold text-[var(--fg-muted)] uppercase tracking-wider">
              <th className="p-3">Platform / Hesap</th>
              <th className="p-3">Ham Kategori ID</th>
              <th className="p-3">Sistem Kategorisi</th>
              <th className="p-3 text-right">Etkilenen Ürün</th>
              <th className="p-3 text-right">Son Tespit</th>
              <th className="p-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]">
            {items.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_COUNT} className="p-8 text-center text-xs text-[var(--fg-muted)]">
                  Ölü eşleme bulunamadı — tüm ham kategori id&apos;leri ERP&apos;de karşılığını buluyor.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--bg-subtle)]/30 transition text-xs">
                  <td className="p-3">
                    <span className="font-semibold text-[var(--fg)]">{row.platformName || '—'}</span>
                    <span className="block text-ui-xs text-[var(--fg-muted)]">
                      {row.mappingAccountCode || `hesapsız · denetlenen: ${row.checkedAccountCodes || '—'}`}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[var(--fg)]">{row.erpRawCategoryId || '—'}</td>
                  <td className="p-3 text-[var(--fg-muted)]">{row.internalCategoryName || '—'}</td>
                  <td className="p-3 text-right">
                    <span className="px-2 py-0.5 rounded-[2px] bg-rose-500/10 text-rose-600 border border-rose-500/20 text-ui-xs font-bold">
                      {row.affectedProductCount ?? 0} ürün
                    </span>
                  </td>
                  <td className="p-3 text-right text-ui-xs text-[var(--fg-muted)]">
                    {row.checkedAtUtc ? formatDateTime(row.checkedAtUtc) : '—'}
                  </td>
                  <td className="p-3 text-right">
                    {confirmingId === row.id ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(row.id)}
                          disabled={deleteMutation.isPending}
                          className="h-7 px-2.5 rounded-[4px] border border-rose-500/40 bg-rose-500/10 text-ui-xs font-semibold text-rose-600 hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-40"
                        >
                          Eminim, sil
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="h-7 px-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] text-ui-xs font-semibold text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                        >
                          Vazgeç
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(row.id)}
                        className="h-7 px-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] text-ui-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Trash2 size={12} />
                        <span>Eşlemeyi sil</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
