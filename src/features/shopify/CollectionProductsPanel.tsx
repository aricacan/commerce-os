'use client';

import { useState, type SyntheticEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import type { ShopifyCollectionProductDto } from '../../lib/api/shopify-store-content';
import { shopifyExplorerApi } from '../../lib/api/shopify-explorer';
import { explorerErrorText } from './explorerRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';
import { iconButtonClass, listRowClass } from './contentStyles';

interface Props {
  storeId: number;
  products: ShopifyCollectionProductDto[];
  busy: boolean;
  onAdd: (productId: number) => void;
  onRemove: (product: ShopifyCollectionProductDto) => void;
}

// Sunucu detayda ilk bu kadar ürünü döner; tamamı için Shopify yönetimi kullanılır.
const DETAIL_PRODUCT_LIMIT = 50;
const EMPTY_PRODUCT_FILTERS = { search: '', status: '', stock: '' };

// Manuel koleksiyonun ürünleri: çıkar + mağaza ürünlerinde ara-ekle. Akıllı koleksiyonda bu panel gösterilmez.
export function CollectionProductsPanel({ storeId, products, busy, onAdd, onRemove }: Props) {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const memberIds = new Set(products.map((p) => p.id));

  const found = useQuery({
    queryKey: ['shopify', 'collection-product-search', storeId, search],
    queryFn: () => shopifyExplorerApi.products(storeId, { ...EMPTY_PRODUCT_FILTERS, search }, null),
    enabled: search !== '',
  });

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    setSearch(draft.trim());
  };

  return (
    <div className="flex flex-col gap-3">
      <h4 className="m-0 text-ui-xs font-bold text-fg">Koleksiyondaki ürünler ({products.length}{products.length >= DETAIL_PRODUCT_LIMIT ? '+' : ''})</h4>
      {products.length === 0 && <p className="m-0 text-ui-xs text-fg-muted">Koleksiyonda ürün yok.</p>}
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {products.map((product) => (
          <li key={product.id} className={listRowClass}>
            <span className="min-w-0 flex-1 break-words text-ui-xs text-fg">{product.title}</span>
            <button type="button" className={iconButtonClass} aria-label={`${product.title} koleksiyondan çıkar`} disabled={busy} onClick={() => onRemove(product)}>
              <X size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex items-end gap-2" aria-label="Ürün ara">
        <label className="flex flex-1 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Ürün ekle (başlık ya da SKU ara)
          <input value={draft} onChange={(e) => setDraft(e.target.value)} className={fieldClass} />
        </label>
        <button type="submit" className={primaryButtonClass}><Search size={14} aria-hidden /> Ara</button>
      </form>
      {found.isLoading && <p className="m-0 text-ui-xs text-fg-muted">Aranıyor…</p>}
      {found.error && <p role="alert" className="m-0 text-ui-xs text-danger">{explorerErrorText(found.error)}</p>}
      {found.data && found.data.items.length === 0 && <p className="m-0 text-ui-xs text-fg-muted">Ürün bulunamadı.</p>}
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {found.data?.items.map((product) => (
          <li key={product.id} className={listRowClass}>
            <span className="min-w-0 flex-1 break-words text-ui-xs text-fg">{product.title}</span>
            {memberIds.has(product.id)
              ? <span className="text-ui-2xs text-fg-muted">Zaten ekli</span>
              : (
                <button type="button" className={ghostButtonClass} disabled={busy} onClick={() => onAdd(product.id)}>
                  <Plus size={14} aria-hidden /> Ekle
                </button>
              )}
          </li>
        ))}
      </ul>
    </div>
  );
}
