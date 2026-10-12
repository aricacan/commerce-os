'use client';

import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import type {
  ShopifyOrderLineDto, ShopifyRefundBody, ShopifyRefundPreviewDto,
} from '../../lib/api/shopify-explorer';
import { surfaceCard } from '../shared/design';
import { CheckboxField } from './FormControls';
import { buildRefundBody, clampRefundQuantity, formatMoney, type RefundFormState } from './explorerRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  lines: ShopifyOrderLineDto[];
  // İptal edilmiş sipariş iade edilemez; sebep yazılır.
  blockedReason: string | null;
  busy: boolean;
  // Hesaplanamazsa (hata) null döner; hata mesajını üst bileşen gösterir.
  onPreview: (body: ShopifyRefundBody) => Promise<ShopifyRefundPreviewDto | null>;
  onRefund: (body: ShopifyRefundBody) => Promise<boolean>;
}

const NOTE_MAX_LENGTH = 255;

const EMPTY_FORM: RefundFormState = {
  quantities: {}, restockItems: true, refundShipping: false, notifyCustomer: false, note: '',
};

// İade: kalem + adet seç → "Hesapla" (Shopify tutarı hesaplar, hiçbir şey yazılmaz) → "İadeyi onayla".
// Form değişince önizleme düşer: onaylanan tutar her zaman son seçimin tutarıdır.
export function OrderRefundSection({ lines, blockedReason, busy, onPreview, onRefund }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RefundFormState>(EMPTY_FORM);
  const [preview, setPreview] = useState<ShopifyRefundPreviewDto | null>(null);

  const refundable = lines.filter((line) => line.refundableQuantity > 0);
  const change = (patch: Partial<RefundFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
    setPreview(null);
  };
  const setQuantity = (line: ShopifyOrderLineDto, value: number) =>
    change({ quantities: { ...form.quantities, [line.id]: clampRefundQuantity(value, line.refundableQuantity) } });

  const body = buildRefundBody(form, preview?.amount.amount);

  const calculate = async () => {
    const request = buildRefundBody(form);
    if (request) setPreview(await onPreview(request));
  };
  const confirmRefund = async () => {
    if (body && await onRefund(body)) {
      setOpen(false);
      setForm(EMPTY_FORM);
      setPreview(null);
    }
  };

  if (blockedReason) return <p className="m-0 text-ui-xs text-fg-muted">Bu sipariş iade edilemez: {blockedReason}</p>;
  if (refundable.length === 0) return <p className="m-0 text-ui-xs text-fg-muted">İade edilebilir kalem kalmadı.</p>;
  if (!open) {
    return (
      <div>
        <button type="button" className={ghostButtonClass} onClick={() => setOpen(true)}>
          <Undo2 size={14} aria-hidden /> İade başlat
        </button>
      </div>
    );
  }

  return (
    <section className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="Sipariş iadesi">
      <h3 className="m-0 text-ui-sm font-bold text-fg">İade</h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {refundable.map((line) => (
          <li key={line.id} className="flex flex-wrap items-center justify-between gap-2 text-ui-xs">
            <span className="min-w-0 flex-1 basis-48 break-words text-fg">
              {line.title}{line.variantTitle ? ` — ${line.variantTitle}` : ''}
              <span className="block text-ui-2xs text-fg-muted">İade edilebilir: {line.refundableQuantity}</span>
            </span>
            <input
              type="number" min={0} max={line.refundableQuantity} aria-label={`${line.title} iade adedi`}
              value={form.quantities[line.id] ?? 0} onChange={(e) => setQuantity(line, Number(e.target.value))}
              className={`${fieldClass} w-20`}
            />
          </li>
        ))}
      </ul>
      <CheckboxField checked={form.restockItems} onChange={(restockItems) => change({ restockItems })}>Ürünleri stoğa geri al</CheckboxField>
      <CheckboxField checked={form.refundShipping} onChange={(refundShipping) => change({ refundShipping })}>Kargo ücretini de iade et</CheckboxField>
      <CheckboxField checked={form.notifyCustomer} onChange={(notifyCustomer) => change({ notifyCustomer })}>Müşteriye Shopify bildirimi gönder</CheckboxField>
      <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        İç not
        <input value={form.note} onChange={(e) => change({ note: e.target.value })} maxLength={NOTE_MAX_LENGTH} className={fieldClass} />
      </label>

      {preview && (
        <div className="flex flex-col gap-1 rounded-md bg-bg-subtle px-3 py-2 text-ui-xs text-fg" aria-label="İade önizlemesi">
          <strong className="text-ui-sm">İade tutarı: {formatMoney(preview.amount)}</strong>
          <span className="text-fg-muted">
            Ürün {formatMoney(preview.subtotal)} · Vergi {formatMoney(preview.tax)} · En fazla iade edilebilir {formatMoney(preview.maximumRefundable)}
          </span>
          {preview.transactions.length > 0
            ? preview.transactions.map((t) => <span key={t.gateway}>{t.gateway}: {formatMoney(t.amount)} müşteriye geri döner</span>)
            : <span className="text-fg-muted">Tahsil edilmiş ödeme yok; para hareketi olmaz, yalnız kalemler iade edilir.</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={ghostButtonClass} disabled={busy || buildRefundBody(form) === null} onClick={() => void calculate()}>
          Tutarı hesapla
        </button>
        <button type="button" className={primaryButtonClass} disabled={busy || preview === null} onClick={() => void confirmRefund()}>
          İadeyi onayla
        </button>
        <button type="button" className={ghostButtonClass} onClick={() => setOpen(false)}>Vazgeç</button>
      </div>
    </section>
  );
}
