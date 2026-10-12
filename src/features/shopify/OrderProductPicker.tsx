'use client';

import { useState, type SyntheticEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { shopifyExplorerApi, type ShopifyProductListItemDto, type ShopifyVariantDto } from '../../lib/api/shopify-explorer';
import { EMPTY_PRODUCT_FILTERS, explorerErrorText } from './explorerRules';
import type { PickedVariant } from './orderEditRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  storeId: number;
  // Sipariş para birimi etiketi için (ör. EUR).
  currency: string;
  onPick: (variant: PickedVariant) => void;
}

const DEFAULT_VARIANT_TITLE = 'Default Title';
const SEARCH_STALE_MS = 30_000;

// Ürün / SKU arama: mağaza ürünlerini canlı arar; SKU'su ve fiyatı olan varyant eklenebilir (sipariş kalemi SKU ile eşlenir).
export function OrderProductPicker({ storeId, currency, onPick }: Props) {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const results = useQuery({
    queryKey: ['shopify', 'order-product-picker', storeId, search],
    queryFn: () => shopifyExplorerApi.products(storeId, { ...EMPTY_PRODUCT_FILTERS, search }, null),
    enabled: search !== '',
    staleTime: SEARCH_STALE_MS,
  });

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    setSearch(draft.trim());
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} className="flex items-end gap-2" aria-label="Ürün arama">
        <label className="flex flex-1 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Ürün adı ya da SKU ara
          <input value={draft} onChange={(e) => setDraft(e.target.value)} className={fieldClass} />
        </label>
        <button type="submit" className={primaryButtonClass} disabled={draft.trim() === ''}><Search size={14} aria-hidden /> Ara</button>
      </form>
      {results.isFetching && <p className="m-0 text-ui-2xs text-fg-muted">Aranıyor…</p>}
      {results.error && <p role="alert" className="m-0 text-ui-xs text-danger">Arama çalışmadı: {explorerErrorText(results.error)}</p>}
      {results.data?.items.length === 0 && <p className="m-0 text-ui-xs text-fg-muted">Aramaya uyan ürün yok.</p>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {results.data?.items.map((product) => (
          <ProductResult key={product.id} product={product} currency={currency} onPick={onPick} />
        ))}
      </ul>
    </div>
  );
}

function variantLabel(product: ShopifyProductListItemDto, variant: ShopifyVariantDto): string {
  const showVariant = variant.title && variant.title !== DEFAULT_VARIANT_TITLE;
  return showVariant ? `${product.title} — ${variant.title}` : product.title;
}

interface ResultProps {
  product: ShopifyProductListItemDto;
  currency: string;
  onPick: (variant: PickedVariant) => void;
}

function ProductResult({ product, currency, onPick }: ResultProps) {
  return (
    <li className="flex flex-col gap-1 rounded-md border border-border-soft bg-card px-3 py-2">
      <span className="break-words text-ui-xs font-bold text-fg">{product.title}</span>
      {product.variants.map((variant, index) => {
        const addable = Boolean(variant.sku) && variant.price !== null;
        return (
          <div key={`${variant.sku ?? 'sku-yok'}-${index}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ui-xs">
            <span className="w-36 shrink-0 break-all font-mono text-ui-2xs">{variant.sku ?? 'SKU yok'}</span>
            <span className="min-w-0 flex-1 basis-20 truncate text-fg-muted">{variant.title}</span>
            <span>{variant.price === null ? '—' : `${variant.price.toFixed(2)} ${currency}`}</span>
            <span className="text-fg-muted">Stok {variant.inventoryQuantity ?? '—'}</span>
            <button
              type="button" className={ghostButtonClass} disabled={!addable}
              onClick={() => onPick({ sku: variant.sku as string, title: variantLabel(product, variant), unitPrice: variant.price as number })}
            >
              <Plus size={14} aria-hidden /> Ekle
            </button>
          </div>
        );
      })}
    </li>
  );
}
