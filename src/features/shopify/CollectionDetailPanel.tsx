'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Trash2, X } from 'lucide-react';
import { shopifyStoreContentApi, type SaveShopifyCollectionBody } from '../../lib/api/shopify-store-content';
import { surfaceCard } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { CollectionForm } from './CollectionForm';
import { CollectionProductsPanel } from './CollectionProductsPanel';
import { ruleSummary } from './collectionRules';
import { ExplorerState } from './ExplorerState';
import { ghostButtonClass } from './styles';
import { useInvalidatingWrite } from './useInvalidatingWrite';

interface Props {
  storeId: number;
  collectionId: number;
  onClose: () => void;
}

// Seçili koleksiyonun detayı: kural özeti (akıllı) ya da ürün yönetimi (manuel), düzenleme ve silme.
export function CollectionDetailPanel({ storeId, collectionId, onClose }: Props) {
  const { confirm } = useFeedback();
  const [editing, setEditing] = useState(false);
  const { writing, run } = useInvalidatingWrite(['shopify', 'collections', storeId]);

  const detail = useQuery({
    queryKey: ['shopify', 'collections', storeId, 'detail', collectionId],
    queryFn: () => shopifyStoreContentApi.collection(storeId, collectionId),
  });
  const collection = detail.data;

  const save = async (body: SaveShopifyCollectionBody) => {
    if (await run(() => shopifyStoreContentApi.updateCollection(storeId, collectionId, body), 'Koleksiyon güncellendi.')) setEditing(false);
  };

  const remove = async () => {
    if (!collection) return;
    const ok = await confirm({
      title: 'Koleksiyon Shopify\'dan silinsin mi?',
      body: `"${collection.title}" silinir (ürünler silinmez). Bu koleksiyona bağlı menü öğeleri bozulur. Bu işlem geri alınamaz.`,
      confirmLabel: 'Koleksiyonu sil',
      danger: true,
    });
    if (ok && await run(() => shopifyStoreContentApi.deleteCollection(storeId, collectionId), 'Koleksiyon silindi.')) onClose();
  };

  const changeProducts = (productIds: number[], removing: boolean, text: string) =>
    run(() => (removing
      ? shopifyStoreContentApi.removeCollectionProducts(storeId, collectionId, productIds)
      : shopifyStoreContentApi.addCollectionProducts(storeId, collectionId, productIds)), text);

  return (
    <section className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="Koleksiyon detayı">
      <ExplorerState loading={detail.isLoading} error={detail.error} isEmpty={!collection} emptyTitle="Koleksiyon bulunamadı" onRetry={() => void detail.refetch()}>
        {collection && (
          <>
            <header className="flex flex-wrap items-center gap-2">
              <h3 className="m-0 min-w-0 flex-1 break-words text-ui-sm font-bold text-fg">{collection.title}</h3>
              <button type="button" className={ghostButtonClass} onClick={() => setEditing((v) => !v)}><Pencil size={14} aria-hidden /> Düzenle</button>
              <button type="button" className={ghostButtonClass} disabled={writing} onClick={() => void remove()}><Trash2 size={14} aria-hidden /> Sil</button>
              <button type="button" className={ghostButtonClass} aria-label="Detayı kapat" onClick={onClose}><X size={14} aria-hidden /></button>
            </header>
            {editing && <CollectionForm original={collection} busy={writing} onSubmit={(body) => void save(body)} onCancel={() => setEditing(false)} />}
            {collection.isSmart ? (
              <div className="flex flex-col gap-1">
                <h4 className="m-0 text-ui-xs font-bold text-fg">
                  Kurallar ({collection.appliedDisjunctively ? 'herhangi biri' : 'tüm koşullar'})
                </h4>
                <ul className="m-0 list-disc pl-5 text-ui-xs text-fg">
                  {collection.rules.map((rule, index) => <li key={index}>{ruleSummary(rule)}</li>)}
                </ul>
              </div>
            ) : (
              <CollectionProductsPanel
                storeId={storeId} products={collection.products} busy={writing}
                onAdd={(id) => void changeProducts([id], false, 'Ürün koleksiyona eklendi.')}
                onRemove={(product) => void changeProducts([product.id], true, 'Ürün koleksiyondan çıkarıldı.')}
              />
            )}
          </>
        )}
      </ExplorerState>
    </section>
  );
}
