import { ExternalLink, Mail, MapPin, Phone, UserRound, Wallet } from 'lucide-react';
import type { ChatOrderDto } from '../../lib/api/omnichannel-chat-orders';
import { isHttpUrl, PAYMENT_METHOD_LABELS } from './paymentOptionDraft';
import { formatPanelDate } from './CustomerPanelParts';
import { eventActorLabel, eventTitle, formatOrderAddress, formatOrderMoney } from './chatOrderRules';

// Sipariş kartının salt okunur gövdesi: kalemler, toplam, ödeme, teslimat ve geçmiş (kim, ne zaman, ne yaptı).
// Adres ve telefon tam gösterilir — kartı yalnız yetkili temsilci görür.
export function ChatOrderDetails({ order }: { order: ChatOrderDto }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <OrderLines order={order} />
      <DeliveryInfo order={order} />
      {order.cancelReason && (
        <p className="break-words text-[10.5px] text-[var(--fg-muted)]">İptal sebebi: {order.cancelReason}</p>
      )}
      {order.events.length > 0 && <OrderTimeline order={order} />}
    </div>
  );
}

function OrderLines({ order }: { order: ChatOrderDto }) {
  const money = (amount: number) => formatOrderMoney(amount, order.currency);

  return (
    <div className="flex flex-col gap-1">
      {order.lines.length === 0 && <p className="text-[10.5px] text-[var(--fg-muted)]">Henüz ürün eklenmedi.</p>}
      <ul className="flex flex-col gap-0.5">
        {order.lines.map((line, index) => (
          <li key={`${line.sku ?? line.title}-${index}`} className="flex items-start gap-2">
            <span className="min-w-0 flex-1 break-words text-[var(--fg)]">
              {line.productUrl && isHttpUrl(line.productUrl) ? (
                <a href={line.productUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--fg)]">
                  {line.title} <ExternalLink size={10} className="shrink-0" aria-hidden />
                </a>
              ) : line.title}
              {' '}<span className="text-[var(--fg-muted)]">× {line.quantity}</span>
            </span>
            <span className="shrink-0 font-mono text-[var(--fg)]">{money(line.unitPrice * line.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-0.5 border-t border-[var(--border-soft)] pt-1 text-[10.5px] text-[var(--fg-muted)]">
        {order.shippingAmount !== null && <span>Kargo {money(order.shippingAmount)}</span>}
        <span className="text-xs font-bold text-[var(--fg)]">Toplam {money(order.total)}</span>
      </div>
    </div>
  );
}

function DeliveryInfo({ order }: { order: ChatOrderDto }) {
  const address = formatOrderAddress(order);

  return (
    <div className="flex flex-col gap-0.5 text-[10.5px] text-[var(--fg-muted)]">
      <InfoRow icon={UserRound} value={order.fullName} />
      <InfoRow icon={Phone} value={order.phone} />
      <InfoRow icon={Mail} value={order.email ?? null} />
      <InfoRow icon={MapPin} value={address || null} />
      <InfoRow icon={Wallet} value={order.paymentMethod === null ? null : PAYMENT_METHOD_LABELS[order.paymentMethod]} />
      {order.note && <p className="break-words">Not: {order.note}</p>}
    </div>
  );
}

function InfoRow({ icon: Icon, value }: { icon: typeof MapPin; value: string | null }) {
  return (
    <span className="flex min-w-0 items-start gap-1.5">
      <Icon size={11} className="mt-px shrink-0" aria-hidden />
      <span className={`min-w-0 break-words ${value ? 'text-[var(--fg)]' : 'italic'}`}>{value ?? 'henüz yok'}</span>
    </span>
  );
}

function OrderTimeline({ order }: { order: ChatOrderDto }) {
  return (
    <ol className="flex flex-col gap-0.5 border-l border-[var(--border-soft)] pl-2.5 text-[10.5px] text-[var(--fg-muted)]">
      {order.events.map((event, index) => (
        <li key={`${event.at}-${index}`} className="break-words">
          <span>{formatPanelDate(event.at, true)}</span>
          {' · '}{eventActorLabel(event)}
          {' · '}<span className="text-[var(--fg)]">{eventTitle(event)}</span>
          {event.note && <> — {event.note}</>}
        </li>
      ))}
    </ol>
  );
}
