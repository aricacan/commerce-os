'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryMismatchApi, hangfirePanelApi } from '../../lib/api';
import type {
  CategoryMismatchItem,
  CategoryMismatchListResponse,
  DeadCategoryMappingListResponse,
} from '../../lib/api/category-mismatch';
import { formatDateTime } from '../../lib/format';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from '../../lib/toast';
import { useAuthStore } from '../../stores/auth';
import { DeadCategoryMappingsTable } from './DeadCategoryMappingsTable';

const REBUILD_JOB_ID = 'category-mismatch-check';

// Aynı job iki AYRI arıza sınıfı üretir; ayrı bölümlerde gösterilirler çünkü çözümleri
// farklıdır (uyuşmazlıkta eşlemeyi düzelt, ölü eşlemede sil).
type MismatchSection = 'mismatches' | 'dead';

function AffectedProductsRow({ id, colSpan }: { id: number; colSpan: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['category-mismatch-products', id],
    queryFn: () => categoryMismatchApi.getAffectedProducts(id),
    staleTime: 5 * 60_000,
  });

  return (
    <tr className="bg-[var(--bg-subtle)]/40 border-b border-[var(--border-soft)]">
      <td colSpan={colSpan} className="p-3 pl-8">
        {isLoading ? (
          <div className="text-xs text-[var(--fg-muted)] py-2">Ürünler yükleniyor...</div>
        ) : isError ? (
          <div className="text-xs text-rose-500 py-2">Ürünler yüklenemedi.</div>
        ) : !data || data.length === 0 ? (
          <div className="text-xs text-[var(--fg-muted)] py-2">Örnek etkilenen ürün bulunamadı.</div>
        ) : (
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            <span className="text-ui-xs font-bold uppercase tracking-wider text-[var(--fg-muted)] block">
              Etkilenen Ürünler ({data.length})
            </span>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-ui-2xs text-[var(--fg-muted)] uppercase border-b border-[var(--border-soft)]">
                  <th className="py-1">Ürün Adı</th>
                  <th className="py-1 text-right">SKU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {data.map((p) => (
                  <tr key={p.id} className="text-xs">
                    <td className="py-1.5 font-medium text-[var(--fg)]">{p.name}</td>
                    <td className="py-1.5 text-right font-mono text-[var(--fg-muted)]">{p.supplierSKU ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </td>
    </tr>
  );
}

export function CategoryMismatchTab() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [section, setSection] = useState<MismatchSection>('mismatches');
  const queryClient = useQueryClient();
  // "Yeniden Hesapla" bir Hangfire job'ını tetikler — backend yalnızca SuperAdmin'e izin verir.
  const canTriggerRebuild = useAuthStore((s) => s.user?.roles?.some((r) => r.toLowerCase() === 'superadmin') ?? false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<CategoryMismatchListResponse>({
    queryKey: ['category-mismatch'],
    queryFn: () => categoryMismatchApi.list(),
    staleTime: 10 * 60_000,
  });

  const triggerMutation = useMutation({
    meta: { successMessage: 'Uyuşmazlık analizi iş kuyruğuna alındı' } as const,
    mutationFn: () => hangfirePanelApi.triggerJob(REBUILD_JOB_ID),
    onSuccess: () => {
      toast.success('Uyuşmazlık kontrolü arka planda başlatıldı.');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['category-mismatch'] });
        queryClient.invalidateQueries({ queryKey: ['category-mismatch-dead'] });
      }, 3000);
    },
    onError: () => {
      toast.error('İş tetiklenemedi.');
    },
  });

  // Sekme rozetindeki sayı için — tablo bileşeni kendi sorgusunu yapar, aynı queryKey
  // olduğu için react-query tek çağrıya indirger.
  const { data: deadData } = useQuery<DeadCategoryMappingListResponse>({
    queryKey: ['category-mismatch-dead'],
    queryFn: () => categoryMismatchApi.listDead(),
    staleTime: 10 * 60_000,
  });

  const items: CategoryMismatchItem[] = data?.items ?? [];
  const deadCount = deadData?.items?.length ?? 0;
  const showMismatches = section === 'mismatches';

  const sectionButtonClass = (active: boolean) =>
    `h-8 px-3 rounded-[4px] text-xs font-semibold transition cursor-pointer border ${
      active
        ? 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)]'
        : 'border-transparent text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]/60'
    }`;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* Top Toolbar */}
      <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSection('mismatches')}
            className={sectionButtonClass(showMismatches)}
          >
            Uyuşmazlıklar ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setSection('dead')}
            className={sectionButtonClass(!showMismatches)}
          >
            Ölü Eşlemeler ({deadCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['category-mismatch-dead'] });
            }}
            disabled={isFetching}
            className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            <span>Yenile</span>
          </button>

          {canTriggerRebuild && (
            <button
              type="button"
              onClick={() => triggerMutation.mutate()}
              disabled={triggerMutation.isPending}
              className="h-8 px-3.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--fg)] shadow-xs hover:border-[var(--fg-muted)] transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            >
              <RefreshCw size={12} className={triggerMutation.isPending ? 'animate-spin' : ''} />
              <span>{triggerMutation.isPending ? 'Başlatılıyor...' : 'Yeniden Hesapla'}</span>
            </button>
          )}
        </div>
      </div>

      {!showMismatches && (
        <>
          <p className="text-ui-xs text-[var(--fg-muted)]">
            Bu eşlemelerin ham kategori id&apos;si ERP&apos;nin canlı ağacında hiç yok — düzeltilecek bir
            ad yok, artık hiçbir ürünü çözemezler. (ERP kategori id&apos;leri toptan değiştiğinde oluşur.)
          </p>
          <DeadCategoryMappingsTable />
        </>
      )}

      {showMismatches && isLoading && (
        <div className="p-12 text-center text-xs text-[var(--fg-muted)]">Uyuşmazlıklar yükleniyor...</div>
      )}

      {showMismatches && isError && (
        <div className="p-8 text-center text-xs text-rose-500">Uyuşmazlık verileri yüklenemedi.</div>
      )}

      {showMismatches && !isLoading && !isError && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-ui-xs font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                  <th className="p-3 w-8"></th>
                  <th className="p-3">Platform / Mağaza</th>
                  <th className="p-3">Ham Dış Kategori Adı</th>
                  <th className="p-3">Sistem Kategorisi</th>
                  <th className="p-3 text-right">Etkilenen Ürün</th>
                  <th className="p-3 text-right">Son Tespit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-[var(--fg-muted)]">
                      Kayıtlı herhangi bir kategori uyuşmazlığı tespit edilmedi.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const isExpanded = expandedId === row.id;
                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                          className={`hover:bg-[var(--bg-subtle)]/30 transition cursor-pointer text-xs ${
                            isExpanded ? 'bg-[var(--bg-subtle)]/40' : ''
                          }`}
                        >
                          <td className="p-3 text-center text-[var(--fg-muted)]">
                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </td>
                          <td className="p-3 font-semibold text-[var(--fg)]">{row.platformName || row.storeDisplayName || '—'}</td>
                          <td className="p-3 text-[var(--fg)] font-medium">{row.erpCategoryName}</td>
                          <td className="p-3 text-[var(--fg-muted)]">{row.internalCategoryName ?? '—'}</td>
                          <td className="p-3 text-right font-bold text-[var(--fg)]">
                            <span className="px-2 py-0.5 rounded-[2px] bg-amber-500/10 text-amber-600 border border-amber-500/20 text-ui-xs">
                              {row.affectedProductCount} ürün
                            </span>
                          </td>
                          <td className="p-3 text-right text-ui-xs text-[var(--fg-muted)]">
                            {row.checkedAtUtc ? formatDateTime(row.checkedAtUtc) : '—'}
                          </td>
                        </tr>
                        {isExpanded && <AffectedProductsRow id={row.id} colSpan={6} />}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
