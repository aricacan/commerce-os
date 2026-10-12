'use client';

import { useState } from 'react';
import { Ban } from 'lucide-react';
import { SHOPIFY_CANCEL_REASON, type CancelShopifyOrderBody, type ShopifyCancelReason } from '../../lib/api/shopify-explorer';
import { surfaceCard } from '../shared/design';
import { CheckboxField, SelectField } from './FormControls';
import { fieldClass, ghostButtonClass } from './styles';

interface Props {
  // null = iptal edilebilir; doluysa edilemeyen sebep gösterilir.
  blockedReason: string | null;
  onConfirm: (body: CancelShopifyOrderBody) => void;
}

const STAFF_NOTE_MAX_LENGTH = 255;

const REASON_LABELS: Record<ShopifyCancelReason, string> = {
  [SHOPIFY_CANCEL_REASON.Staff]: 'Ekip kararı',
  [SHOPIFY_CANCEL_REASON.Customer]: 'Müşteri istedi',
  [SHOPIFY_CANCEL_REASON.Other]: 'Diğer',
};

const REASON_OPTIONS = Object.entries(REASON_LABELS).map(([value, label]) => ({ value: Number(value) as ShopifyCancelReason, label }));

// İptal: güvenli varsayılan — stok geri alınır, müşteriye bildirim GİTMEZ, para iadesi kaydedilmez.
// Kargolanmış / zaten iptal siparişte düğme yerine sebep yazılır.
export function OrderCancelSection({ blockedReason, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ShopifyCancelReason>(SHOPIFY_CANCEL_REASON.Staff);
  const [restock, setRestock] = useState(true);
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [note, setNote] = useState('');

  if (blockedReason) {
    return <p className="m-0 text-ui-xs text-fg-muted">Bu sipariş iptal edilemez: {blockedReason}</p>;
  }
  if (!open) {
    return (
      <div>
        <button type="button" className={ghostButtonClass} onClick={() => setOpen(true)}>
          <Ban size={14} aria-hidden /> Siparişi iptal et
        </button>
      </div>
    );
  }

  return (
    <section className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="Sipariş iptali">
      <h3 className="m-0 text-ui-sm font-bold text-fg">Siparişi iptal et</h3>
      <p className="m-0 text-ui-xs text-fg-muted">
        Para iadesi kaydedilmez; iade gerekiyorsa Shopify&apos;da ekip yapar. İptal geri alınamaz.
      </p>
      <SelectField label="Sebep" value={reason} options={REASON_OPTIONS} onChange={setReason} />
      <CheckboxField checked={restock} onChange={setRestock}>Stoğu geri al</CheckboxField>
      <CheckboxField checked={notifyCustomer} onChange={setNotifyCustomer}>Müşteriye Shopify bildirimi gönder</CheckboxField>
      <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        İç not (müşteri görmez)
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={STAFF_NOTE_MAX_LENGTH} className={fieldClass} />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          className={ghostButtonClass}
          onClick={() => onConfirm({ reason, restock, notifyCustomer, staffNote: note.trim() || undefined })}
        >
          İptali onayla
        </button>
        <button type="button" className={ghostButtonClass} onClick={() => setOpen(false)}>Vazgeç</button>
      </div>
    </section>
  );
}
