'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, Package } from 'lucide-react';
import {
  shippingApi,
  type ShipmentStatus,
} from '../../lib/api/shipping';
import {
  SHIPMENT_STATUS_META, ShipmentStatusBadge,
} from './shared';
import { ShipmentDetailPanel } from './ShipmentDetailPanel';
import { ShipmentFormDialog } from './ShipmentFormDialog';
import { TrackingLookup } from './TrackingLookup';
import { useFeedback } from '../shared/Feedback';
import { useShipmentPrefill } from '../../stores/shipment-prefill';
import { FilterSelect } from '../../components/ui/FilterSelect';

const PAGE_SIZE = 25;

const STATUS_OPTIONS = Object.entries(SHIPMENT_STATUS_META)
  .map(([value, meta]) => ({ value: String(value), label: meta.label }));

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function ShipmentsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [carrierId, setCarrierId] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const [{ prefill: initialPrefill }] = useState(() => ({ prefill: useShipmentPrefill.getState().prefill }));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(initialPrefill !== null);
  const [dialogInitial, setDialogInitial] = useState<{ orderNumber: string; weightKg: string; desi: string } | undefined>(() => initialPrefill ? ({
    orderNumber: initialPrefill.orderNumber ?? '',
    weightKg: initialPrefill.weightKg ? String(initialPrefill.weightKg) : '',
    desi: initialPrefill.desi ? String(initialPrefill.desi) : '',
  }) : undefined);
  const { notify } = useFeedback();

  useEffect(() => {
    if (initialPrefill) useShipmentPrefill.setState({ prefill: null });
  }, [initialPrefill]);

  const shipmentParams = {
    page,
    pageSize: PAGE_SIZE,
    search: search.trim() || undefined,
    carrierId: carrierId === '' ? undefined : Number(carrierId),
    status: status === '' ? undefined : Number(status) as ShipmentStatus,
  };

  const shipmentsQuery = useQuery({
    queryKey: ['shipping', 'shipments', shipmentParams],
    queryFn: () => shippingApi.getShipments(shipmentParams),
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  });

  const carriersQuery = useQuery({
    queryKey: ['shipping', 'carriers'],
    queryFn: shippingApi.getCarriers,
    staleTime: 60_000,
  });

  const items = shipmentsQuery.data?.items ?? [];
  const totalCount = shipmentsQuery.data?.totalCount ?? 0;
  const carriers = carriersQuery.data ?? [];
  const loading = shipmentsQuery.isLoading;
  const error = shipmentsQuery.error instanceof Error ? shipmentsQuery.error.message : null;

  const resetAndSet = <T,>(setter: (v: T) => void) => (value: T) => {
    setPage(1);
    setter(value);
  };

  const hasFilter = search !== '' || carrierId !== '' || status !== '';
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const carrierOptions = [
    { value: '', label: 'Tüm Taşıyıcılar' },
    ...carriers.map((c) => ({ value: String(c.id), label: c.displayName })),
  ];

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden text-xs">
      {/* Shipments List & Actions (Left) */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-r border-[var(--border-soft)]">
        {/* Header & Filter Controls */}
        <div className="p-4 sm:p-5 pb-3 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 flex flex-col gap-3 shrink-0">
          <div data-tour="shipping-shipments-header" className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-[var(--fg-muted)]" />
              <h2 className="text-sm font-bold text-[var(--fg)]">Kargo Gönderileri</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[var(--fg-muted)]">
                Toplam {totalCount} gönderi
              </span>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex h-7.5 items-center gap-1 rounded-[4px] bg-[var(--fg)] px-2.5 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
              >
                <Plus size={13} />
                <span>Yeni Gönderi</span>
              </button>
            </div>
          </div>

          <div data-tour="shipping-shipments-lookup">
            <TrackingLookup carriers={carriers} />
          </div>

          <div data-tour="shipping-shipments-filters" className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                value={search}
                onChange={(e) => resetAndSet(setSearch)(e.target.value)}
                placeholder="Takip no, sipariş no veya alıcı adı ara..."
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div className="w-40">
              <FilterSelect
                value={carrierId}
                onChange={(v) => resetAndSet(setCarrierId)(v)}
                placeholder="Taşıyıcı Seç"
                height="h-8"
                options={carrierOptions}
              />
            </div>

            <div className="w-36">
              <FilterSelect
                value={status}
                onChange={(v) => resetAndSet(setStatus)(v)}
                placeholder="Tüm Durumlar"
                height="h-8"
                options={[{ value: '', label: 'Tüm Durumlar' }, ...STATUS_OPTIONS]}
              />
            </div>

            {hasFilter && (
              <button
                type="button"
                onClick={() => { setPage(1); setSearch(''); setCarrierId(''); setStatus(''); }}
                className="h-8 px-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer flex items-center gap-1"
                title="Filtreleri Temizle"
              >
                <X size={12} />
                <span>Temizle</span>
              </button>
            )}
          </div>
        </div>

        {/* Shipments List */}
        <div data-tour="shipping-shipments-list" className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {error && <div className="p-3 rounded-[4px] bg-rose-500/10 text-rose-500">{error}</div>}
          {loading && items.length === 0 && (
            <div className="py-12 text-center text-xs text-[var(--fg-muted)]">Gönderiler yükleniyor...</div>
          )}
          {!loading && items.length === 0 && (
            <div className="py-12 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-[4px]">
              {hasFilter ? 'Bu filtreye uygun gönderi bulunamadı.' : 'Henüz kargo gönderisi oluşturulmadı.'}
            </div>
          )}

          {items.map((s) => {
            const active = s.id === selectedId;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`p-3 rounded-[4px] border cursor-pointer transition flex flex-col gap-1.5 ${
                  active
                    ? 'border-[var(--fg)] bg-[var(--bg-subtle)] shadow-xs'
                    : 'border-[var(--border-soft)] bg-[var(--card)] hover:border-[var(--border)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[var(--fg)]">
                      {s.carrierName ?? 'Taşıyıcı Yok'}
                    </span>
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[2px] bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--fg)]">
                      {s.trackingNumber ?? 'Takip No Yok'}
                    </span>
                    <ShipmentStatusBadge status={s.status} />
                  </div>

                  <span className="text-[10.5px] text-[var(--fg-muted)]">
                    {formatDate(s.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-[var(--fg-muted)] flex-wrap">
                  {s.orderNumber && <span>Sipariş: #{s.orderNumber}</span>}
                  {s.recipientName && <span>Alıcı: {s.recipientName}</span>}
                  {s.recipientCity && <span>Şehir: {s.recipientCity}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 px-5 border-t border-[var(--border-soft)] bg-[var(--card)] flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[var(--fg-muted)]">
              Sayfa {page} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 px-2.5 rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 cursor-pointer"
              >
                Önceki
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 px-2.5 rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 cursor-pointer"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Side Shipment Detail Drawer (Right) */}
      {selectedId !== null && (
        <ShipmentDetailPanel
          shipmentId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            queryClient.invalidateQueries({ queryKey: ['shipping', 'shipments'] });
          }}
        />
      )}

      {dialogOpen && (
        <ShipmentFormDialog
          initial={dialogInitial}
          carriers={carriers}
          onClose={() => {
            setDialogOpen(false);
            setDialogInitial(undefined);
          }}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['shipping', 'shipments'] });
            setDialogOpen(false);
            setDialogInitial(undefined);
            notify.success('Gönderi kaydedildi.');
          }}
        />
      )}
    </div>
  );
}
