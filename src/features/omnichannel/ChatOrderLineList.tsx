'use client';

import { Car, Minus, Plus, Trash2 } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';
import { MAX_LINE_QUANTITY, parseMoney, type OrderFormLine } from './chatOrderFormRules';
import { formatOrderMoney } from './chatOrderRules';

const stepperButtonClass =
  `flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg hover:bg-bg-subtle disabled:opacity-40 md:h-8 md:w-8 ${focusRing} ${motionFast}`;

interface Props {
  lines: OrderFormLine[];
  currency: string;
  // Fiyat alanı düzenlenebilir mi (fiyat yetkisi). Shopify'daki siparişte mevcut satırın fiyatı hep kilitli.
  canEditPrice: boolean;
  inShopify: boolean;
  onChange: (key: string, patch: Partial<Pick<OrderFormLine, 'quantity' | 'unitPrice'>>) => void;
  onRemove: (key: string) => void;
}

// Siparişin satırları: adet (−/+), birim fiyat (yetkiyle), satır toplamı ve kaldır.
export function ChatOrderLineList({ lines, currency, canEditPrice, inShopify, onChange, onRemove }: Props) {
  if (lines.length === 0) {
    return <p className="m-0 rounded-lg border border-dashed border-border px-3 py-4 text-center text-ui-xs text-fg-muted">
      Henüz ürün yok — yukarıdan katalogda arayıp ekleyin.
    </p>;
  }

  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-border-soft rounded-lg border border-border-soft p-0">
      {lines.map((line) => {
        const priceLocked = !canEditPrice || (inShopify && line.lineId !== null);
        const lineTotal = (parseMoney(line.unitPrice) ?? 0) * line.quantity;
        return (
          <li key={line.key} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-ui-sm font-semibold text-fg">{line.title}</span>
              <span className="flex flex-wrap items-center gap-x-2 text-ui-2xs text-fg-muted">
                {line.sku && <span className="font-mono">{line.sku}</span>}
                {line.fitment && <span className="inline-flex items-center gap-1"><Car size={10} aria-hidden /> {line.fitment}</span>}
              </span>
            </span>

            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <button type="button" className={stepperButtonClass} aria-label="Adedi azalt"
                  disabled={line.quantity <= 1} onClick={() => onChange(line.key, { quantity: line.quantity - 1 })}>
                  <Minus size={13} aria-hidden />
                </button>
                <span className="w-8 text-center font-mono text-ui-sm font-bold text-fg" aria-label="Adet">{line.quantity}</span>
                <button type="button" className={stepperButtonClass} aria-label="Adedi artır"
                  disabled={line.quantity >= MAX_LINE_QUANTITY} onClick={() => onChange(line.key, { quantity: line.quantity + 1 })}>
                  <Plus size={13} aria-hidden />
                </button>
              </span>

              <label className="flex items-center gap-1 text-ui-2xs text-fg-muted">
                <span className="sr-only">Birim fiyat</span>
                <input
                  inputMode="decimal"
                  value={line.unitPrice}
                  readOnly={priceLocked}
                  title={priceLocked ? 'Fiyatı değiştirme yetkiniz yok ya da sipariş Shopify\'da' : undefined}
                  onChange={(e) => onChange(line.key, { unitPrice: e.target.value })}
                  className={`h-9 w-24 rounded-lg border border-border bg-card px-2 text-right font-mono text-ui-sm text-fg read-only:bg-bg-subtle read-only:text-fg-muted md:h-8 ${focusRing}`}
                />
                {currency}
              </label>

              <span className="ml-auto w-24 text-right font-mono text-ui-sm font-bold text-fg sm:ml-0">
                {formatOrderMoney(lineTotal, currency)}
              </span>
              <button type="button" className={stepperButtonClass} aria-label={`${line.title} ürününü kaldır`}
                onClick={() => onRemove(line.key)}>
                <Trash2 size={13} aria-hidden />
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
