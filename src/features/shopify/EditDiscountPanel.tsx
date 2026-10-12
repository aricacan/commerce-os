'use client';

import { useQuery } from '@tanstack/react-query';
import type { ShopifyWriteResultDto } from '../../lib/api/shopify-explorer';
import { shopifyPromotionsApi } from '../../lib/api/shopify-promotions';
import { useFeedback } from '../shared/Feedback';
import { BxgyDiscountForm } from './BxgyDiscountForm';
import { DiscountForm } from './DiscountForm';
import { bxgyFormFromBody, codeChangeWarning, freeShippingFormFromBody } from './discountKindRules';
import { ExplorerState } from './ExplorerState';
import { FreeShippingDiscountForm } from './FreeShippingDiscountForm';
import { discountFormFromBody } from './promotionRules';
import { useShopifyWrite } from './useShopifyWrite';

interface Props {
  storeId: number;
  discountId: number;
  onDone: () => void;
}

const UPDATED_TEXT = 'İndirim güncellendi.';

// Mevcut indirimi Shopify'dan okur, türüne uygun formu mevcut değerlerle doldurur ve güncellemeyi gönderir.
// Kullanımı olan kodun adı değişiyorsa kaydetmeden önce onay ister.
export function EditDiscountPanel({ storeId, discountId, onDone }: Props) {
  const { confirm } = useFeedback();
  const { writing, run } = useShopifyWrite(['shopify', 'discounts', storeId]);

  // Düzenleme her açılışta canlı değeri okur (kullanım sayısı ve önceki kapsam güncel olmalı).
  const detail = useQuery({
    queryKey: ['shopify', 'discount-detail', storeId, discountId],
    queryFn: () => shopifyPromotionsApi.discount(storeId, discountId),
    gcTime: 0,
  });
  const data = detail.data;
  const usageCount = data?.usageCount ?? 0;

  const save = async (originalCode: string, nextCode: string, action: () => Promise<ShopifyWriteResultDto>) => {
    const warning = codeChangeWarning(originalCode, nextCode, usageCount);
    if (warning) {
      const ok = await confirm({ title: 'Kullanılmış kodun adı değişsin mi?', body: warning, confirmLabel: 'Kodu değiştir', danger: true });
      if (!ok) return;
    }
    if (await run(action, UPDATED_TEXT)) onDone();
  };

  const basic = data?.basic;
  const bxgy = data?.bxgy;
  const freeShipping = data?.freeShipping;

  return (
    <ExplorerState
      loading={detail.isLoading} error={detail.error} isEmpty={!basic && !bxgy && !freeShipping}
      emptyTitle="İndirim bulunamadı ya da bu tür düzenlenemez" onRetry={() => void detail.refetch()}
    >
      {basic && (
        <DiscountForm
          storeId={storeId} busy={writing} onCancel={onDone} initial={discountFormFromBody(basic)}
          onSubmit={(body) => void save(basic.code, body.code, () => shopifyPromotionsApi.updateDiscount(storeId, discountId, body))}
        />
      )}
      {bxgy && (
        <BxgyDiscountForm
          storeId={storeId} title="X al Y öde indirimini düzenle" busy={writing} onCancel={onDone} initial={bxgyFormFromBody(bxgy)}
          onSubmit={(body) => void save(bxgy.code, body.code, () => shopifyPromotionsApi.updateBxgyDiscount(storeId, discountId, body))}
        />
      )}
      {freeShipping && (
        <FreeShippingDiscountForm
          title="Ücretsiz kargo indirimini düzenle" busy={writing} onCancel={onDone} initial={freeShippingFormFromBody(freeShipping)}
          onSubmit={(body) => void save(freeShipping.code, body.code, () => shopifyPromotionsApi.updateFreeShippingDiscount(storeId, discountId, body))}
        />
      )}
    </ExplorerState>
  );
}
