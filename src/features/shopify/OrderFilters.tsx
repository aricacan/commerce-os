'use client';

import { useState, type FormEvent } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import type { ShopifyOrderFilters } from '../../lib/api/shopify-explorer';
import {
  EMPTY_ORDER_FILTERS, FINANCIAL_OPTIONS, FULFILLMENT_OPTIONS, ORDER_STATUS_OPTIONS, hasActiveFilters,
} from './explorerRules';
import { DateRangeFilter } from './DateRangeFilter';
import { FilterField, FilterSelectField } from './FilterField';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  applied: ShopifyOrderFilters;
  onApply: (filters: ShopifyOrderFilters) => void;
}

// Sipariş süzgeçleri: değişiklikler "Ara" ile (ya da Enter) uygulanır — her tuşta Shopify'a istek gitmez.
export function OrderFilters({ applied, onApply }: Props) {
  const [draft, setDraft] = useState(applied);
  const [resetCount, setResetCount] = useState(0);
  const set = <K extends keyof ShopifyOrderFilters>(key: K, value: ShopifyOrderFilters[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply(draft);
  };

  const reset = () => {
    setDraft(EMPTY_ORDER_FILTERS);
    setResetCount((count) => count + 1);
    onApply(EMPTY_ORDER_FILTERS);
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2" aria-label="Sipariş süzgeçleri">
      <FilterField label="Ara" wide>
        <input aria-label="Ara" value={draft.search} onChange={(e) => set('search', e.target.value)} className={fieldClass} placeholder="Sipariş no, müşteri, e-posta…" />
      </FilterField>
      <FilterSelectField label="Durum" value={draft.status} options={ORDER_STATUS_OPTIONS} allLabel="Tümü" onChange={(v) => set('status', v)} />
      <FilterSelectField label="Ödeme" value={draft.financialStatus} options={FINANCIAL_OPTIONS} allLabel="Tümü" onChange={(v) => set('financialStatus', v)} />
      <FilterSelectField label="Karşılama" value={draft.fulfillmentStatus} options={FULFILLMENT_OPTIONS} allLabel="Tümü" onChange={(v) => set('fulfillmentStatus', v)} />
      <DateRangeFilter
        key={resetCount} from={draft.from} to={draft.to}
        onChange={(range) => setDraft((current) => ({ ...current, ...range }))}
      />
      <button type="submit" className={primaryButtonClass}><Search size={14} aria-hidden /> Ara</button>
      {(hasActiveFilters({ ...applied }) || hasActiveFilters({ ...draft })) && (
        <button type="button" className={ghostButtonClass} onClick={reset}><RotateCcw size={14} aria-hidden /> Temizle</button>
      )}
    </form>
  );
}
