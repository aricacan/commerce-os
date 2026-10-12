'use client';

import { useState } from 'react';
import type { ShopifyBulkFulfillBody } from '../../lib/api/shopify-bulk';
import { CustomCheckbox } from '../../components/ui/CustomCheckbox';
import { parseTrackingNumbers, trackingCountError } from './bulkRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

export type BulkFulfillInput = Omit<ShopifyBulkFulfillBody, 'ids'>;

interface NoteProps {
  count: number;
  busy: boolean;
  onSubmit: (note: string) => Promise<boolean>;
  onClose: () => void;
}

// Toplu not: her siparişin mevcut notunun altına eklenir (üzerine yazılmaz).
export function BulkNoteForm({ count, busy, onSubmit, onClose }: NoteProps) {
  const [note, setNote] = useState('');
  const trimmed = note.trim();

  const submit = async () => {
    if (await onSubmit(trimmed)) onClose();
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        Eklenecek not (mevcut notun altına yazılır)
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${fieldClass} h-auto py-1.5`} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButtonClass} disabled={busy || trimmed === ''} onClick={() => void submit()}>
          {count} siparişe not ekle
        </button>
        <button type="button" className={ghostButtonClass} onClick={onClose}>Vazgeç</button>
      </div>
    </div>
  );
}

interface FulfillProps {
  count: number;
  busy: boolean;
  onSubmit: (body: BulkFulfillInput) => Promise<boolean>;
  onClose: () => void;
}

// Toplu kargolandı: aynı firma; takip numarası boş, tek (hepsine) ya da satır satır (sırayla her siparişe).
export function BulkFulfillForm({ count, busy, onSubmit, onClose }: FulfillProps) {
  const [company, setCompany] = useState('');
  const [trackingText, setTrackingText] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const numbers = parseTrackingNumbers(trackingText);
  const countError = trackingCountError(count, numbers);

  const submit = async () => {
    const done = await onSubmit({ company: company.trim() || undefined, trackingNumbers: numbers, notifyCustomer });
    if (done) onClose();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Kargo firması
          <input value={company} onChange={(e) => setCompany(e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Takip numaraları (tek numara hepsine; satır satır ise seçili sırayla)
          <textarea value={trackingText} onChange={(e) => setTrackingText(e.target.value)} rows={3} className={`${fieldClass} h-auto py-1.5 font-mono`} />
          {countError && <span role="alert" className="font-normal text-danger">{countError}</span>}
        </label>
      </div>
      <label className="flex items-center gap-2 text-ui-xs text-fg">
        <CustomCheckbox checked={notifyCustomer} onChange={setNotifyCustomer} />
        Müşterilere Shopify kargo bildirimi gönder
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButtonClass} disabled={busy || countError !== null} onClick={() => void submit()}>
          {count} siparişi kargolandı işaretle
        </button>
        <button type="button" className={ghostButtonClass} onClick={onClose}>Vazgeç</button>
      </div>
    </div>
  );
}
