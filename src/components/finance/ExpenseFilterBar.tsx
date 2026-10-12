'use client';

import { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { FinanceExpense } from '../../types/api';
import { FilterSelect, type FilterSelectOption } from '../ui/FilterSelect';

// Gider listesinin istemci tarafı filtresi. Dönem sunucudan gelir; bu filtre yalnız o
// dönemin kayıtlarını daraltır (ad/not araması, tür, mağaza, kaynak).

const AD_CATEGORY = 1;

export type ExpenseKindFilter = '' | 'operating' | 'ads';
export type ExpenseSourceFilter = '' | 'manual' | 'template';

export interface ExpenseFilters {
  search: string;
  kind: ExpenseKindFilter;
  store: string;
  source: ExpenseSourceFilter;
}

export const EMPTY_EXPENSE_FILTERS: ExpenseFilters = { search: '', kind: '', store: '', source: '' };

export function hasActiveFilters(filters: ExpenseFilters): boolean {
  return filters.search.trim() !== '' || filters.kind !== '' || filters.store !== '' || filters.source !== '';
}

export function filterExpenses(expenses: FinanceExpense[], filters: ExpenseFilters): FinanceExpense[] {
  const term = filters.search.trim().toLocaleLowerCase('tr-TR');
  return expenses.filter((exp) => {
    if (term && !`${exp.name} ${exp.note ?? ''} ${exp.adPlatform ?? ''}`.toLocaleLowerCase('tr-TR').includes(term)) return false;
    if (filters.kind === 'ads' && exp.category !== AD_CATEGORY) return false;
    if (filters.kind === 'operating' && exp.category === AD_CATEGORY) return false;
    if (filters.store && exp.storeName !== filters.store) return false;
    if (filters.source === 'template' && exp.templateId === null) return false;
    if (filters.source === 'manual' && exp.templateId !== null) return false;
    return true;
  });
}

interface Props {
  expenses: FinanceExpense[];
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
  isTr: boolean;
}

export function ExpenseFilterBar({ expenses, filters, onChange, isTr }: Props) {
  const storeOptions = useMemo<FilterSelectOption[]>(() => {
    const names = [...new Set(expenses.map((e) => e.storeName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr-TR'));
    return names.map((name) => ({ value: name, label: name }));
  }, [expenses]);

  const kindOptions: FilterSelectOption[] = [
    { value: 'operating', label: isTr ? 'İşletme gideri' : 'Operating' },
    { value: 'ads', label: isTr ? 'Reklam' : 'Ads' },
  ];
  const sourceOptions: FilterSelectOption[] = [
    { value: 'manual', label: isTr ? 'Elle girilen' : 'Manual' },
    { value: 'template', label: isTr ? 'Şablondan' : 'From template' },
  ];

  const set = (patch: Partial<ExpenseFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border-soft)] px-3 py-2">
      <div className="relative min-w-[180px] flex-1">
        <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
        <input
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder={isTr ? 'Gider adı veya notta ara' : 'Search name or note'}
          className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--card)] pl-7 pr-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
        />
      </div>
      <FilterSelect value={filters.kind} options={kindOptions} placeholder={isTr ? 'Tür' : 'Type'}
        onChange={(v) => set({ kind: v as ExpenseKindFilter })} />
      <FilterSelect value={filters.store} options={storeOptions} placeholder={isTr ? 'Mağaza' : 'Store'}
        onChange={(v) => set({ store: v })} />
      <FilterSelect value={filters.source} options={sourceOptions} placeholder={isTr ? 'Kaynak' : 'Source'}
        onChange={(v) => set({ source: v as ExpenseSourceFilter })} />
      {hasActiveFilters(filters) && (
        <button type="button" onClick={() => onChange(EMPTY_EXPENSE_FILTERS)}
          className="inline-flex h-8 items-center gap-1 rounded-[4px] px-2 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]">
          <X size={12} /> {isTr ? 'Temizle' : 'Clear'}
        </button>
      )}
    </div>
  );
}
