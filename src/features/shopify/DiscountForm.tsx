'use client';

import { useState, type SyntheticEvent } from 'react';
import { SHOPIFY_DISCOUNT_VALUE_TYPE, type CreateShopifyDiscountBody, type ShopifyDiscountValueType } from '../../lib/api/shopify-promotions';
import { surfaceCard } from '../shared/design';
import { DiscountScopePicker } from './DiscountScopePicker';
import { useFeedback } from '../shared/Feedback';
import { CheckboxField, SelectField } from './FormControls';
import { buildDiscountBody, EMPTY_DISCOUNT_FORM, type DiscountFormState } from './promotionRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

const VALUE_TYPE_OPTIONS: { value: ShopifyDiscountValueType; label: string }[] = [
  { value: SHOPIFY_DISCOUNT_VALUE_TYPE.Percentage, label: 'Yüzde (%)' },
  { value: SHOPIFY_DISCOUNT_VALUE_TYPE.FixedAmount, label: 'Sabit tutar' },
];

interface Props {
  storeId: number;
  busy: boolean;
  // Verilirse düzenleme formudur (mevcut değerlerle dolu); verilmezse boş oluşturma formu.
  initial?: DiscountFormState;
  onSubmit: (body: CreateShopifyDiscountBody) => void;
  onCancel: () => void;
}

const CODE_MAX_LENGTH = 50;

// Yüzde/tutar indirim kodu formu (oluşturma ve düzenleme). Alıcılar tüm müşteriler; ürün kapsamı seçilir.
// Başlangıç boşsa oluşturmada "şimdi", düzenlemede mevcut başlangıç korunur.
export function DiscountForm({ storeId, busy, initial, onSubmit, onCancel }: Props) {
  const { notify } = useFeedback();
  const [form, setForm] = useState<DiscountFormState>(initial ?? EMPTY_DISCOUNT_FORM);
  const set = <K extends keyof DiscountFormState>(key: K, value: DiscountFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const body = buildDiscountBody(form);
    if (typeof body === 'string') notify.error(body);
    else onSubmit(body);
  };

  const isPercentage = form.valueType === SHOPIFY_DISCOUNT_VALUE_TYPE.Percentage;

  return (
    <form onSubmit={submit} className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label={initial ? 'İndirim kodunu düzenle' : 'Yeni indirim kodu'}>
      <h3 className="m-0 text-ui-sm font-bold text-fg">{initial ? 'İndirim kodunu düzenle' : 'Yeni indirim kodu'}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Kod (müşteri sepette yazar)
          <input required value={form.code} maxLength={CODE_MAX_LENGTH} onChange={(e) => set('code', e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Başlık (boşsa kod)
          <input value={form.title} onChange={(e) => set('title', e.target.value)} className={fieldClass} />
        </label>
        <SelectField label="İndirim türü" value={form.valueType} options={VALUE_TYPE_OPTIONS} onChange={(valueType) => set('valueType', valueType)} />
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          {isPercentage ? 'Yüzde (1-100)' : 'Tutar (mağaza para birimi)'}
          <input required inputMode="decimal" value={form.value} onChange={(e) => set('value', e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Başlangıç (boşsa şimdi)
          <input type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Bitiş (boşsa süresiz)
          <input type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Toplam kullanım limiti (boşsa sınırsız)
          <input inputMode="numeric" value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Minimum sepet tutarı (boşsa yok)
          <input inputMode="decimal" value={form.minimumSubtotal} onChange={(e) => set('minimumSubtotal', e.target.value)} className={fieldClass} />
        </label>
      </div>
      <CheckboxField checked={form.appliesOncePerCustomer} onChange={(value) => set('appliesOncePerCustomer', value)}>
        Müşteri başına yalnız bir kez
      </CheckboxField>
      <DiscountScopePicker storeId={storeId} label="İndirimin geçerli olduğu ürünler" value={form.scope} allowAll onChange={(scope) => set('scope', scope)} />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? 'Kaydediliyor…' : initial ? 'Kaydet' : 'Oluştur'}</button>
        <button type="button" onClick={onCancel} className={ghostButtonClass}>Vazgeç</button>
      </div>
    </form>
  );
}
