import { Banknote, Landmark } from 'lucide-react';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { PAYMENT_METHOD, type PaymentMethod } from '../../lib/api/omnichannel';
import type { ChatOrderListItemDto } from '../../lib/api/omnichannel-chat-orders';
import { badgeBase, badgeTone, focusRing, motionFast } from '../shared/design';
import { ChatOrderStatusBadge } from './ChatOrderStatusBadge';
import { formatPanelDate } from './CustomerPanelParts';
import { orderItemSummary } from './chatOrderListRules';
import { formatOrderMoney, orderDisplayNo } from './chatOrderRules';
import { destinationBadge } from './orderDestinationRules';
import { PAYMENT_METHOD_LABELS } from './paymentOptionDraft';
import { channelTypeMeta } from './shared';

const FLAG_SIZE = 16;
const CHANNEL_ICON_SIZE = 12;

interface Props {
  order: ChatOrderListItemDto;
  selected: boolean;
  onSelect: () => void;
}

// Siparişler listesinin bir satırı: no + müşteri + ürün özeti solda, toplam + durum sağda.
// Telefonda tarih ve ödeme rozeti ikinci satıra iner.
export function OrderListRow({ order, selected, onSelect }: Props) {
  const channel = order.channelType === null ? null : channelTypeMeta(order.channelType);
  const destination = destinationBadge(order);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left ${motionFast} ${focusRing} ${
        selected ? 'bg-bg-subtle' : 'hover:bg-bg-subtle/50'}`}
    >
      <span className="flex w-5 shrink-0 flex-col items-center gap-1.5 pt-0.5">
        <CountryFlag code={order.country} size={FLAG_SIZE} />
        {channel && <channel.Icon size={CHANNEL_ICON_SIZE} color={channel.color} aria-label={order.channelName ?? undefined} />}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-mono text-ui-sm font-bold text-fg">{orderDisplayNo(order)}</span>
          <span className="truncate text-ui-sm font-semibold text-fg">{order.fullName ?? 'İsimsiz müşteri'}</span>
        </span>
        <span className="truncate text-ui-xs text-fg-muted">{orderItemSummary(order.items)}</span>
        <span className="flex flex-wrap items-center gap-1.5 text-ui-2xs text-fg-muted">
          <span>{formatPanelDate(order.confirmedAt ?? order.createdAt, true)}</span>
          {order.createdByAgent && <span className={`${badgeBase} ${badgeTone.neutral}`}>Temsilci açtı</span>}
          {order.paymentMethod !== null && <PaymentBadge method={order.paymentMethod} />}
          {order.shopifyOrderName && <span className={`${badgeBase} ${badgeTone.success}`}>Shopify {order.shopifyOrderName}</span>}
          {order.hasShopifyError && <span className={`${badgeBase} ${badgeTone.danger}`}>Shopify hatası</span>}
          {destination && <span className={`${badgeBase} ${badgeTone[destination.tone]}`}>{destination.label}</span>}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="font-mono text-ui-sm font-bold text-fg">{formatOrderMoney(order.total, order.currency)}</span>
        <ChatOrderStatusBadge status={order.status} />
      </span>
    </button>
  );
}

function PaymentBadge({ method }: { method: PaymentMethod }) {
  const Icon = method === PAYMENT_METHOD.BankTransfer ? Landmark : Banknote;
  const tone = method === PAYMENT_METHOD.BankTransfer ? badgeTone.info : badgeTone.neutral;
  return (
    <span className={`${badgeBase} ${tone}`}>
      <Icon size={10} aria-hidden /> {PAYMENT_METHOD_LABELS[method]}
    </span>
  );
}
