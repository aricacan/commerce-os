'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, PackageCheck, Send, Ban } from 'lucide-react';
import { purchaseOrderApi, type PurchaseOrder, type PurchaseOrderLine } from '../../lib/api/purchase-order';
import { warehouseApi } from '../../lib/api/warehouse';
import { toast } from '../../lib/toast';
import { describeError } from '../../lib/errors';
import { useI18n } from '../../lib/i18n';

interface Props {
  orderId: number;
  onClose: () => void;
  onChanged: () => void;
}

const STATUS_LABELS: Record<PurchaseOrder['status'], { tr: string; en: string; style: string }> = {
  Draft: { tr: 'Taslak', en: 'Draft', style: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400' },
  Submitted: { tr: 'Gönderildi', en: 'Submitted', style: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  PartiallyReceived: { tr: 'Kısmen Teslim Alındı', en: 'Partially Received', style: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  Completed: { tr: 'Tamamlandı', en: 'Completed', style: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  Cancelled: { tr: 'İptal Edildi', en: 'Cancelled', style: 'border-rose-500/30 bg-rose-500/10 text-rose-400' },
};

function ReceiveRow({ orderId, line, onReceived }: { orderId: number; line: PurchaseOrderLine; onReceived: () => void }) {
  const remaining = line.quantity - line.receivedQuantity;
  const [quantity, setQuantity] = useState(remaining);
  const [locationId, setLocationId] = useState<number | ''>('');
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.listWarehouses(),
    enabled: line.itemType === 'Product' && remaining > 0,
  });
  const locationsQuery = useQuery({
    queryKey: ['warehouse-locations', warehouseId],
    queryFn: () => warehouseApi.listLocations(Number(warehouseId)),
    enabled: warehouseId !== '',
  });

  const receive = useMutation({
    mutationFn: () =>
      purchaseOrderApi.receiveLine(
        orderId,
        line.id,
        quantity,
        line.itemType === 'Product' ? Number(locationId) : null,
        line.receivedQuantity,
      ),
    onSuccess: () => {
      toast.success(tr ? 'Teslimat başarıyla işlendi.' : 'Receipt processed.');
      onReceived();
    },
    onError: (e) => setError(describeError(e)),
  });

  if (remaining <= 0) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
        <CheckCircle2 size={12} />
        <span>{tr ? `Tamamı teslim alındı (${line.receivedQuantity}/${line.quantity})` : `Fully received (${line.receivedQuantity}/${line.quantity})`}</span>
      </div>
    );
  }

  function handleReceive() {
    setError(null);
    if (quantity <= 0 || quantity > remaining) {
      setError(tr ? `Miktar 1 ile ${remaining} arasında olmalı.` : `Quantity must be 1-${remaining}.`);
      return;
    }
    if (line.itemType === 'Product' && !locationId) {
      setError(tr ? 'Lütfen depo raf lokasyonu seçin.' : 'Please select warehouse location.');
      return;
    }
    receive.mutate();
  }

  return (
    <div className="flex flex-col gap-1.5 mt-2 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="1"
            max={remaining}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="h-7 w-16 rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] font-mono outline-none"
          />
          <span className="text-[11px] text-[var(--fg-muted)]">/ {remaining} {tr ? 'kalan' : 'remaining'}</span>
        </div>

        {line.itemType === 'Product' && (
          <>
            <select
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value ? Number(e.target.value) : '');
                setLocationId('');
              }}
              className="h-7 rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] outline-none"
            >
              <option value="">{tr ? 'Depo seç...' : 'Select warehouse...'}</option>
              {(warehousesQuery.data ?? []).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : '')}
              disabled={warehouseId === ''}
              className="h-7 rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] outline-none disabled:opacity-50"
            >
              <option value="">{tr ? 'Lokasyon/Raf seç...' : 'Select location...'}</option>
              {(locationsQuery.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.fullCode}</option>
              ))}
            </select>
          </>
        )}

        <button
          type="button"
          onClick={handleReceive}
          disabled={receive.isPending}
          className="inline-flex h-7 items-center gap-1 rounded-[3px] bg-[var(--fg)] px-2.5 text-xs font-semibold text-[var(--bg)] hover:opacity-90 transition cursor-pointer disabled:opacity-50 ml-auto"
        >
          <PackageCheck size={12} />
          <span>{receive.isPending ? (tr ? 'İşleniyor...' : 'Processing...') : (tr ? 'Teslim Al' : 'Receive')}</span>
        </button>
      </div>

      {error && <div className="text-[10.5px] text-rose-500">{error}</div>}
    </div>
  );
}

