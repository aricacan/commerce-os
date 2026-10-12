'use client';

import { useState, type SyntheticEvent } from 'react';
import type { CreateShopifyFreeShippingDiscountBody } from '../../lib/api/shopify-promotions';
import { surfaceCard } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { DiscountCommonFields } from './DiscountCommonFields';
import { buildFreeShippingBody, EMPTY_FREE_SHIPPING_FORM, type FreeShippingFormState } from './discountKindRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  title: string;
  initial?: FreeShippingFormState;
  busy: boolean;
  onSubmit: (body: CreateShopifyFreeShippingDiscountBody) => void;
  onCancel: () => void;
}

const labelClass = 'flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted';

// Ücretsiz kargo formu (oluşturma ve düzenleme): ülke kısıtı, minimum sepet, kargo ücreti üst sınırı.
export function FreeShippingDiscountForm({ title, initial = EMPTY_FREE_SHIPPING_FORM, busy, onSubmit, onCancel }: Props) {
  const { notify } = useFeedback();
  const [form, setForm] = useState<FreeShippingFormState>(initial);
  const set = <K extends keyof FreeShippingFormState>(key: K, value: FreeShippingFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const body = buildFreeShippingBody(form);
    if (typeof body === 'string') notify.error(body);
    else onSubmit(body);
  };

  return (
    <form onSubmit={submit} className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label={title}>
      <h3 className="m-0 text-ui-sm font-bold text-fg">{title}</h3>
      <DiscountCommonFields value={form.common} onChange={(common) => set('common', common)} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          Ülkeler (ISO kodu, virgülle; boşsa tüm ülkeler)
          <input value={form.countries} placeholder="XK, AL, MK" onChange={(e) => set('countries', e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Minimum sepet tutarı (boşsa yok)
          <input inputMode="decimal" value={form.minimumSubtotal} onChange={(e) => set('minimumSubtotal', e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Kargo ücreti üst sınırı (boşsa hepsi bedava)
          <input inputMode="decimal" value={form.maximumShippingPrice} onChange={(e) => set('maximumShippingPrice', e.target.value)} className={fieldClass} />
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" onClick={onCancel} className={ghostButtonClass}>Vazgeç</button>
      </div>
    </form>
  );
}
