'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ShopifyCatalogAuthority } from '../../lib/api/shopify';
import { shopifyProductsApi, type ShopifyProductDetailDto } from '../../lib/api/shopify-products';
import { surfaceCard } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { ExplorerState } from './ExplorerState';
import { ProductCollectionsSection } from './ProductCollectionsSection';
import { ProductForm } from './ProductForm';
import { ProductImagesSection } from './ProductImagesSection';
import {
  buildProductBody, emptyProductForm, formFromDetail, hasChanges, isStockPriceLocked, validateProductForm, type VariantFormState,
} from './productFormRules';
import { ProductExistingOptions } from './ProductExistingOptions';
import { writeWithPriceGuard } from './priceGuardRules';
import { useWriteAction } from './useWriteAction';

interface Props {
  storeId: number;
  // null = yeni ürün.
  productId: number | null;
  authority: ShopifyCatalogAuthority;
  onClose: () => void;
  // Liste yenilensin (kaydedildi / kısmen kaydedildi).
  onSaved: () => Promise<void>;
  // Yeni ürün açıldı: görsel/koleksiyon eklemek için düzenleme moduna geçilir.
  onCreated: (productId: number) => void;
}

// Ürün düzenleyici: mevcut ürünü canlı okur (liste özetinde olmayan açıklama/görsel/koleksiyon için), formu doldurur.
export function ProductEditor(props: Props) {
  const { storeId, productId } = props;
  const detail = useQuery({
    queryKey: ['shopify', 'product', storeId, productId],
    queryFn: () => shopifyProductsApi.detail(storeId, productId as number),
    enabled: productId !== null,
  });

  if (productId === null) return <EditorFrame><ProductEditorBody key="new" {...props} detail={null} onReload={async () => null} /></EditorFrame>;

  return (
    <EditorFrame>
      <ExplorerState loading={detail.isLoading} error={detail.error} isEmpty={!detail.data} emptyTitle="Ürün bulunamadı" onRetry={() => void detail.refetch()}>
        {detail.data && (
          <ProductEditorBody
            key={productId} {...props} detail={detail.data}
            onReload={async () => (await detail.refetch()).data ?? null}
          />
        )}
      </ExplorerState>
    </EditorFrame>
  );
}

function EditorFrame({ children }: { children: ReactNode }) {
  return <div className={`${surfaceCard} flex flex-col gap-3 p-3`}>{children}</div>;
}

interface BodyProps extends Props {
  detail: ShopifyProductDetailDto | null;
  onReload: () => Promise<ShopifyProductDetailDto | null>;
}

function ProductEditorBody({ storeId, productId, authority, detail, onClose, onSaved, onCreated, onReload }: BodyProps) {
  const { notify, confirm } = useFeedback();
  const { busy, run } = useWriteAction(onSaved);
  const [baseline, setBaseline] = useState(() => (detail ? formFromDetail(detail) : emptyProductForm()));
  const [form, setForm] = useState(baseline);
  const locked = isStockPriceLocked(authority);
  const isNew = productId === null;

  // Kaydedilen ürünün güncel hali yeniden okunur: sonraki kayıtta yalnız yeni değişiklikler gider.
  const resetFromShopify = async () => {
    const fresh = await onReload();
    if (!fresh) return;
    const next = formFromDetail(fresh);
    setBaseline(next);
    setForm(next);
  };

  const reload = async () => {
    await onReload();
  };

  // Mağazadaki varyantı siler; ürün yeniden okunur (kaydedilmemiş form değişiklikleri sıfırlanır).
  const deleteVariant = async (variant: VariantFormState) => {
    if (productId === null || variant.id === null) return;
    const ok = await confirm({
      title: 'Varyant Shopify\'dan silinsin mi?',
      body: 'Varyant ve stok kaydı kaldırılır; kaydedilmemiş form değişiklikleriniz sıfırlanır. Bu işlem geri alınamaz.',
      confirmLabel: 'Varyantı sil',
      danger: true,
    });
    if (ok) await run(() => shopifyProductsApi.deleteVariant(storeId, productId, variant.id as number), 'Varyant silindi.', () => void resetFromShopify());
  };

  const save = async () => {
    const problem = validateProductForm(form);
    if (problem) return notify.error(problem);
    const body = buildProductBody(form, locked, isNew ? undefined : baseline);
    if (!isNew && !hasChanges(body)) return notify.info('Değişiklik yok.');

    if (productId === null) {
      await run(() => shopifyProductsApi.create(storeId, body), 'Ürün oluşturuldu.', (result) => {
        if (result.id !== null) onCreated(result.id);
      });
    } else {
      const askConfirmation = (message: string) => confirm({ title: 'Büyük fiyat değişikliği onaylansın mı?', body: message, confirmLabel: 'Onayla ve yaz', danger: true });
      const update = (confirmLargePriceChange: boolean) => shopifyProductsApi.update(storeId, productId, { ...body, confirmLargePriceChange });
      await run(() => writeWithPriceGuard(update, askConfirmation), 'Ürün güncellendi.', () => void resetFromShopify());
    }
  };

  return (
    <>
      <ProductForm
        form={form} title={isNew ? 'Yeni ürün' : `Ürünü düzenle: ${baseline.title}`} locked={locked} busy={busy}
        canDefineOptions={isNew} onChange={setForm} onSubmit={() => void save()} onCancel={onClose}
        onDeleteVariant={isNew ? undefined : (variant) => void deleteVariant(variant)}
      />
      {productId === null
        ? <p className="m-0 text-ui-2xs text-fg-muted">Görsel ve koleksiyon eklemek için önce ürünü kaydedin.</p>
        : detail && (
          <>
            {baseline.existingOptions.length > 0 && (
              <ProductExistingOptions
                storeId={storeId} productId={productId} options={baseline.existingOptions} onChanged={resetFromShopify}
              />
            )}
            <ProductImagesSection storeId={storeId} productId={productId} images={detail.images} onChanged={reload} />
            <ProductCollectionsSection storeId={storeId} productId={productId} collections={detail.collections} onChanged={reload} />
          </>
        )}
    </>
  );
}
