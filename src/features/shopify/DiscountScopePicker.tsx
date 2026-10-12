'use client';

import { useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import { FormSelect, type FormSelectOption } from '../../components/ui/FormSelect';
import { shopifyExplorerApi } from '../../lib/api/shopify-explorer';
import type { ShopifyScopeItem } from '../../lib/api/shopify-promotions';
import { shopifyStoreContentApi } from '../../lib/api/shopify-store-content';
import { iconButtonClass, listRowClass } from './contentStyles';
import {
  SCOPE_MAX_ITEMS, SCOPE_MODE, addScopeItem, changeScopeMode, removeScopeItem, selectedItems,
  type ScopeFormState, type ScopeMode,
} from './discountScope';
import { EMPTY_PRODUCT_FILTERS, explorerErrorText } from './explorerRules';
import { fieldClass, ghostButtonClass } from './styles';

interface Props {
  storeId: number;
  label: string;
  value: ScopeFormState;
  onChange: (value: ScopeFormState) => void;
  // X al Y öde "tüm ürünler"i desteklemez.
  allowAll: boolean;
}

const ALL_OPTION: FormSelectOption<ScopeMode> = { value: SCOPE_MODE.All, label: 'Tüm ürünler' };
const MODE_OPTIONS: FormSelectOption<ScopeMode>[] = [
  { value: SCOPE_MODE.Products, label: 'Seçili ürünler' },
  { value: SCOPE_MODE.Collections, label: 'Seçili koleksiyonlar' },
];

// İndirim kapsamı: tüm ürünler / seçili ürünler / seçili koleksiyonlar. Mevcut ürün ve koleksiyon arama uçlarını kullanır.
export function DiscountScopePicker({ storeId, label, value, onChange, allowAll }: Props) {
  const selected = selectedItems(value);

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 rounded-md border border-border-soft p-3">
      <legend className="px-1 text-ui-2xs font-semibold text-fg-muted">{label}</legend>
      <FormSelect
        value={value.mode} options={allowAll ? [ALL_OPTION, ...MODE_OPTIONS] : MODE_OPTIONS}
        onChange={(mode) => onChange(changeScopeMode(mode))}
      />
      {value.mode !== SCOPE_MODE.All && (
        <>
          <SelectedItems items={selected} onRemove={(id) => onChange(removeScopeItem(value, id))} />
          <ItemSearch
            storeId={storeId} mode={value.mode} selectedIds={new Set(selected.map((item) => item.id))}
            limitReached={selected.length >= SCOPE_MAX_ITEMS} onAdd={(item) => onChange(addScopeItem(value, item))}
          />
        </>
      )}
    </fieldset>
  );
}

function SelectedItems({ items, onRemove }: { items: ShopifyScopeItem[]; onRemove: (id: number) => void }) {
  if (items.length === 0) return <p className="m-0 text-ui-2xs text-fg-muted">Henüz seçim yok.</p>;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
      {items.map((item) => (
        <li key={item.id} className="inline-flex max-w-full items-center gap-1 rounded-md bg-bg-subtle px-2 py-1 text-ui-2xs text-fg">
          <span className="min-w-0 break-words">{item.title}</span>
          <button type="button" className="inline-flex shrink-0 text-fg-muted hover:text-fg" aria-label={`${item.title} kapsamdan çıkar`} onClick={() => onRemove(item.id)}>
            <X size={12} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

interface SearchProps {
  storeId: number;
  mode: ScopeMode;
  selectedIds: ReadonlySet<number>;
  limitReached: boolean;
  onAdd: (item: ShopifyScopeItem) => void;
}

function ItemSearch({ storeId, mode, selectedIds, limitReached, onAdd }: SearchProps) {
  const isProducts = mode === SCOPE_MODE.Products;
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');

  // Ürünler arama olmadan listelenmez (katalog büyük); koleksiyonlar ilk sayfadan hemen gelir.
  const found = useQuery({
    queryKey: ['shopify', 'discount-scope-search', storeId, mode, search],
    queryFn: async (): Promise<ShopifyScopeItem[]> => isProducts
      ? (await shopifyExplorerApi.products(storeId, { ...EMPTY_PRODUCT_FILTERS, search }, null)).items
      : (await shopifyStoreContentApi.collections(storeId, search, null)).items,
    enabled: !isProducts || search !== '',
  });

  const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    setSearch(draft.trim());
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          {isProducts ? 'Ürün ara (başlık ya da SKU)' : 'Koleksiyon ara'}
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={submitOnEnter} className={fieldClass} />
        </label>
        <button type="button" className={ghostButtonClass} onClick={() => setSearch(draft.trim())}>
          <Search size={14} aria-hidden /> Ara
        </button>
      </div>
      {limitReached && <p className="m-0 text-ui-2xs text-danger">En fazla {SCOPE_MAX_ITEMS} seçim yapılabilir.</p>}
      {found.isLoading && <p className="m-0 text-ui-xs text-fg-muted">Aranıyor…</p>}
      {found.error && <p role="alert" className="m-0 text-ui-xs text-danger">{explorerErrorText(found.error)}</p>}
      {found.data?.length === 0 && <p className="m-0 text-ui-xs text-fg-muted">Sonuç bulunamadı.</p>}
      <ul className="m-0 flex max-h-48 list-none flex-col gap-1 overflow-y-auto p-0">
        {found.data?.map((item) => (
          <li key={item.id} className={listRowClass}>
            <span className="min-w-0 flex-1 break-words text-ui-xs text-fg">{item.title}</span>
            {selectedIds.has(item.id)
              ? <span className="text-ui-2xs text-fg-muted">Seçili</span>
              : (
                <button type="button" className={iconButtonClass} aria-label={`${item.title} ekle`} disabled={limitReached} onClick={() => onAdd({ id: item.id, title: item.title })}>
                  <Plus size={14} aria-hidden />
                </button>
              )}
          </li>
        ))}
      </ul>
    </div>
  );
}
