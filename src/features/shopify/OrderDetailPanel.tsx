'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type {
  CancelShopifyOrderBody, SaveShopifyOrderBody, ShopifyOrderDetailDto, ShopifyRefundBody, ShopifyRefundPreviewDto,
} from '../../lib/api/shopify-explorer';
import type { ShopifyFulfillBody } from '../../lib/api/shopify-payment-shipping';
import { surfaceCard } from '../shared/design';
import { canFulfillOrder } from './fulfillmentRules';
import { OrderFulfillSection } from './OrderFulfillSection';
import {
  CHAT_ORDERS_PATH, canMarkOrderPaid, financialMeta, formatDateTime, formatMoney, fulfillmentMeta,
} from './explorerRules';
import { OrderCancelSection } from './OrderCancelSection';
import { OrderDeleteSection } from './OrderDeleteSection';
import { OrderItemsEditSection } from './OrderItemsEditSection';
import { OrderEditSection } from './OrderEditSection';
import { OrderRefundSection } from './OrderRefundSection';
import { StatusBadge } from './StatusBadge';
import { ghostButtonClass } from './styles';

interface Props {
  storeId: number;
  detail: ShopifyOrderDetailDto;
  busy: boolean;
  onBack: () => void;
  onCancel: (body: CancelShopifyOrderBody) => void;
  onSave: (body: SaveShopifyOrderBody) => void;
  onMarkPaid: () => void;
  onPreviewRefund: (body: ShopifyRefundBody) => Promise<ShopifyRefundPreviewDto | null>;
  onRefund: (body: ShopifyRefundBody) => Promise<boolean>;
  onFulfill: (body: ShopifyFulfillBody) => Promise<boolean>;
  // Kalem/adres düzenlendi: sipariş ve liste yenilenir.
  onChanged: () => Promise<void>;
  // Sipariş Shopify'dan silindi: liste görünümüne dönülür.
  onDeleted: () => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-ui-2xs font-semibold text-fg-muted">{label}</dt>
      <dd className="m-0 break-words text-ui-xs text-fg">{children}</dd>
    </div>
  );
}

// Sipariş detayı: kalemler, adres, ödeme ağ geçidi, notlar/etiketler, sohbet siparişi bağlantısı, düzenleme, iptal ve silme.
export function OrderDetailPanel({
  storeId, detail, busy, onBack, onCancel, onSave, onMarkPaid, onPreviewRefund, onRefund, onFulfill, onChanged, onDeleted,
}: Props) {
  const { order } = detail;
  const financial = financialMeta(order.financialStatus);
  const fulfillment = fulfillmentMeta(order.fulfillmentStatus);
  const address = detail.shippingAddress;

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center gap-2">
        <button type="button" className={ghostButtonClass} onClick={onBack}><ArrowLeft size={14} aria-hidden /> Siparişler</button>
        <h2 className="m-0 text-ui-md font-bold text-fg">{order.name}</h2>
        {order.cancelledAt && <StatusBadge label="İptal" tone="danger" />}
        <StatusBadge label={financial.label} tone={financial.tone} />
        <StatusBadge label={fulfillment.label} tone={fulfillment.tone} />
        <a href={detail.adminUrl} target="_blank" rel="noreferrer" className={`${ghostButtonClass} ml-auto`}>
          Shopify&apos;da aç <ExternalLink size={14} aria-hidden />
        </a>
      </header>

      {order.chatOrderId !== null && (
        <p className="m-0 rounded-md bg-bg-subtle px-3 py-2 text-ui-xs text-fg">
          Bu sipariş panelde bir sohbetten açıldı: sohbet siparişi #{order.chatOrderId}.{' '}
          <Link href={CHAT_ORDERS_PATH} className="font-semibold underline">Omnichannel › Siparişler</Link>
        </p>
      )}

      <section className={`${surfaceCard} flex flex-col gap-2 p-3`} aria-label="Kalemler">
        <h3 className="m-0 text-ui-sm font-bold text-fg">Kalemler</h3>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {detail.lines.map((line, index) => (
            <li key={`${line.sku ?? line.title}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 text-ui-xs">
              <span className="min-w-0 flex-1 basis-48 break-words text-fg">
                {line.quantity} × {line.title}{line.variantTitle ? ` — ${line.variantTitle}` : ''}
                <span className="block text-ui-2xs text-fg-muted">{line.sku ? `SKU ${line.sku}` : 'SKU yok'}</span>
              </span>
              <span className="font-semibold text-fg">{formatMoney(line.unitPrice)}</span>
            </li>
          ))}
        </ul>
        <dl className="m-0 grid grid-cols-3 gap-2 border-t border-border-soft pt-2">
          <Row label="Ara toplam">{formatMoney(detail.subtotal)}</Row>
          <Row label="Kargo">{formatMoney(detail.shipping)}</Row>
          <Row label="Toplam">{formatMoney(order.total)}</Row>
          {detail.refunded && detail.refunded.amount > 0 && <Row label="İade edilen">{formatMoney(detail.refunded)}</Row>}
        </dl>
      </section>

      <section className={`${surfaceCard} p-3`} aria-label="Sipariş bilgileri">
        <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Row label="Tarih">{formatDateTime(order.createdAt)}</Row>
          <Row label="Müşteri">{[order.customerName, detail.email, detail.phone].filter(Boolean).join(' · ') || '—'}</Row>
          <Row label="Teslimat adresi">
            {address
              ? [address.name, address.address1, address.address2, address.postalCode, address.city, address.countryCode, address.phone]
                .filter(Boolean).join(', ')
              : '—'}
          </Row>
          <Row label="Ödeme ağ geçidi">{order.paymentGateways.length > 0 ? order.paymentGateways.join(', ') : 'Kayıt yok'}</Row>
          <Row label="Kargo takip">
            {detail.tracking.length > 0
              ? detail.tracking.map((t) => [t.company, t.number].filter(Boolean).join(' ')).join(' · ')
              : 'Henüz yok'}
          </Row>
          <Row label="Etiketler">{order.tags.length > 0 ? order.tags.join(', ') : '—'}</Row>
          <Row label="Not">{detail.note ?? '—'}</Row>
          {detail.cancelReason && <Row label="İptal sebebi">{detail.cancelReason}</Row>}
        </dl>
      </section>

      <OrderEditSection
        key={`${order.id}-${detail.note ?? ''}-${order.tags.join(',')}`}
        note={detail.note} email={detail.email} phone={detail.phone} tags={order.tags}
        canMarkPaid={canMarkOrderPaid(order)} busy={busy} onSave={onSave} onMarkPaid={onMarkPaid}
      />

      <OrderItemsEditSection storeId={storeId} detail={detail} onChanged={onChanged} />

      <OrderRefundSection
        lines={detail.lines} blockedReason={order.cancelledAt ? 'sipariş iptal edilmiş.' : null}
        busy={busy} onPreview={onPreviewRefund} onRefund={onRefund}
      />

      {canFulfillOrder(order) && <OrderFulfillSection storeId={storeId} orderId={order.id} busy={busy} onFulfill={onFulfill} />}

      <OrderCancelSection blockedReason={detail.cancelBlockedReason} onConfirm={onCancel} />

      <OrderDeleteSection
        storeId={storeId} orderId={order.id} orderName={order.name} isCancelled={order.cancelledAt !== null} onDeleted={onDeleted}
      />
    </div>
  );
}
