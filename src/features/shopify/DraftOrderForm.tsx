'use client';

import { useState, type SyntheticEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CreateShopifyDraftOrderBody } from '../../lib/api/shopify-payment-shipping';
import { surfaceCard } from '../shared/design';
import {
  EMPTY_DRAFT_FORM, EMPTY_DRAFT_LINE, MAX_DRAFT_NOTE_LENGTH, MAX_DRAFT_QUANTITY,
  buildDraftBody, clampDraftQuantity, draftEmailError, type DraftFormState,
} from './paymentLinkRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  busy: boolean;
  onSubmit: (body: CreateShopifyDraftOrderBody) => Promise<boolean>;
}

// Yeni ödeme linki: kalemler SKU + adet; fiyatı Shopify belirler, indirim yoktur. Başarıda form temizlenir.
export function DraftOrderForm({ busy, onSubmit }: Props) {
  const [form, setForm] = useState<DraftFormState>(EMPTY_DRAFT_FORM);
  const body = buildDraftBody(form);
  const emailError = draftEmailError(form.email);

  const setLine = (index: number, patch: Partial<DraftFormState['lines'][number]>) =>
    setForm((current) => ({ ...current, lines: current.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)) }));
  const addLine = () => setForm((current) => ({ ...current, lines: [...current.lines, EMPTY_DRAFT_LINE] }));
  const removeLine = (index: number) => setForm((current) => ({ ...current, lines: current.lines.filter((_, i) => i !== index) }));

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (body && await onSubmit(body)) setForm(EMPTY_DRAFT_FORM);
  };

  return (
    <form onSubmit={(e) => void submit(e)} className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="Yeni ödeme linki">
      <h3 className="m-0 text-ui-sm font-bold text-fg">Yeni ödeme linki</h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {form.lines.map((line, index) => (
          <li key={index} className="flex items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
              SKU
              <input value={line.sku} onChange={(e) => setLine(index, { sku: e.target.value })} className={fieldClass} />
            </label>
            <label className="flex w-20 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
              Adet
              <input
                type="number" min={1} max={MAX_DRAFT_QUANTITY} value={line.quantity}
                onChange={(e) => setLine(index, { quantity: clampDraftQuantity(Number(e.target.value)) })} className={fieldClass}
              />
            </label>
            <button
              type="button" className={ghostButtonClass} aria-label="Kalemi kaldır"
              disabled={form.lines.length === 1} onClick={() => removeLine(index)}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div>
        <button type="button" className={ghostButtonClass} onClick={addLine}><Plus size={14} aria-hidden /> Kalem ekle</button>
      </div>
      <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        Müşteri e-postası (isteğe bağlı)
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={fieldClass} />
        {emailError && <span role="alert" className="font-normal text-danger">{emailError}</span>}
      </label>
      <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        İç not
        <input value={form.note} maxLength={MAX_DRAFT_NOTE_LENGTH} onChange={(e) => setForm({ ...form, note: e.target.value })} className={fieldClass} />
      </label>
      <div>
        <button type="submit" className={primaryButtonClass} disabled={busy || body === null}>Link oluştur</button>
      </div>
    </form>
  );
}
