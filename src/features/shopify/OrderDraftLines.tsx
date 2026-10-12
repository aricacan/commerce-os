'use client';

import { Trash2 } from 'lucide-react';
import { MAX_LINE_QUANTITY, type OrderDraftLine } from './orderDraftRules';
import { fieldClass, ghostButtonClass } from './styles';

interface Props {
  lines: OrderDraftLine[];
  currency: string;
  onQuantity: (sku: string, quantity: number) => void;
  onRemove: (sku: string) => void;
}

// Elle siparişin kalem listesi: adet değiştir, kalemi çıkar. Birim fiyat kataloğdan gelir (burada düzenlenmez).
export function OrderDraftLines({ lines, currency, onQuantity, onRemove }: Props) {
  if (lines.length === 0) return <p className="m-0 text-ui-xs text-fg-muted">Henüz ürün eklenmedi.</p>;

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {lines.map((line) => (
        <li key={line.sku} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border-soft bg-card px-3 py-2">
          <span className="min-w-0 flex-1 basis-40 break-words text-ui-xs text-fg">
            {line.title}
            <span className="block font-mono text-ui-2xs text-fg-muted">{line.sku}</span>
          </span>
          <span className="text-ui-xs text-fg-muted">{line.unitPrice.toFixed(2)} {currency}</span>
          <input
            type="number" min={1} max={MAX_LINE_QUANTITY} value={line.quantity} aria-label={`${line.title} adedi`}
            className={`${fieldClass} w-20`} onChange={(e) => onQuantity(line.sku, e.target.valueAsNumber)}
          />
          <button type="button" className={ghostButtonClass} aria-label={`${line.title} çıkar`} onClick={() => onRemove(line.sku)}>
            <Trash2 size={14} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
