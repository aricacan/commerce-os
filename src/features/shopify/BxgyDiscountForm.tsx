'use client';

import { useState, type SyntheticEvent } from 'react';
import type { CreateShopifyBxgyDiscountBody } from '../../lib/api/shopify-promotions';
import { surfaceCard } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { DiscountCommonFields } from './DiscountCommonFields';
import { DiscountScopePicker } from './DiscountScopePicker';
import { buildBxgyBody, EMPTY_BXGY_FORM, type BxgyFormState } from './discountKindRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  storeId: number;
  title: string;
  initial?: BxgyFormState;
  busy: boolean;
  onSubmit: (body: CreateShopifyBxgyDiscountBody) => void;
  onCancel: () => void;
}

const labelClass = 'flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted';

// "X al Y öde" / al-bir-al-bir formu (oluşturma ve düzenleme). Alınan ve kazanılan ürünler seçilmek zorundadır.
export function BxgyDiscountForm({ storeId, title, initial = EMPTY_BXGY_FORM, busy, onSubmit, onCancel }: Props) {
  const { notify } = useFeedback();
  const [form, setForm] = useState<BxgyFormState>(initial);
  const set = <K extends keyof BxgyFormState>(key: K, value: BxgyFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const body = buildBxgyBody(form);
    if (typeof body === 'string') notify.error(body);
    else onSubmit(body);
  };

  return (
    <form onSubmit={submit} className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label={title}>
      <h3 className="m-0 text-ui-sm font-bold text-fg">{title}</h3>
      <DiscountCommonFields value={form.common} onChange={(common) => set('common', common)} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Alınacak adet
          <input required inputMode="numeric" value={form.buyQuantity} onChange={(e) => set('buyQuantity', e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Kazanılacak adet
          <input required inputMode="numeric" value={form.getQuantity} onChange={(e) => set('getQuantity', e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Kazanılan ürünlerde indirim % (100 = bedava)
          <input required inputMode="decimal" value={form.getPercentage} onChange={(e) => set('getPercentage', e.target.value)} className={fieldClass} />
        </label>
      </div>
      <DiscountScopePicker storeId={storeId} label="Alınacak ürünler" value={form.buyScope} allowAll={false} onChange={(scope) => set('buyScope', scope)} />
      <DiscountScopePicker storeId={storeId} label="Kazanılacak ürünler" value={form.getScope} allowAll={false} onChange={(scope) => set('getScope', scope)} />
      <p className="m-0 text-ui-2xs text-fg-muted">Shopify bu türde "tüm ürünler" kapsamını desteklemez; ürün ya da koleksiyon seçin.</p>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" onClick={onCancel} className={ghostButtonClass}>Vazgeç</button>
      </div>
    </form>
  );
}