export function PurchaseOrderDetailDialog({ orderId, onClose, onChanged }: Props) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const query = useQuery({
    queryKey: ['purchase-order', orderId],
    queryFn: () => purchaseOrderApi.getById(orderId),
  });
  const order = query.data;

  const submit = useMutation({
    mutationFn: () => purchaseOrderApi.submit(orderId),
    onSuccess: () => {
      toast.success(tr ? 'Sipariş tedarikçiye gönderildi.' : 'Order submitted.');
      void query.refetch();
      onChanged();
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const cancel = useMutation({
    mutationFn: () => purchaseOrderApi.cancel(orderId),
    onSuccess: () => {
      toast.success(tr ? 'Sipariş iptal edildi.' : 'Order cancelled.');
      void query.refetch();
      onChanged();
    },
    onError: (e) => toast.error(describeError(e)),
  });

  if (typeof document === 'undefined') return null;

  const totalAmount = order?.lines?.reduce((acc, l) => acc + (l.quantity * l.unitPrice), 0) ?? 0;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--fg)]">
                  {order ? order.orderNumber : (tr ? 'Sipariş Yükleniyor...' : 'Loading order...')}
                </h2>
                {order && (
                  <span className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${STATUS_LABELS[order.status].style}`}>
                    {tr ? STATUS_LABELS[order.status].tr : STATUS_LABELS[order.status].en}
                  </span>
                )}
              </div>
              {order && (
                <p className="text-[11px] text-[var(--fg-muted)]">
                  {order.supplierName} • {order.orderDate}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {query.isLoading && (
            <div className="py-12 text-center text-xs text-[var(--fg-muted)]">
              {tr ? 'Sipariş detayları yükleniyor...' : 'Loading details...'}
            </div>
          )}

          {order && (
            <>
              {/* Info Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-3 text-xs">
                <div>
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)]">{tr ? 'Tedarikçi' : 'Supplier'}</div>
                  <div className="font-bold text-[var(--fg)] truncate">{order.supplierName}</div>
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)]">{tr ? 'Sipariş Tarihi' : 'Order Date'}</div>
                  <div className="font-semibold text-[var(--fg)]">{order.orderDate}</div>
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)]">{tr ? 'Beklenen Teslimat' : 'Expected Delivery'}</div>
                  <div className="font-semibold text-[var(--fg)]">{order.expectedDate || '—'}</div>
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)]">{tr ? 'Toplam Tutar' : 'Total Amount'}</div>
                  <div className="font-mono font-bold text-[var(--fg)]">
                    {totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {order.lines?.[0]?.currency || 'TRY'}
                  </div>
                </div>
              </div>

              {order.notes && (
                <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 px-3 py-2 text-xs text-[var(--fg)]">
                  <span className="font-semibold text-[var(--fg-muted)] mr-1.5">{tr ? 'Notlar:' : 'Notes:'}</span>
                  {order.notes}
                </div>
              )}

              {/* Order Lines & Receipt Management */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-[var(--fg)]">
                  {tr ? 'Sipariş Satırları ve Mal Kabul' : 'Order Lines & Receiving'} ({order.lines.length})
                </div>

                <div className="space-y-2">
                  {order.lines.map((l) => {
                    const lineTotal = l.quantity * l.unitPrice;
                    const percent = Math.min(100, Math.round((l.receivedQuantity / l.quantity) * 100));
                    return (
                      <div
                        key={l.id}
                        className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3 text-xs">
                          <div>
                            <div className="font-bold text-[var(--fg)]">{l.itemName}</div>
                            <div className="text-[11px] text-[var(--fg-muted)]">
                              {l.itemType === 'Product' ? (tr ? 'Ürün' : 'Product') : (tr ? 'Hammadde' : 'Raw Material')} •{' '}
                              {l.quantity} {tr ? 'adet' : 'units'} x {l.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {l.currency}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-[var(--fg)]">
                              {lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {l.currency}
                            </div>
                            <div className="text-[10.5px] text-[var(--fg-muted)]">
                              {tr ? 'Teslim:' : 'Received:'} {l.receivedQuantity}/{l.quantity} (%{percent})
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                          <div
                            className={`h-full transition-all ${percent >= 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-amber-500' : 'bg-transparent'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        {/* Mal Kabul Alanı (Eğer sipariş Gönderildi veya Kısmen Teslim durumundaysa) */}
                        {(order.status === 'Submitted' || order.status === 'PartiallyReceived') && (
                          <ReceiveRow
                            orderId={order.id}
                            line={l}
                            onReceived={() => {
                              void query.refetch();
                              onChanged();
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-5 py-3 text-xs">
          <div className="flex items-center gap-2">
            {order?.status === 'Draft' && (
              <button
                type="button"
                onClick={() => submit.mutate()}
                disabled={submit.isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 font-bold text-[var(--bg)] hover:opacity-90 transition cursor-pointer disabled:opacity-50"
              >
                <Send size={12} />
                <span>{submit.isPending ? (tr ? 'Gönderiliyor...' : 'Submitting...') : (tr ? 'Siparişi Gönder' : 'Submit Order')}</span>
              </button>
            )}

            {order && (order.status === 'Draft' || order.status === 'Submitted') && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(tr ? 'Siparişi iptal etmek istediğinize emin misiniz?' : 'Are you sure you want to cancel?')) {
                    cancel.mutate();
                  }
                }}
                disabled={cancel.isPending}
                className="inline-flex h-8 items-center gap-1 rounded-[4px] border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 px-3 font-semibold transition cursor-pointer disabled:opacity-50"
              >
                <Ban size={12} />
                <span>{tr ? 'İptal Et' : 'Cancel Order'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            {tr ? 'Kapat' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
