'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, ShoppingCart } from 'lucide-react';
import type { ChatOrderDto } from '../../lib/api/omnichannel-chat-orders';
import { focusRing } from '../shared/design';
import { ghostButtonClass } from './CustomerPanelParts';
import { ChatOrderStatusBadge } from './ChatOrderStatusBadge';
import { ChatOrderDetails } from './ChatOrderDetails';
import { ChatOrderActions } from './ChatOrderActions';
import { ChatOrderFormDialog } from './ChatOrderFormDialog';
import { ChatOrderDestinationStatus } from './ChatOrderDestinationStatus';
import { useChatOrderCommands } from './useChatOrderCommands';
import { INFO_SECTION_CLASS, INFO_SECTION_HEADING_CLASS } from './infoSectionStyle';
import { formatOrderMoney, isOpenChatOrder, orderDisplayNo, pickFeaturedChatOrder } from './chatOrderRules';

interface Props {
  conversationId: number;
  // Konuşmanın siparişleri (en yeni önce); üst bileşen yükler ki başlık sayacı da görsün.
  orders: ChatOrderDto[];
  reload: () => Promise<void>;
  canWrite: boolean;
}

// "Ayrıntılar" panelindeki sipariş kartı (P21): botun ya da temsilcinin açtığı siparişin son hâli.
// Açık (müşterinin henüz onaylamadığı) sipariş yoksa temsilci konuşmadan yeni sipariş oluşturabilir.
export function ChatOrderCard({ conversationId, orders, reload, canWrite }: Props) {
  const [creating, setCreating] = useState(false);
  const featured = pickFeaturedChatOrder(orders);
  const canCreate = canWrite && !orders.some((o) => isOpenChatOrder(o.status));

  return (
    <>
      {featured && (
        // Sipariş değişince (yeni sipariş, başka konuşma) açık/kapalı ve form durumu sıfırlansın.
        <OrderPanel key={featured.order.id} order={featured.order} initiallyOpen={!featured.collapsed}
          canWrite={canWrite} onChanged={reload} />
      )}
      {canCreate && (
        <button type="button" className={`${ghostButtonClass} self-start ${focusRing}`} onClick={() => setCreating(true)}>
          <Plus size={12} aria-hidden /> Sipariş oluştur
        </button>
      )}
      {creating && (
        <ChatOrderFormDialog mode="create" conversationId={conversationId} onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); void reload(); }} />
      )}
    </>
  );
}

function OrderPanel({ order, initiallyOpen, canWrite, onChanged }: {
  order: ChatOrderDto;
  initiallyOpen: boolean;
  canWrite: boolean;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [editing, setEditing] = useState(false);
  const { busy, error, commands } = useChatOrderCommands(order, onChanged);

  return (
    <section aria-label="Sohbet siparişi" className={INFO_SECTION_CLASS}>
      <div className={INFO_SECTION_HEADING_CLASS}>
        <ShoppingCart size={13} className="shrink-0 text-[var(--fg-muted)]" aria-hidden />
        <span className="font-mono font-bold text-[var(--fg)]">{orderDisplayNo(order)}</span>
        <ChatOrderStatusBadge status={order.status} />
        <div className="flex-1" />
        <span className="font-mono font-semibold text-[var(--fg)]">{formatOrderMoney(order.total, order.currency)}</span>
        <button
          type="button"
          className={`${ghostButtonClass} ${focusRing}`}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Siparişi gizle' : 'Siparişi göster'}
        >
          {open ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />}
        </button>
      </div>

      {open && commands && (
        <div className="flex min-w-0 flex-col gap-2">
          <ChatOrderDetails order={order} />
          <ChatOrderDestinationStatus order={order} canWrite={canWrite} busy={busy} onSend={() => void commands.sendToDestination()} />
          {error && <p role="alert" className="break-words text-[11px] text-[var(--danger)]">{error}</p>}
          {canWrite && <ChatOrderActions order={order} busy={busy} commands={commands} onEdit={() => setEditing(true)} />}
        </div>
      )}

      {editing && (
        <ChatOrderFormDialog mode="edit" order={order} onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); void onChanged(); }} />
      )}
    </section>
  );
}
