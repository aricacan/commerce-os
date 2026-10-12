'use client';

import { useCallback } from 'react';
import { ShoppingBag } from 'lucide-react';
import { customersApi, type CustomerOrderDto } from '../../lib/api/customers';
import { EmptyLine, PanelSection, formatPanelDate } from './CustomerPanelParts';
import { useLoad } from './useLoad';

// Pazaryeri/ERP siparişleri (telefon ya da e-postayla eşleşen). Kapalı başlar ve yalnız açılınca
// yüklenir — sorgu ana ERP'ye gider, her sohbet açılışında çalışmasın.
export function CustomerErpOrdersSection({ profileId }: { profileId: number }) {
  return (
    <PanelSection title="Pazaryeri siparişleri" defaultOpen={false}>
      <OrdersList profileId={profileId} />
    </PanelSection>
  );
}

function OrdersList({ profileId }: { profileId: number }) {
  const loader = useCallback(() => customersApi.orders(profileId), [profileId]);
  const { data, error } = useLoad(loader);

  if (error) return <EmptyLine>{error}</EmptyLine>;
  if (!data) return <EmptyLine>Yükleniyor…</EmptyLine>;
  if (data.length === 0) {
    return <EmptyLine>Telefon ya da e-postayla eşleşen sipariş yok. Pazaryerleri iletişim bilgisini gizlediği için eşleşme olmayabilir.</EmptyLine>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {data.map((o) => <OrderRow key={`${o.platform}-${o.orderNumber}`} order={o} />)}
    </ul>
  );
}

function OrderRow({ order }: { order: CustomerOrderDto }) {
  return (
    <li className="flex items-start gap-2 text-xs">
      <ShoppingBag size={13} className="mt-0.5 shrink-0 text-[var(--fg-muted)]" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[var(--fg)]">{order.platform} · <span className="font-mono">{order.orderNumber}</span></span>
        <span className="text-[10.5px] text-[var(--fg-muted)]">
          {formatPanelDate(order.orderDate)} · {order.itemCount} ürün · {order.status} · {order.matchedBy} eşleşmesi
        </span>
      </div>
      <span className="shrink-0 font-mono text-[var(--fg)]">
        {order.total.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {order.currency}
      </span>
    </li>
  );
}
