'use client';

import { useState } from 'react';
import { Plus, Search, Sparkles } from 'lucide-react';
import type { SaveShopifyCollectionBody } from '../../lib/api/shopify-store-content';
import { shopifyStoreContentApi } from '../../lib/api/shopify-store-content';
import { CollectionDetailPanel } from './CollectionDetailPanel';
import { CollectionForm } from './CollectionForm';
import { CollectionTreeView } from './CollectionTreeView';
import { ExplorerState } from './ExplorerState';
import { fieldClass, ghostButtonClass } from './styles';
import { useAllCollections } from './useAllCollections';
import { useInvalidatingWrite } from './useInvalidatingWrite';
import { VehicleSuggestionPanel } from './VehicleSuggestionPanel';

interface Props {
  storeId: number;
}

// Koleksiyonlar: Marka → Model ağacı (arama süzer, eşleşen dalları açar), yeni koleksiyon (manuel / akıllı),
// düğüme tıklayınca detay + düzenleme + ürün yönetimi. Ağaç dar ekranda da çalışır (sürükleme yok, dokunmatik uyumlu).
export function CollectionsTab({ storeId }: Props) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { writing, run } = useInvalidatingWrite(['shopify', 'collections', storeId]);
  const list = useAllCollections(storeId);

  const create = async (body: SaveShopifyCollectionBody) => {
    if (await run(() => shopifyStoreContentApi.createCollection(storeId, body), 'Koleksiyon oluşturuldu.')) setCreating(false);
  };

  const collections = list.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-0 basis-full items-center sm:max-w-80 sm:flex-[2] sm:basis-56">
          <Search size={14} aria-hidden className="pointer-events-none absolute left-2 text-fg-muted" />
          <input
            type="search" aria-label="Koleksiyon ara" value={query} onChange={(e) => setQuery(e.target.value)}
            className={`${fieldClass} pl-7`} placeholder="Marka, model ya da koleksiyon ara"
          />
        </label>
        <button type="button" className={ghostButtonClass} onClick={() => setCreating(true)}><Plus size={14} aria-hidden /> Yeni koleksiyon</button>
        <button type="button" className={ghostButtonClass} aria-expanded={suggesting} onClick={() => setSuggesting((v) => !v)}>
          <Sparkles size={14} aria-hidden /> Öneri üret
        </button>
      </div>
      {suggesting && <VehicleSuggestionPanel storeId={storeId} />}
      {creating && <CollectionForm busy={writing} onSubmit={(body) => void create(body)} onCancel={() => setCreating(false)} />}
      {selectedId !== null && (
        <CollectionDetailPanel key={selectedId} storeId={storeId} collectionId={selectedId} onClose={() => setSelectedId(null)} />
      )}
      <ExplorerState
        loading={list.isLoading} error={list.error} isEmpty={collections.length === 0}
        emptyTitle="Mağazada koleksiyon yok" onRetry={() => void list.refetch()}
      >
        <CollectionTreeView collections={collections} query={query} selectedId={selectedId} onSelect={setSelectedId} />
      </ExplorerState>
    </div>
  );
}
