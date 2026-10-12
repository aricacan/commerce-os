'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { ShopifyCatalogAuthority } from '../../lib/api/shopify';
import { ProductEditor } from './ProductEditor';
import { ProductRemovalButtons } from './ProductRemovalButtons';
import { ghostButtonClass } from './styles';
import { useProductRemoval } from './useProductRemoval';

interface Props {
  storeId: number;
  // null = yeni ürün.
  productId: number | null;
  authority: ShopifyCatalogAuthority;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onCreated: (productId: number) => void;
}

const UNNAMED_PRODUCT = 'Bu ürün';

// Ürün düzenleyicinin TAM görünümü (sipariş detayıyla aynı kalıp): liste gizlenir, sayfa düzenleyicinin başına kaydırılır.
// Aksi hâlde uzun listenin altındayken "Düzenle"ye basınca form ekran dışında açılıp "çalışmıyor" gibi görünüyordu.
export function ProductEditorView({ storeId, productId, authority, onClose, onChanged, onCreated }: Props) {
  const topRef = useRef<HTMLDivElement>(null);
  const removal = useProductRemoval(storeId, onChanged);

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' });
  }, [productId]);

  // Arşivleme/silme sonrası ürün listeye dönülür (form artık güncel durumu yansıtmaz).
  const archive = async () => {
    if (productId !== null && (await removal.archive(productId, UNNAMED_PRODUCT))) onClose();
  };

  const remove = async () => {
    if (productId !== null && (await removal.remove(productId, UNNAMED_PRODUCT))) onClose();
  };

  return (
    <div ref={topRef} className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center gap-2">
        <button type="button" className={ghostButtonClass} onClick={onClose}><ArrowLeft size={14} aria-hidden /> Ürünler</button>
        {productId !== null && (
          <span className="ml-auto">
            <ProductRemovalButtons title={UNNAMED_PRODUCT} isArchived={false} busy={removal.busy} onArchive={() => void archive()} onDelete={() => void remove()} />
          </span>
        )}
      </header>
      <ProductEditor
        key={productId ?? 'new'} storeId={storeId} productId={productId} authority={authority}
        onClose={onClose} onSaved={onChanged} onCreated={onCreated}
      />
    </div>
  );
}
