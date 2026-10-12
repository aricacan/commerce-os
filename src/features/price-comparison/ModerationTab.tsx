'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { categoryPriceApi } from '../../lib/api';
import { applyOptimistic, rollbackOptimistic } from '../../lib/optimistic';
import { describeError } from '../../lib/errors';
import { toast } from '../../lib/toast';

const MODERATION_KEY = ['category-price-moderation'] as const;
type ModerationQueue = Awaited<ReturnType<typeof categoryPriceApi.moderationQueue>>;

export function ModerationTab() {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: MODERATION_KEY,
    queryFn: () => categoryPriceApi.moderationQueue(),
    staleTime: 15_000,
  });

  const approve = useMutation({
    meta: { silentError: true, successMessage: 'Onaylandı' } as const,
    mutationFn: (id: number) => categoryPriceApi.approveModeration(id),
    onMutate: (id) =>
      applyOptimistic<ModerationQueue>(qc, MODERATION_KEY, (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((item) => item.id !== id) };
      }),
    onError: (error, _vars, context) => {
      rollbackOptimistic(qc, context);
      toast.error(describeError(error));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: MODERATION_KEY });
      qc.invalidateQueries({ queryKey: ['category-price-targets'] });
    },
  });

  const reject = useMutation({
    meta: { silentError: true, successMessage: 'Reddedildi' } as const,
    mutationFn: (id: number) => categoryPriceApi.rejectModeration(id),
    onMutate: (id) =>
      applyOptimistic<ModerationQueue>(qc, MODERATION_KEY, (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((item) => item.id !== id) };
      }),
    onError: (error, _vars, context) => {
      rollbackOptimistic(qc, context);
      toast.error(describeError(error));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: MODERATION_KEY });
    },
  });

  if (isLoading) return <div className="p-4 text-center text-xs text-[var(--fg-muted)]">Yükleniyor…</div>;
  if (isError) return <div className="p-4 text-center text-xs text-rose-500/85">Veriler yüklenemedi.</div>;

  const items = data?.items ?? [];

  if (items.length === 0) {
    return <div className="p-4 text-center text-xs text-[var(--fg-muted)]">Bekleyen moderasyon yok.</div>;
  }

  return (
    <div className="flex flex-col divide-y divide-[var(--border-soft)] border border-[var(--border-soft)] rounded-[4px] overflow-hidden">
      {items.map((it) => (
        <div key={it.id} className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card)] p-3 hover:bg-[var(--bg-subtle)]/30 transition text-xs">
          <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
            <span className="font-bold text-[var(--fg)]">{it.rawCategoryText}</span>
            <div className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
              <span className="font-bold text-[var(--fg)]">
                {it.currency === 'Tl' ? '₺' : '£'}{it.rawPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
              {it.suggestedCategoryName ? (
                <span>
                  Öneri: <strong>{it.suggestedCategoryName}</strong> (%{Math.round(it.confidence * 100)})
                </span>
              ) : (
                <span>Kategori önerisi yok</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => approve.mutate(it.id)}
              disabled={!it.suggestedInternalCategoryId || approve.isPending}
              className={`inline-flex h-7 items-center gap-1 rounded-[3px] px-2.5 text-xs font-semibold ${
                it.suggestedInternalCategoryId
                  ? 'bg-emerald-500/10 text-emerald-600/90 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)] cursor-not-allowed'
              }`}
            >
              <Check size={12} />
              <span>Onayla</span>
            </button>

            <button
              type="button"
              onClick={() => reject.mutate(it.id)}
              disabled={reject.isPending}
              className="inline-flex h-7 items-center gap-1 rounded-[3px] bg-rose-500/10 px-2.5 text-xs font-semibold text-rose-500/90 hover:bg-rose-500 hover:text-white"
            >
              <X size={12} />
              <span>Reddet</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
