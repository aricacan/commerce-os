'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, RefreshCw, Ban, MapPin } from 'lucide-react';
import {
  shippingApi, SHIPMENT_STATUS,
  type ShipmentDetailDto, type ShipmentStatus,
} from '../../lib/api/shipping';
import {
  ShipmentStatusBadge,
} from './shared';
import { useFeedback } from '../shared/Feedback';

interface Props {
  shipmentId: number;
  onClose: () => void;
  onChanged: () => void;
}

const CANCELLABLE: ShipmentStatus[] = [SHIPMENT_STATUS.Draft, SHIPMENT_STATUS.Created];

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function ShipmentDetailPanel({ shipmentId, onClose, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { notify, confirm } = useFeedback();
  const queryClient = useQueryClient();
  const shipmentQueryKey = ['shipping', 'shipment', shipmentId] as const;

  const { data: detail, isLoading: loading, error: queryError } = useQuery<ShipmentDetailDto>({
    queryKey: shipmentQueryKey,
    queryFn: () => shippingApi.getShipment(shipmentId),
  });
  const error = actionError ?? (queryError instanceof Error ? queryError.message : null);

  const handleTrack = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await shippingApi.trackShipment(shipmentId);
      queryClient.setQueryData(shipmentQueryKey, updated);
      notify.success('Takip bilgisi güncellendi.');
      onChanged();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Takip sorgusu başarısız.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: 'Gönderi iptal edilsin mi?',
      body: 'Taşıyıcıya iptal bildirimi gönderilir ve barkod geçersiz olur.',
      confirmLabel: 'İptal Et',
      danger: true,
    });
    if (!ok) return;

    setBusy(true);
    setActionError(null);
    try {
      const updated = await shippingApi.cancelShipment(shipmentId);
      queryClient.setQueryData(shipmentQueryKey, updated);
      notify.success('Gönderi iptal edildi.');
      onChanged();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'İptal edilemedi.');
    } finally {
      setBusy(false);
    }
  };

  const summary = detail?.summary;
  const canCancel = summary && CANCELLABLE.includes(summary.status);

  return (
    <aside className="w-96 shrink-0 flex flex-col h-full bg-[var(--card)] border-l border-[var(--border-soft)] text-xs">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 px-4 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 shrink-0">
        <span className="font-bold text-xs text-[var(--fg)]">Gönderi Detayı #{shipmentId}</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && <div className="py-8 text-center text-xs text-[var(--fg-muted)]">Detaylar yükleniyor...</div>}
        {error && <div className="p-3 rounded-[4px] bg-rose-500/10 text-rose-500">{error}</div>}

        {detail && summary && (
          <>
            {/* Tracking Summary Card */}
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[var(--fg)]">{summary.carrierName ?? 'Taşıyıcı Belirtilmedi'}</span>
                <ShipmentStatusBadge status={summary.status} />
              </div>

              <div className="font-mono text-xs font-bold text-[var(--fg)]">
                {summary.trackingNumber ?? 'Takip No Henüz Üretilmedi'}
              </div>

              <div className="space-y-1 text-[11px] text-[var(--fg-muted)] font-mono pt-1 border-t border-[var(--border-soft)]">
                <div>Oluşturulma: {formatDateTime(summary.createdAt)}</div>
                {summary.deliveredAt && <div>Teslim Tarihi: {formatDateTime(summary.deliveredAt)}</div>}
              </div>
            </div>

            {/* Recipient Information */}
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--fg)]">
                <MapPin size={13} className="text-[var(--fg-muted)]" />
                <span>Alıcı Bilgileri</span>
              </div>
              <div className="space-y-1 text-[11px] text-[var(--fg-muted)]">
                <div className="font-semibold text-[var(--fg)]">{summary.recipientName}</div>
                <div>{detail.recipientAddress}</div>
                <div>{detail.recipientTown ? `${detail.recipientTown} / ` : ''}{summary.recipientCity}</div>
                {detail.recipientPhone && <div className="font-mono">{detail.recipientPhone}</div>}
              </div>
            </div>

            {/* Package Specifications */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg)]">
                <span className="text-[10px] font-semibold text-[var(--fg-muted)] uppercase">Desi</span>
                <div className="font-mono font-bold text-sm text-[var(--fg)] mt-0.5">{detail.desi ?? '—'}</div>
              </div>
              <div className="p-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg)]">
                <span className="text-[10px] font-semibold text-[var(--fg-muted)] uppercase">Ağırlık</span>
                <div className="font-mono font-bold text-sm text-[var(--fg)] mt-0.5">{detail.weightKg ? `${detail.weightKg} kg` : '—'}</div>
              </div>
            </div>

            {/* Tracking Events Timeline */}
            {detail.events && detail.events.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[var(--border-soft)]">
                <span className="block font-bold text-xs text-[var(--fg)]">Kargo Hareket Geçmişi</span>
                <div className="space-y-2">
                  {detail.events.map((ev, i) => (
                    <div key={i} className="p-2 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg)] text-[11px] flex flex-col gap-0.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--fg-muted)]">
                        <span>{ev.location ?? 'Transfer Merkezi'}</span>
                        <span>{formatDateTime(ev.occurredAt)}</span>
                      </div>
                      <div className="font-medium text-[var(--fg)]">{ev.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      {detail && summary && (
        <div className="p-3 px-4 border-t border-[var(--border-soft)] bg-[var(--card)] flex items-center justify-end gap-2 shrink-0">
          {canCancel && (
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={busy}
              className="inline-flex h-8 items-center gap-1 rounded-[4px] border border-[var(--border)] text-xs text-rose-500 hover:bg-rose-500/10 px-3 transition cursor-pointer disabled:opacity-40"
            >
              <Ban size={12} />
              <span>İptal Et</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleTrack()}
            disabled={busy || !summary.trackingNumber}
            className="inline-flex h-8 items-center gap-1 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] px-3 shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
          >
            <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />
            <span>{busy ? 'Sorgulanıyor...' : 'Takip Sorgula'}</span>
          </button>
        </div>
      )}
    </aside>
  );
}
