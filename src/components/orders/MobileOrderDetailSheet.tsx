'use client';

import Link from 'next/link';
import { CalendarClock, CreditCard, ExternalLink, MapPin, Package, Trash2, Truck, User } from 'lucide-react';
import type { OrderDetail } from '../../types/api';
import { platformColor } from '../../lib/platform-colors';
import { formatOrderNumberWithHash } from '../../utils/orderNumber';
import { orderStatusLabel } from '../../utils/orderStatusLabel';
import { BottomSheet } from '../ui/BottomSheet';
import { OrderNoteEditor } from './OrderNoteEditor';
import { OrderFeeBreakdown } from './OrderFeeBreakdown';

interface MobileOrderDetailSheetProps {
  order: OrderDetail | null;
  onClose: () => void;
  queryKey: readonly unknown[];
  formatMoney: (amount: number, sourceType?: string | null) => string;
  formatOrderDate: (date: string) => string;
  onDelete?: (orderId: number) => void;
  deleting?: boolean;
}

export function MobileOrderDetailSheet({
  order,
  onClose,
  queryKey,
  formatMoney,
  formatOrderDate,
  onDelete,
  deleting = false,
}: MobileOrderDetailSheetProps) {
  if (!order) return null;

  const marketplaceColor = platformColor(order.platformName);

  return (
    <BottomSheet
      open
      onClose={onClose}
      aboveBottomNav
      title={`Sipariş ${formatOrderNumberWithHash(order.platformOrderNumber, order.orderCode)}`}
    >
      <div className="flex flex-col gap-4 px-4 pb-2">
        <div className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className="rounded-md px-2 py-1 text-[10px] font-bold text-white"
              style={{ background: order.storeColor ?? 'var(--fg-muted)' }}
            >
              {order.storeName}
            </span>
            <span
              className="rounded-md px-2 py-1 text-[10px] font-bold text-white"
              style={{ background: marketplaceColor }}
            >
              {order.platformName}
            </span>
          </div>
          <strong className="shrink-0 text-sm text-[var(--fg)]">
            {formatMoney(order.totalAmount, order.sourceType)}
          </strong>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <InfoTile icon={CalendarClock} label="Tarih" value={formatOrderDate(order.orderDate)} />
          <InfoTile icon={MapPin} label="Şehir" value={order.shipCity || '—'} />
          <InfoTile icon={Truck} label="Durum" value={orderStatusLabel(order.universalStatus)} />
          <InfoTile icon={Package} label="Ürün" value={`${order.items.length} kalem`} />
        </div>

        {(order.customerName || order.addressLine || order.addressDistrict) && (
          <section className="rounded-xl border border-[var(--border-soft)] p-3">
            <h4 className="m-0 mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
              Teslimat
            </h4>
            {order.customerName && (
              <p className="m-0 flex items-start gap-2 text-xs font-semibold text-[var(--fg)]">
                <User size={14} className="mt-0.5 shrink-0 text-[var(--fg-muted)]" />
                {order.customerName}
              </p>
            )}
            {(order.addressLine || order.addressDistrict) && (
              <p className="m-0 mt-2 flex items-start gap-2 text-xs leading-5 text-[var(--fg-muted)]">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                {[order.addressLine, order.addressDistrict].filter(Boolean).join(', ')}
              </p>
            )}
          </section>
        )}

        {(order.packageCode || order.orderCode || order.shippingTotal != null || order.paymentStatus) && (
          <section className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--border-soft)] p-3">
            <Meta label="Paket kodu" value={order.packageCode || order.orderCode || '—'} />
            <Meta
              label="Kargo"
              value={order.shippingTotal != null ? formatMoney(order.shippingTotal, order.sourceType) : '—'}
            />
            {order.paymentStatus && <Meta label="Ödeme" value={order.paymentStatus} />}
          </section>
        )}

        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="m-0 text-[11px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
              Sipariş notu
            </h4>
            <OrderNoteEditor orderId={order.orderId} note={order.note} queryKey={queryKey} />
          </div>
        </section>

        <section>
          <h4 className="m-0 mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
            Ürünler
          </h4>
          <div className="flex flex-col gap-2">
            {order.items.length === 0 ? (
              <div className="rounded-xl bg-[var(--bg-subtle)] p-3 text-xs text-[var(--fg-muted)]">
                Ürün bilgisi bulunamadı.
              </div>
            ) : order.items.map((item, index) => (
              <article key={`${item.productId}-${index}`} className="rounded-xl border border-[var(--border-soft)] p-3">
                <p className="m-0 break-words text-xs font-bold leading-5 text-[var(--fg)]">{item.productName}</p>
                <p className="m-0 mt-1 break-all font-mono text-[10.5px] text-[var(--fg-muted)]">
                  {item.supplierSku || 'SKU yok'}
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <span className="text-[11px] text-[var(--fg-muted)]">
                    {item.quantity} adet × {formatMoney(item.unitPrice, order.sourceType)}
                  </span>
                  <span className={`text-[11px] font-bold ${item.hasCostData ? (item.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-[var(--fg-subtle)]'}`}>
                    Kâr: {item.hasCostData ? formatMoney(item.netProfit, order.sourceType) : '—'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <OrderFeeBreakdown order={order} format={(amount) => formatMoney(amount, order.sourceType)} />

        <Link
          href={`/orders/${order.orderId}`}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white no-underline"
        >
          Tüm sipariş detayları <ExternalLink size={14} />
        </Link>
        {onDelete && (
          <button type="button" disabled={deleting} onClick={() => onDelete(order.orderId)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-transparent px-4 text-sm font-bold text-red-600 disabled:opacity-50">
            <Trash2 size={14} /> Siparişi sil
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof CreditCard; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--border-soft)] p-3">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--fg-muted)]">
        <Icon size={12} /> {label}
      </span>
      <strong className="mt-1 block truncate text-xs text-[var(--fg)]" title={value}>{value}</strong>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-[10px] font-semibold text-[var(--fg-muted)]">{label}</span>
      <strong className="mt-0.5 block break-all text-xs text-[var(--fg)]">{value}</strong>
    </div>
  );
}
