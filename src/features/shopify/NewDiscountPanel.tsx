'use client';

import { useState } from 'react';
import { FormSelect } from '../../components/ui/FormSelect';
import type { ShopifyWriteResultDto } from '../../lib/api/shopify-explorer';
import { shopifyPromotionsApi } from '../../lib/api/shopify-promotions';
import { BxgyDiscountForm } from './BxgyDiscountForm';
import { DiscountForm } from './DiscountForm';
import { DISCOUNT_KIND, NEW_DISCOUNT_KIND_OPTIONS, type NewDiscountKind } from './discountKindRules';
import { FreeShippingDiscountForm } from './FreeShippingDiscountForm';
import { useShopifyWrite } from './useShopifyWrite';

interface Props {
  storeId: number;
  onDone: () => void;
}

const CREATED_TEXT = 'İndirim oluşturuldu.';

// Yeni indirim: önce tür seçilir (yüzde/tutar, X al Y öde, ücretsiz kargo), sonra türün formu açılır.
export function NewDiscountPanel({ storeId, onDone }: Props) {
  const [kind, setKind] = useState<NewDiscountKind>(DISCOUNT_KIND.Basic);
  const { writing, run } = useShopifyWrite(['shopify', 'discounts', storeId]);

  const create = async (action: () => Promise<ShopifyWriteResultDto>) => {
    if (await run(action, CREATED_TEXT)) onDone();
  };

  return (
    <div className="flex flex-col gap-2">
      <FormSelect value={kind} options={NEW_DISCOUNT_KIND_OPTIONS} onChange={setKind} className="max-w-64" />
      {kind === DISCOUNT_KIND.Basic && (
        <DiscountForm
          storeId={storeId} busy={writing} onCancel={onDone}
          onSubmit={(body) => void create(() => shopifyPromotionsApi.createDiscount(storeId, body))}
        />
      )}
      {kind === DISCOUNT_KIND.Bxgy && (
        <BxgyDiscountForm
          storeId={storeId} title="Yeni X al Y öde indirimi" busy={writing} onCancel={onDone}
          onSubmit={(body) => void create(() => shopifyPromotionsApi.createBxgyDiscount(storeId, body))}
        />
      )}
      {kind === DISCOUNT_KIND.FreeShipping && (
        <FreeShippingDiscountForm
          title="Yeni ücretsiz kargo indirimi" busy={writing} onCancel={onDone}
          onSubmit={(body) => void create(() => shopifyPromotionsApi.createFreeShippingDiscount(storeId, body))}
        />
      )}
    </div>
  );
}
