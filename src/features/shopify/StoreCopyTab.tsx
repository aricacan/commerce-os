'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { FormSelect } from '../../components/ui/FormSelect';
import {
  shopifyAiCatalogApi, type ShopifyCopyApplyResultDto, type ShopifyCopyPreviewDto,
} from '../../lib/api/shopify-ai-catalog';
import { useFeedback } from '../shared/Feedback';
import { explorerErrorText } from './explorerRules';
import { StoreCopyItemCard } from './StoreCopyItemCard';
import { StoreCopyResultList } from './StoreCopyResultList';
import { buildCopyApplyBody, initialCopyDraft, parseSkus, type CopyDraft } from './storeCopyRules';
import { fieldClass, primaryButtonClass } from './styles';
import { useShopifyStores } from './useShopifyStores';

interface Props {
  // HEDEF mağaza (ürünler buraya kopyalanır; üstteki mağaza seçicisindeki).
  storeId: number;
}

// Mağaza kopyala: kaynak mağazadan SKU listesiyle ürün seç → hedef mağaza diline AI çevirisi önizle (hedefte aynı SKU var mı,
// atla/güncelle) → onayla → taslak olarak oluştur. Fiyat ve stok KOPYALANMAZ; hedefte kullanıcı belirler.
export function StoreCopyTab({ storeId }: Props) {
  const { notify, confirm } = useFeedback();
  const stores = useShopifyStores().data ?? [];
  const sources = stores.filter((store) => store.id !== storeId && store.isConnected);
  const target = stores.find((store) => store.id === storeId);

  const [sourceId, setSourceId] = useState<number | null>(null);
  const [skuText, setSkuText] = useState('');
  const [preview, setPreview] = useState<ShopifyCopyPreviewDto | null>(null);
  const [drafts, setDrafts] = useState<Record<number, CopyDraft>>({});
  const [result, setResult] = useState<ShopifyCopyApplyResultDto | null>(null);

  const activeSourceId = sources.find((store) => store.id === sourceId)?.id ?? sources[0]?.id ?? null;

  const previewRequest = useMutation({
    mutationFn: () => shopifyAiCatalogApi.previewCopy(storeId, activeSourceId!, parseSkus(skuText)),
    onSuccess: (data) => {
      setPreview(data);
      setDrafts(Object.fromEntries(data.items.map((item) => [item.sourceProductId, initialCopyDraft(item)])));
      setResult(null);
    },
    onError: (error) => notify.error(explorerErrorText(error)),
  });

  const applyRequest = useMutation({
    mutationFn: () => shopifyAiCatalogApi.applyCopy(storeId, activeSourceId!, buildCopyApplyBody(preview?.items ?? [], drafts)),
    onSuccess: setResult,
    onError: (error) => notify.error(explorerErrorText(error)),
  });

  const items = preview?.items ?? [];
  const body = buildCopyApplyBody(items, drafts);

  const apply = async () => {
    const ok = await confirm({
      title: `${body.length} ürün ${target?.name ?? 'hedef mağazaya'} kopyalansın mı?`,
      body: 'Yeni ürünler TASLAK olarak açılır; fiyat ve stok kopyalanmaz. Güncellenen ürünlerde yalnız metin alanları değişir.',
      confirmLabel: 'Kopyala',
    });
    if (ok) applyRequest.mutate();
  };

  if (sources.length === 0) {
    return <p className="m-0 text-ui-xs text-fg-muted">Kopyalamak için hedefin dışında en az bir bağlı mağaza gerekir.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-ui-2xs text-fg-muted">
        Hedef: {target?.name} ({target?.countryCode}). Metinler hedef mağazanın diline AI ile çevrilir; hiçbir şey sen onaylamadan yazılmaz.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Kaynak mağaza
          <FormSelect
            value={activeSourceId} className="w-56"
            options={sources.map((store) => ({ value: store.id, label: `${store.name} (${store.countryCode})` }))}
            onChange={setSourceId}
          />
        </div>
        <label className="flex min-w-0 flex-1 basis-64 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          SKU listesi (satır ya da virgülle ayır)
          <textarea value={skuText} onChange={(e) => setSkuText(e.target.value)} className={`${fieldClass} h-auto min-h-16 py-1.5`} />
        </label>
        <button
          type="button" className={primaryButtonClass}
          disabled={previewRequest.isPending || activeSourceId === null || parseSkus(skuText).length === 0}
          onClick={() => previewRequest.mutate()}
        >
          <Copy size={14} aria-hidden /> {previewRequest.isPending ? 'Çevriliyor…' : 'Önizle'}
        </button>
      </div>

      {preview && (
        <>
          <p className="m-0 text-ui-xs text-fg">
            {items.length} ürün hazır · dil: {preview.targetLanguage}.
            {preview.notFoundSkus.length > 0 && ` Kaynakta bulunamayan: ${preview.notFoundSkus.join(', ')}.`}
          </p>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {items.map((item) => (
              <StoreCopyItemCard
                key={item.sourceProductId} item={item} draft={drafts[item.sourceProductId]}
                onChange={(draft) => setDrafts((current) => ({ ...current, [item.sourceProductId]: draft }))}
              />
            ))}
          </ul>
          <button type="button" className={`${primaryButtonClass} self-start`} disabled={applyRequest.isPending || body.length === 0} onClick={() => void apply()}>
            {applyRequest.isPending ? 'Kopyalanıyor…' : `Seçilenleri kopyala (${body.length})`}
          </button>
        </>
      )}

      {result && <StoreCopyResultList rows={result.rows} items={items} />}
    </div>
  );
}
