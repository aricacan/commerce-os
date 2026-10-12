'use client';

import { X } from 'lucide-react';
import type { ShopifyBulkResultDto } from '../../lib/api/shopify-bulk';
import { surfaceCard } from '../shared/design';
import { bulkSummaryText, failedItems } from './bulkRules';
import { ghostButtonClass } from './styles';

interface Props {
  result: ShopifyBulkResultDto;
  // Kayıt etiketi: siparişte "Sipariş", üründe "Ürün" (kimlik yanında gösterilir).
  itemLabel: string;
  onDismiss: () => void;
}

// Toplu işlemin kayıt bazlı sonucu: özet + yalnız başarısız kayıtlar ve nedenleri (başarısızlar seçili kalır, tekrar denenebilir).
export function BulkResultPanel({ result, itemLabel, onDismiss }: Props) {
  const failed = failedItems(result);

  return (
    <section className={`${surfaceCard} flex flex-col gap-2 p-3`} aria-label="Toplu işlem sonucu">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-ui-xs font-semibold text-fg">{bulkSummaryText(result)}</p>
        <button type="button" className={ghostButtonClass} aria-label="Sonucu kapat" onClick={onDismiss}>
          <X size={14} aria-hidden /> Kapat
        </button>
      </div>
      {failed.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {failed.map((item) => (
            <li key={item.id} className="text-ui-xs text-danger">
              <span className="font-mono">{itemLabel} {item.id}</span>: {item.error ?? 'Bilinmeyen hata'}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
