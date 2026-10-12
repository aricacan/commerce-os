'use client';

import { useCallback } from 'react';
import { ExternalLink, ShoppingBag } from 'lucide-react';
import { customersApi, type CustomerShopifyOrderDto } from '../../lib/api/customers';
import { shopifyOrderHref } from '../shopify/orderLink';
import { useLoad } from './useLoad';
import { EmptyLine, PanelSection, formatPanelDate } from './CustomerPanelParts';
import {
  financialLabel, fulfillmentLabel, matchedByLabel, safeTrackingUrl, shopifyOrdersNotice, type ShopifyOrdersNotice,
} from './shopifyOrderRules';

// Müşterinin Shopify siparişleri (telefon/e-posta eşleşmesi). Kapalı başlar, açılınca yüklenir: sorgu canlı Shopify'a
// gider. Her sipariş satırı Hub'daki sipariş detayını yeni sekmede açar.
export function CustomerShopifyOrdersSection({ profileId }: { profileId: number }) {
  return (
    <PanelSection title="Shopify siparişleri" defaultOpen={false}>
      <ShopifyOrdersList profileId={profileId} />
    </PanelSection>
  );
}

function ShopifyOrdersList({ profileId }: { profileId: number }) {
  const loader = useCallback(() => customersApi.shopifyOrders(profileId), [profileId]);
  const { data, error } = useLoad(loader);

  if (error) return <EmptyLine>{error}</EmptyLine>;
  if (!data) return <EmptyLine>Yükleniyor…</EmptyLine>;

  const notice = shopifyOrdersNotice(data);
  return (
    <div className="flex flex-col gap-2">
      {notice && <NoticeLine notice={notice} />}
      {data.outcome === 'ok' && data.orders.length === 0 && (
        <EmptyLine>Telefon ya da e-postayla eşleşen Shopify siparişi yok (son 60 gün).</EmptyLine>
      )}
      {data.orders.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.orders.map((o) => <ShopifyOrderRow key={`${o.storeId}-${o.orderId}`} order={o} />)}
        </ul>
      )}
    </div>
  );
}

function NoticeLine({ notice }: { notice: ShopifyOrdersNotice }) {
  const tone = notice.tone === 'error' ? 'text-[var(--danger)]' : 'text-[var(--fg-muted)]';
  return <p role={notice.tone === 'error' ? 'alert' : undefined} className={`m-0 text-[11px] ${tone}`}>{notice.text}</p>;
}

function ShopifyOrderRow({ order }: { order: CustomerShopifyOrderDto }) {
  return (
    <li className="flex items-start gap-2 text-xs">
      <ShoppingBag size={13} className="mt-0.5 shrink-0 text-[var(--fg-muted)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <a
          href={shopifyOrderHref(order)} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 truncate font-mono text-[var(--fg)] hover:underline"
        >
          {order.name} <ExternalLink size={10} aria-hidden />
          <span className="sr-only">Hub&apos;da sipariş detayını aç</span>
        </a>
        <span className="text-[10.5px] text-[var(--fg-muted)]">
          {formatPanelDate(order.createdAt)} · {fulfillmentLabel(order)} · {financialLabel(order)} · {matchedByLabel(order.matchedBy)} eşleşmesi
        </span>
        {order.tracking.map((t, index) => <TrackingLine key={index} tracking={t} />)}
      </div>
      {order.total !== null && (
        <span className="shrink-0 font-mono text-[var(--fg)]">
          {order.total.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {order.currency}
        </span>
      )}
    </li>
  );
}

function TrackingLine({ tracking }: { tracking: CustomerShopifyOrderDto['tracking'][number] }) {
  const text = [tracking.company, tracking.number].filter(Boolean).join(' · ');
  if (!text) return null;

  const url = safeTrackingUrl(tracking.url);

  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="truncate text-[10.5px] text-[var(--fg)] hover:underline">
      Takip: {text}
    </a>
  ) : (
    <span className="truncate text-[10.5px] text-[var(--fg-muted)]">Takip: {text}</span>
  );
}
