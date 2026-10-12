'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { shopifyProductsApi, type ShopifyCollectionRefDto } from '../../lib/api/shopify-products';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { ghostButtonClass } from './styles';
import { useWriteAction } from './useWriteAction';

interface Props {
  storeId: number;
  productId: number;
  collections: ShopifyCollectionRefDto[];
  onChanged: () => Promise<void>;
}

const OPTIONS_STALE_MS = 60_000;

// Ürünün koleksiyonları: çıkar ya da (elle yönetilen) başka koleksiyona ekle. Akıllı koleksiyonlar kurallarla dolar.
export function ProductCollectionsSection({ storeId, productId, collections, onChanged }: Props) {
  const { busy, run } = useWriteAction(onChanged);
  const [selected, setSelected] = useState('');
  const options = useQuery({
    queryKey: ['shopify', 'collection-options', storeId],
    queryFn: () => shopifyProductsApi.collectionOptions(storeId),
    staleTime: OPTIONS_STALE_MS,
  });

  const memberIds = new Set(collections.map((c) => c.id));
  const addable = (options.data ?? []).filter((c) => !memberIds.has(c.id));

  const add = async () => {
    if (await run(() => shopifyProductsApi.addToCollection(storeId, productId, Number(selected)), 'Koleksiyona eklendi.')) setSelected('');
  };

  return (
    <section className="flex flex-col gap-2 rounded-md border border-border-soft p-3" aria-label="Koleksiyonlar">
      <h4 className="m-0 text-ui-xs font-semibold text-fg">Koleksiyonlar</h4>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {collections.map((collection) => (
          <li key={collection.id} className="inline-flex items-center gap-1 rounded-md border border-border-soft px-2 py-1 text-ui-xs text-fg">
            {collection.title}
            <button
              type="button" aria-label={`${collection.title} koleksiyonundan çıkar`} disabled={busy}
              className="text-fg-muted hover:text-fg"
              onClick={() => void run(() => shopifyProductsApi.removeFromCollection(storeId, productId, collection.id), 'Koleksiyondan çıkarıldı.')}
            >
              <X size={12} aria-hidden />
            </button>
          </li>
        ))}
        {collections.length === 0 && <li className="text-ui-2xs text-fg-muted">Hiçbir koleksiyonda değil.</li>}
      </ul>
      {options.error && <p role="alert" className="m-0 text-ui-2xs text-danger">Koleksiyonlar yüklenemedi.</p>}
      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-ui-2xs font-semibold text-fg-muted">Koleksiyona ekle</span>
          <SearchableSelect
            value={selected} onChange={setSelected} placeholder="Seçin…" searchPlaceholder="Koleksiyon ara..."
            options={addable.map((collection) => ({ value: String(collection.id), label: collection.title }))}
          />
        </div>
        <button type="button" className={ghostButtonClass} disabled={busy || !selected} onClick={() => void add()}>
          <Plus size={14} aria-hidden /> Ekle
        </button>
      </div>
    </section>
  );
}
