'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Plug, Truck, Star, FlaskConical } from 'lucide-react';
import { shippingApi, type CarrierDto } from '../../lib/api/shipping';
import {
  CARRIER_TYPE_META, StatusDot,
} from './shared';
import { CarrierFormDialog } from './CarrierFormDialog';
import { useFeedback } from '../shared/Feedback';

export function CarriersTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CarrierDto | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const { notify, confirm } = useFeedback();

  const carriersQuery = useQuery({
    queryKey: ['shipping', 'carriers'],
    queryFn: shippingApi.getCarriers,
    staleTime: 60_000,
  });
  const carriers = carriersQuery.data ?? [];
  const loading = carriersQuery.isLoading;
  const error = carriersQuery.error instanceof Error ? carriersQuery.error.message : null;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['shipping', 'carriers'] });

  const handleDelete = async (carrier: CarrierDto) => {
    const ok = await confirm({
      title: `"${carrier.displayName}" taşıyıcısı silinsin mi?`,
      body: 'Bu hesap üzerinden yeni gönderi açılamaz ve mevcut gönderilerin takibi durur.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;

    try {
      await shippingApi.deleteCarrier(carrier.id);
      notify.success('Taşıyıcı silindi.');
      await refresh();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Taşıyıcı silinemedi.');
    }
  };

  const handleCheck = async (carrier: CarrierDto) => {
    setCheckingId(carrier.id);
    try {
      const result = await shippingApi.checkHealth(carrier.id);
      if (result.error) notify.error(`${carrier.displayName}: ${result.error}`);
      else notify.success(`${carrier.displayName} bağlantısı çalışıyor.`);
      await refresh();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Bağlantı test edilemedi.');
    } finally {
      setCheckingId(null);
    }
  };

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (carrier: CarrierDto) => { setEditing(carrier); setDialogOpen(true); };

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      {/* Header & Add Action */}
      <div data-tour="shipping-carriers-header" className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Kargo Taşıyıcı Hesapları</h2>
          </div>
          <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
            Sistemde kayıtlı kargo firması entegrasyonları ve API hesapları.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
        >
          <Plus size={13} />
          <span>Yeni Taşıyıcı Ekle</span>
        </button>
      </div>

      {error && <div className="p-3 rounded-[4px] bg-rose-500/10 text-rose-500">{error}</div>}

      {/* Carriers Cards Grid */}
      <div data-tour="shipping-carriers-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading && <div className="col-span-full py-8 text-center text-xs text-[var(--fg-muted)]">Taşıyıcılar yükleniyor...</div>}
        {!loading && carriers.length === 0 && (
          <div className="col-span-full p-8 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-[4px]">
            Henüz eklenmiş bir kargo taşıyıcısı bulunmuyor.
          </div>
        )}

        {carriers.map((carrier) => {
          const typeMeta = CARRIER_TYPE_META[carrier.type];
          return (
            <div
              key={carrier.id}
              className={`rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col justify-between gap-3 ${
                carrier.isActive ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[var(--fg)]">{carrier.displayName}</span>
                      {carrier.isDefault && (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[9.5px] px-1 py-0.2 rounded-[2px] bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          <Star size={9} /> Varsayılan
                        </span>
                      )}
                      {carrier.isTestMode && (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[9.5px] px-1 py-0.2 rounded-[2px] bg-[var(--bg-subtle)] text-[var(--fg-muted)] border border-[var(--border)]">
                          <FlaskConical size={9} /> Test
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] text-[var(--fg-muted)] font-mono mt-0.5">
                      {typeMeta.label}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleCheck(carrier)}
                      disabled={checkingId === carrier.id}
                      className="h-6.5 w-6.5 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40"
                      title="Bağlantıyı Test Et"
                    >
                      <Plug size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(carrier)}
                      className="h-6.5 w-6.5 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                      title="Düzenle"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(carrier)}
                      className="h-6.5 w-6.5 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[var(--border-soft)] pt-2 text-[10.5px] font-mono text-[var(--fg-muted)]">
                  <StatusDot status={carrier.status} />
                  <span>Son kontrol: {carrier.lastCheckedAt ? new Date(carrier.lastCheckedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {dialogOpen && (
        <CarrierFormDialog
          carrier={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={async () => {
            notify.success(editing ? 'Taşıyıcı güncellendi.' : 'Taşıyıcı eklendi.');
            await refresh();
          }}
        />
      )}
    </div>
  );
}
