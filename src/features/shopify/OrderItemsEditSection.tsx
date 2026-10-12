'use client';

import { useState } from 'react';
import { PackageOpen } from 'lucide-react';
import type { ShopifyOrderDetailDto } from '../../lib/api/shopify-explorer';
import { ghostButtonClass } from './styles';
import { OrderItemsEditForm } from './OrderItemsEditForm';

interface Props {
  storeId: number;
  detail: ShopifyOrderDetailDto;
  onChanged: () => Promise<void>;
}

// Sipariş kalemlerini / teslimat adresini düzenleme girişi. Yalnız kargolanmamış, iptal edilmemiş sipariş düzenlenir
// (iptal kuralıyla aynı kilit); aksi hâlde düğme yerine neden yazılır.
export function OrderItemsEditSection({ storeId, detail, onChanged }: Props) {
  const [open, setOpen] = useState(false);

  if (detail.cancelBlockedReason) {
    return <p className="m-0 text-ui-xs text-fg-muted">Kalem ve adres düzenlenemez: {detail.cancelBlockedReason}</p>;
  }
  if (!open) {
    return (
      <div>
        <button type="button" className={ghostButtonClass} onClick={() => setOpen(true)}>
          <PackageOpen size={14} aria-hidden /> Kalem / adres düzenle
        </button>
      </div>
    );
  }

  return (
    <OrderItemsEditForm
      key={detail.lines.map((line) => `${line.id}:${line.quantity}`).join('|')}
      storeId={storeId} detail={detail} onClose={() => setOpen(false)} onChanged={onChanged}
    />
  );
}
