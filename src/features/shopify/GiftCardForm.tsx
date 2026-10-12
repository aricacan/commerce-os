'use client';

import { useState, type SyntheticEvent } from 'react';
import type { CreateShopifyGiftCardBody } from '../../lib/api/shopify-promotions';
import { surfaceCard } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { buildGiftCardBody, EMPTY_GIFT_CARD_FORM, type GiftCardFormState } from './promotionRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  busy: boolean;
  onSubmit: (body: CreateShopifyGiftCardBody) => void;
  onCancel: () => void;
}

const NOTE_MAX_LENGTH = 1000;

// Hediye kartı oluşturma formu. Kodu Shopify üretir; oluşturma yanıtında bir kez gösterilir.
export function GiftCardForm({ busy, onSubmit, onCancel }: Props) {
  const { notify } = useFeedback();
  const [form, setForm] = useState<GiftCardFormState>(EMPTY_GIFT_CARD_FORM);
  const set = <K extends keyof GiftCardFormState>(key: K, value: GiftCardFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const body = buildGiftCardBody(form);
    if (typeof body === 'string') notify.error(body);
    else onSubmit(body);
  };

  return (
    <form onSubmit={submit} className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="Yeni hediye kartı">
      <h3 className="m-0 text-ui-sm font-bold text-fg">Yeni hediye kartı</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Tutar (mağaza para birimi)
          <input required inputMode="decimal" value={form.amount} onChange={(e) => set('amount', e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Son kullanma (boşsa süresiz)
          <input type="date" value={form.expiresOn} onChange={(e) => set('expiresOn', e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Müşteri e-postası (opsiyonel, kayıtlı müşteri olmalı)
          <input type="email" value={form.customerEmail} onChange={(e) => set('customerEmail', e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Not (müşteri görmez)
          <input value={form.note} maxLength={NOTE_MAX_LENGTH} onChange={(e) => set('note', e.target.value)} className={fieldClass} />
        </label>
      </div>
      <p className="m-0 text-ui-2xs text-fg-muted">
        Kart kodu yalnız oluşturulduğu anda görünür; sonrasında Shopify yalnız son 4 karakteri verir. Kodu hemen kopyalayın.
      </p>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? 'Oluşturuluyor…' : 'Oluştur'}</button>
        <button type="button" onClick={onCancel} className={ghostButtonClass}>Vazgeç</button>
      </div>
    </form>
  );
}
