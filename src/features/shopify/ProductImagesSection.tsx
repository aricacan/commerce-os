'use client';

import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Link2, Trash2 } from 'lucide-react';
import { shopifyProductsApi, type ShopifyProductImageDto } from '../../lib/api/shopify-products';
import { useFeedback } from '../shared/Feedback';
import { moveImage } from './productFormRules';
import { ProductImageAlt } from './ProductImageAlt';
import { fieldClass, ghostButtonClass } from './styles';
import { useWriteAction } from './useWriteAction';

interface Props {
  storeId: number;
  productId: number;
  images: ShopifyProductImageDto[];
  onChanged: () => Promise<void>;
}

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp';

// Ürün görselleri: dosya yükle / adresle ekle, sırala (yukarı-aşağı), sil. Yeni görsel Shopify'da işlenirken
// birkaç saniye görünmeyebilir; liste yenilenince gelir.
export function ProductImagesSection({ storeId, productId, images, onChanged }: Props) {
  const { confirm } = useFeedback();
  const { busy, run } = useWriteAction(onChanged);
  const [url, setUrl] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const addUrl = async () => {
    if (await run(() => shopifyProductsApi.addImageUrl(storeId, productId, url.trim()), 'Görsel eklendi.')) setUrl('');
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    await run(() => shopifyProductsApi.uploadImage(storeId, productId, file), 'Görsel yüklendi.');
    if (fileInput.current) fileInput.current.value = '';
  };

  const move = (index: number, direction: -1 | 1) => {
    const order = moveImage(images.map((image) => image.id), index, direction);
    if (order) void run(() => shopifyProductsApi.reorderImages(storeId, productId, order), 'Görsel sırası güncellendi.');
  };

  const remove = async (image: ShopifyProductImageDto) => {
    const ok = await confirm({
      title: 'Görsel Shopify\'dan silinsin mi?',
      body: 'Görsel mağaza dosyalarından da kaldırılır. Bu işlem geri alınamaz.',
      confirmLabel: 'Görseli sil',
      danger: true,
    });
    if (ok) await run(() => shopifyProductsApi.deleteImage(storeId, productId, image.id), 'Görsel silindi.');
  };

  return (
    <section className="flex flex-col gap-2 rounded-md border border-border-soft p-3" aria-label="Görseller">
      <h4 className="m-0 text-ui-xs font-semibold text-fg">Görseller</h4>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {images.map((image, index) => (
          <li key={`${image.id}-${image.alt ?? ''}`} className="flex w-44 flex-col gap-1 rounded-md border border-border-soft p-1">
            <div className="flex h-24 items-center justify-center overflow-hidden rounded bg-bg-subtle">
              {image.url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={image.url} alt={image.alt ?? `Görsel ${index + 1}`} className="h-full w-full object-contain" />
                : <span className="text-ui-2xs text-fg-muted">İşleniyor…</span>}
            </div>
            <div className="flex justify-between gap-1">
              <button type="button" className={ghostButtonClass} aria-label="Yukarı taşı" disabled={busy || index === 0} onClick={() => move(index, -1)}>
                <ArrowUp size={14} aria-hidden />
              </button>
              <button type="button" className={ghostButtonClass} aria-label="Aşağı taşı" disabled={busy || index === images.length - 1} onClick={() => move(index, 1)}>
                <ArrowDown size={14} aria-hidden />
              </button>
              <button type="button" className={ghostButtonClass} aria-label="Görseli sil" disabled={busy} onClick={() => void remove(image)}>
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
            <ProductImageAlt
              storeId={storeId} productId={productId} image={image} position={index + 1} disabled={busy} onChanged={onChanged}
            />
          </li>
        ))}
        {images.length === 0 && <li className="text-ui-2xs text-fg-muted">Henüz görsel yok.</li>}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <input
          ref={fileInput} type="file" accept={ACCEPTED_TYPES} className="hidden" aria-label="Görsel dosyası seç"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
        <button type="button" className={ghostButtonClass} disabled={busy} onClick={() => fileInput.current?.click()}>
          <ImagePlus size={14} aria-hidden /> Dosya yükle
        </button>
        <label className="flex min-w-0 flex-1 basis-56 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Ya da görsel adresi
          <input className={fieldClass} value={url} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} />
        </label>
        <button type="button" className={ghostButtonClass} disabled={busy || !url.trim()} onClick={() => void addUrl()}>
          <Link2 size={14} aria-hidden /> Adresle ekle
        </button>
      </div>
    </section>
  );
}
