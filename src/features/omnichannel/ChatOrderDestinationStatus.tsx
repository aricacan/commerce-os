'use client';

import { ExternalLink, RotateCcw, Send, Truck } from 'lucide-react';
import { ORDER_DESTINATION_KIND } from '../../lib/api/omnichannel-order-destinations';
import type { ChatOrderDto } from '../../lib/api/omnichannel-chat-orders';
import { ghostButtonClass } from './CustomerPanelParts';
import { canSendToDestination } from './chatOrderRules';
import { ChatOrderErpStatus } from './ChatOrderErpStatus';
import { destinationBadge, showErpChangeWarning } from './orderDestinationRules';
import { isHttpUrl } from './paymentOptionDraft';
import { ScopeBadge } from './ScopeBadge';

interface Props {
  order: ChatOrderDto;
  canWrite: boolean;
  busy: boolean;
  onSend: () => void;
}

const KEPT_IN_PANEL_TEXT = 'Bu kanalda siparişler yalnız panelde tutuluyor; hiçbir yere gönderilmez.';
const ERP_CHANGE_WARNING =
  "Bu sipariş ERP'ye gönderildi; değişiklik ERP'ye yansımaz, orada elle düzeltin.";

// Siparişin hedefi ve durumu: hedef rozeti, "Shopify #1001" bağlantısı + kargo takibi, hata sebebi ve "Yeniden
// gönder". Aynı sipariş Shopify'da iki kez açılmaz (sunucu garanti eder). ERP hedefinde durum ChatOrderErpStatus'ta; ERP'ye
// gitmiş siparişte düzenleme/iptal kilitlenmez, yalnız değişikliğin ERP'ye yansımayacağı söylenir.
export function ChatOrderDestinationStatus({ order, canWrite, busy, onSend }: Props) {
  const sendable = canSendToDestination(order);
  const badge = destinationBadge(order);
  const sent = Boolean(order.shopifyOrderName);
  if (!sent && !order.shopifyError && !sendable && !badge) return null;

  return (
    <div className="flex min-w-0 flex-col gap-1 text-[10.5px]">
      {badge && <span className="self-start"><ScopeBadge label={badge.label} tone={badge.tone} /></span>}

      {order.shopifyOrderName && (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--fg)]">
          <ExternalLinkOrText url={order.shopifyOrderUrl} label={`Shopify ${order.shopifyOrderName}`} />
          {order.trackingNumber && (
            <span className="inline-flex items-center gap-1 text-[var(--fg-muted)]">
              <Truck size={11} aria-hidden />
              <ExternalLinkOrText url={order.trackingUrl} label={order.trackingNumber} />
            </span>
          )}
        </span>
      )}

      {!sent && order.destinationKind === ORDER_DESTINATION_KIND.None && (
        <p role="status" className="m-0 text-[var(--fg-muted)]">{KEPT_IN_PANEL_TEXT}</p>
      )}
      {!sent && order.destinationKind === ORDER_DESTINATION_KIND.ErpSource && <ChatOrderErpStatus order={order} />}
      {showErpChangeWarning(order) && <p role="status" className="m-0 text-[var(--warning)]">{ERP_CHANGE_WARNING}</p>}

      {order.shopifyError && (
        <p role="alert" className="m-0 break-words text-[var(--danger)]">Shopify&apos;a gönderilemedi: {order.shopifyError}</p>
      )}

      {canWrite && sendable && (
        <button type="button" className={`${ghostButtonClass} self-start`} disabled={busy} onClick={onSend}>
          {order.shopifyError || order.erpError
            ? <><RotateCcw size={12} aria-hidden /> Yeniden gönder</>
            : <><Send size={12} aria-hidden /> Gönder</>}
        </button>
      )}
    </div>
  );
}

function ExternalLinkOrText({ url, label }: { url?: string | null; label: string }) {
  if (!url || !isHttpUrl(url)) return <span className="font-mono font-semibold">{label}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono font-semibold underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--fg)]">
      {label} <ExternalLink size={10} className="shrink-0" aria-hidden />
    </a>
  );
}
