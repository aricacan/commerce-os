import { ShoppingCart } from 'lucide-react';
import type { CustomerChatOrderSummaryDto } from '../../lib/api/customer-crm';
import { EmptyLine, PanelSection, formatPanelDate } from './CustomerPanelParts';
import { ChatOrderStatusBadge } from './ChatOrderStatusBadge';
import { formatOrderMoney, orderDisplayNo } from './chatOrderRules';

interface Props {
  orders: CustomerChatOrderSummaryDto[];
  onOpenConversation?: (conversationId: number) => void;
}

// Sohbetten verilen siparişlerin özeti (müşteri detayıyla gelir). Satır, siparişin verildiği
// konuşmayı açar; tam sipariş kartı (düzenleme, geçmiş) oradadır.
export function CustomerChatOrdersSection({ orders, onOpenConversation }: Props) {
  return (
    <PanelSection title="Siparişler" count={orders.length}>
      {orders.length === 0 && <EmptyLine>Sohbetten verilmiş sipariş yok.</EmptyLine>}
      <ul className="flex flex-col gap-1.5">
        {orders.map((order) => (
          <ChatOrderRow key={order.id} order={order} onOpen={onOpenConversation && (() => onOpenConversation(order.conversationId))} />
        ))}
      </ul>
    </PanelSection>
  );
}

function ChatOrderRow({ order, onOpen }: { order: CustomerChatOrderSummaryDto; onOpen?: () => void }) {
  return (
    <li>
      <button type="button" disabled={!onOpen} onClick={onOpen} title={onOpen ? 'Siparişin konuşmasını aç' : undefined}
        className="flex w-full items-start gap-2 rounded-[4px] py-1 text-left text-xs enabled:hover:bg-[var(--bg-subtle)]">
        <ShoppingCart size={13} className="mt-0.5 shrink-0 text-[var(--fg-muted)]" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="font-mono text-[var(--fg)]">{orderDisplayNo(order)}</span>
            <ChatOrderStatusBadge status={order.status} />
          </span>
          <span className="text-[10.5px] text-[var(--fg-muted)]">
            {formatPanelDate(order.createdAt)} · {order.itemCount} ürün
          </span>
        </span>
        <span className="shrink-0 font-mono text-[var(--fg)]">{formatOrderMoney(order.total, order.currency)}</span>
      </button>
    </li>
  );
}
