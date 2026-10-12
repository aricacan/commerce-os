'use client';

import type { ShopifyOrderListItemDto } from '../../lib/api/shopify-explorer';
import { BulkSelectBox } from './BulkSelectBox';
import type { BulkSelection } from './useBulkSelection';
import { financialMeta, formatDateTime, formatMoney, fulfillmentMeta } from './explorerRules';
import { StatusBadge } from './StatusBadge';

interface Props {
  orders: ShopifyOrderListItemDto[];
  onOpen: (orderId: number) => void;
  // Verilirse her satırın başına toplu işlem seçim kutusu eklenir.
  selection?: BulkSelection;
}

// Sipariş satırları: dar ekranda sarar (gizlenen kolon yok), tıklayınca detay açılır.
export function OrderTable({ orders, onOpen, selection }: Props) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {orders.map((order) => <OrderRow key={order.id} order={order} onOpen={onOpen} selection={selection} />)}
    </ul>
  );
}

interface RowProps {
  order: ShopifyOrderListItemDto;
  onOpen: (orderId: number) => void;
  selection?: BulkSelection;
}

function OrderRow({ order, onOpen, selection }: RowProps) {
  const financial = financialMeta(order.financialStatus);
  const fulfillment = fulfillmentMeta(order.fulfillmentStatus);
  const place = [order.city, order.countryCode].filter(Boolean).join(', ');

  return (
    <li className="flex items-center gap-2">
      {selection && (
        <BulkSelectBox
          checked={selection.selected.has(order.id)} label={`${order.name} siparişini seç`}
          disabled={selection.limitReached && !selection.selected.has(order.id)} onChange={() => selection.toggle(order.id)}
        />
      )}
      <button
        type="button"
        onClick={() => onOpen(order.id)}
        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border-soft bg-card px-3 py-2 text-left hover:bg-bg-subtle"
      >
        <span className="w-20 shrink-0 text-ui-sm font-bold text-fg">{order.name}</span>
        <span className="min-w-0 flex-1 basis-40">
          <span className="block truncate text-ui-xs text-fg">{order.customerName ?? 'Müşteri bilgisi yok'}</span>
          <span className="block truncate text-ui-2xs text-fg-muted">{[formatDateTime(order.createdAt), place].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="flex flex-wrap items-center gap-1">
          {order.cancelledAt && <StatusBadge label="İptal" tone="danger" />}
          <StatusBadge label={financial.label} tone={financial.tone} />
          <StatusBadge label={fulfillment.label} tone={fulfillment.tone} />
          {order.chatOrderId !== null && <StatusBadge label={`Sohbet #${order.chatOrderId}`} tone="bot" />}
        </span>
        <span className="w-28 shrink-0 text-right text-ui-xs font-semibold text-fg">{formatMoney(order.total)}</span>
      </button>
    </li>
  );
}
