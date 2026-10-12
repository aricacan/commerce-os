'use client';

import { useState, type FormEvent } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import type { ShopifyProductFilters } from '../../lib/api/shopify-explorer';
import { EMPTY_PRODUCT_FILTERS, PRODUCT_STATUS_OPTIONS, STOCK_OPTIONS, hasActiveFilters } from './explorerRules';
import { FilterField, FilterSelectField } from './FilterField';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  applied: ShopifyProductFilters;
  onApply: (filters: ShopifyProductFilters) => void;
}

// Ürün süzgeçleri: "Ara" ile (ya da Enter) uygulanır.
export function ProductFilters({ applied, onApply }: Props) {
  const [draft, setDraft] = useState(applied);
  const set = <K extends keyof ShopifyProductFilters>(key: K, value: ShopifyProductFilters[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply(draft);
  };

  const reset = () => {
    setDraft(EMPTY_PRODUCT_FILTERS);
    onApply(EMPTY_PRODUCT_FILTERS);
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2" aria-label="Ürün süzgeçleri">
      <FilterField label="Ara" wide>
        <input aria-label="Ara" value={draft.search} onChange={(e) => set('search', e.target.value)} className={fieldClass} placeholder="Ad, SKU, marka…" />
      </FilterField>
      <FilterSelectField label="Durum" value={draft.status} options={PRODUCT_STATUS_OPTIONS} allLabel="Tümü" onChange={(v) => set('status', v)} />
      <FilterSelectField label="Stok" value={draft.stock} options={STOCK_OPTIONS} allLabel="Tümü" onChange={(v) => set('stock', v)} />
      <button type="submit" className={primaryButtonClass}><Search size={14} aria-hidden /> Ara</button>
      {(hasActiveFilters({ ...applied }) || hasActiveFilters({ ...draft })) && (
        <button type="button" className={ghostButtonClass} onClick={reset}><RotateCcw size={14} aria-hidden /> Temizle</button>
      )}
    </form>
  );
}
