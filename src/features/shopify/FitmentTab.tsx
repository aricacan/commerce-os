'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  shopifyFitmentApi, type ShopifyFitmentApplyDto, type ShopifyFitmentPreviewDto,
} from '../../lib/api/shopify-fitment';
import { useFeedback } from '../shared/Feedback';
import { explorerErrorText, writeFailure } from './explorerRules';
import { ExplorerState } from './ExplorerState';
import { FitmentApplyReport, FitmentPreviewReport } from './FitmentReport';
import { FitmentSetupCard } from './FitmentSetupCard';
import { MAX_FITMENT_SKUS, parseSkuList, skuLimitError } from './fitmentRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  storeId: number;
}

// Araç uyumluluğu: panel Fitment verisini Shopify'a eşitler. Kurulum → SKU'lar → önizleme → onaylı uygulama.
// SKU metni değişince önizleme/sonuç düşer: onaylanan her zaman son girilen listedir.
export function FitmentTab({ storeId }: Props) {
  const { notify, confirm } = useFeedback();
  const queryClient = useQueryClient();
  const [skuText, setSkuText] = useState('');
  const [preview, setPreview] = useState<ShopifyFitmentPreviewDto | null>(null);
  const [result, setResult] = useState<ShopifyFitmentApplyDto | null>(null);
  const [busy, setBusy] = useState(false);

  const setupKey = ['shopify', 'fitment-setup', storeId];
  const setup = useQuery({
    queryKey: setupKey,
    queryFn: () => shopifyFitmentApi.setupStatus(storeId),
    retry: false,
  });

  const skus = parseSkuList(skuText);
  const limitError = skuLimitError(skus);

  const changeSkus = (text: string) => {
    setSkuText(text);
    setPreview(null);
    setResult(null);
  };

  // Her yazma/okuma aynı akış: meşgul işaretle → çağır → hatayı göster.
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      notify.error(explorerErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const runSetup = () => run(async () => {
    const failure = writeFailure(await shopifyFitmentApi.runSetup(storeId));
    if (failure) {
      notify.error(failure);
      return;
    }
    notify.success('Araç uyumluluğu kurulumu tamamlandı.');
    await queryClient.invalidateQueries({ queryKey: setupKey });
  });

  const runPreview = () => run(async () => {
    setResult(null);
    setPreview(await shopifyFitmentApi.preview(storeId, { skus }));
  });

  const runApply = () => run(async () => {
    const ok = await confirm({
      title: 'Araç uyumluluğu Shopify\'a yazılsın mı?',
      body: `${preview?.productsToLink ?? 0} ürünün "Araç uyumluluğu" listesi değiştirilecek.`,
      confirmLabel: 'Shopify\'a uygula',
    });
    if (!ok) return;
    const applied = await shopifyFitmentApi.apply(storeId, { skus });
    setResult(applied);
    setPreview(null);
    if (applied.applied) notify.success('Araç uyumluluğu Shopify\'a yazıldı.');
    else notify.error('Bazı kayıtlar yazılamadı; sonuç raporuna bakın.');
  });

  return (
    <ExplorerState
      loading={setup.isLoading} error={setup.error} isEmpty={false}
      emptyTitle="" onRetry={() => void setup.refetch()}
    >
      {setup.data && <FitmentSetupCard status={setup.data} busy={busy} onSetup={() => void runSetup()} />}
      <section className="flex flex-col gap-2" aria-label="SKU listesi">
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          SKU listesi (satır ya da virgülle ayırın, en fazla {MAX_FITMENT_SKUS})
          <textarea
            value={skuText} onChange={(e) => changeSkus(e.target.value)} rows={5}
            placeholder="KR-4&#10;TM-12" className={`${fieldClass} h-auto py-2 font-mono`}
          />
        </label>
        {limitError && <p role="alert" className="m-0 text-ui-xs text-danger">{limitError}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button" className={ghostButtonClass}
            disabled={busy || skus.length === 0 || limitError !== null} onClick={() => void runPreview()}
          >
            Önizle
          </button>
          <button
            type="button" className={primaryButtonClass}
            disabled={busy || preview === null || preview.productsToLink === 0 || !setup.data?.isReady} onClick={() => void runApply()}
          >
            Shopify&apos;a uygula
          </button>
          <span className="text-ui-2xs text-fg-muted">{skus.length} SKU</span>
        </div>
      </section>
      {preview && <FitmentPreviewReport preview={preview} />}
      {result && <FitmentApplyReport result={result} />}
    </ExplorerState>
  );
}
