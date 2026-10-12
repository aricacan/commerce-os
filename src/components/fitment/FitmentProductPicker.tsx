'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { fitmentApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { queryKeys } from '../../lib/query-keys';
import type { FitmentProductSearchItem } from '../../lib/api/fitment';

interface FitmentProductPickerProps {
  categoryId?: number;
  onPick: (product: FitmentProductSearchItem) => void;
  onClose: () => void;
}

export function FitmentProductPicker({ categoryId, onPick, onClose }: FitmentProductPickerProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim();
  const { data, isFetching } = useQuery({
    queryKey: queryKeys.fitment.productSearch(normalizedSearch, categoryId),
    queryFn: ({ signal }) => fitmentApi.productSearch(normalizedSearch, categoryId, signal),
    enabled: normalizedSearch.length >= 2,
    staleTime: 10_000,
  });

  return (
    <div className="flex min-w-[300px] flex-col gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-2 shadow-xl">
      <div className="flex items-center gap-1.5">
        <Search size={12} className="text-[var(--fg-muted)]" />
        <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('fitment_product_search_placeholder')} className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[11px] text-[var(--fg)] outline-none" />
        <button onClick={onClose} className="flex cursor-pointer border-0 bg-transparent text-[var(--fg-muted)]"><X size={13} /></button>
      </div>
      <div className="flex max-h-44 flex-col gap-0.5 overflow-y-auto">
        {isFetching && <p className="m-1 text-[11px] text-[var(--fg-muted)]">{t('fitment_searching')}</p>}
        {!isFetching && normalizedSearch.length >= 2 && data?.length === 0 && <p className="m-1 text-[11px] text-[var(--fg-subtle)]">{t('fitment_no_results')}</p>}
        {data?.map((product) => (
          <button key={product.productId} onClick={() => onPick(product)} className="cursor-pointer rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-left">
            <p className="m-0 text-[11.5px] font-semibold text-[var(--fg)]">{product.name}</p>
            <p className="mt-0.5 font-mono text-[10px] text-[var(--fg-muted)]">{product.sku}{product.category ? ` · ${product.category}` : ''}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
