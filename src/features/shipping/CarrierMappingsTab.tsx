'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Link2 } from 'lucide-react';
import { shippingApi } from '../../lib/api/shipping';
import { useFeedback } from '../shared/Feedback';
import { FilterSelect } from '../../components/ui/FilterSelect';

const COUNTRY_LABELS: Record<string, string> = { TR: 'Türkiye', UK: 'İngiltere' };

export function CarrierMappingsTab() {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<number | null>(null);
  const { notify, confirm } = useFeedback();

  const mappingsQuery = useQuery({
    queryKey: ['shipping', 'carrier-mappings'],
    queryFn: shippingApi.getCarrierMappings,
    staleTime: 30_000,
  });
  const carriersQuery = useQuery({
    queryKey: ['shipping', 'carriers'],
    queryFn: shippingApi.getCarriers,
    staleTime: 60_000,
  });
  const rows = mappingsQuery.data ?? [];
  const carriers = carriersQuery.data ?? [];
  const loading = mappingsQuery.isLoading || carriersQuery.isLoading;
  const queryError = mappingsQuery.error ?? carriersQuery.error;
  const error = queryError instanceof Error ? queryError.message : null;
  const refreshMappings = () => queryClient.invalidateQueries({ queryKey: ['shipping', 'carrier-mappings'] });

  async function assign(sourceId: number, carrierId: number) {
    setSavingId(sourceId);
    try {
      await shippingApi.setCarrierMapping(sourceId, carrierId);
      notify.success('Eşleştirme kaydedildi.');
      await refreshMappings();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSavingId(null);
    }
  }

  async function assignAll(country: string, carrierId: number) {
    const carrier = carriers.find((c) => c.id === carrierId);
    const label = COUNTRY_LABELS[country] ?? country;

    const ok = await confirm({
      title: `${label} kaynaklarının tümü "${carrier?.displayName}" taşıyıcısına bağlansın mı?`,
      body: 'Bu ülkedeki her ERP kaynağının mevcut taşıyıcı seçimi bu taşıyıcıyla değiştirilir.',
      confirmLabel: 'Hepsini Bağla',
    });
    if (!ok) return;

    try {
      await shippingApi.assignAllCarriers(carrierId, country);
      notify.success(`${label} kaynakları bağlandı.`);
      await refreshMappings();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Toplu atama başarısız.');
    }
  }

  const carrierOptions = [
    { value: '', label: 'Taşıyıcı Seçilmedi' },
    ...carriers.map((c) => ({ value: String(c.id), label: c.displayName })),
  ];

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div data-tour="shipping-mappings-header">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">ERP Kaynak & Taşıyıcı Eşleştirmesi</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Her ERP kaynağından gelen siparişlerin varsayılan olarak hangi kargo firmasıyla gönderileceğini belirleyin.
        </p>
      </div>

      {error && <div className="p-3 rounded-[4px] bg-rose-500/10 text-rose-500">{error}</div>}

      {/* Country Batch Helpers */}
      <div data-tour="shipping-mappings-batch" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(COUNTRY_LABELS).map(([countryCode, countryName]) => (
          <div key={countryCode} className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex items-center justify-between gap-3">
            <div>
              <span className="font-bold text-xs text-[var(--fg)]">{countryName} ({countryCode}) Toplu Atama</span>
              <p className="text-[10.5px] text-[var(--fg-muted)] mt-0.5">Bu ülkedeki tüm ERP kaynaklarını tek taşıyıcıya bağla.</p>
            </div>
            <div className="w-40 shrink-0">
              <FilterSelect
                value=""
                onChange={(v) => { if (v) void assignAll(countryCode, Number(v)); }}
                placeholder="Taşıyıcı Seç"
                height="h-7.5"
                options={carrierOptions}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Mappings Table */}
      <div data-tour="shipping-mappings-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="grid grid-cols-12 gap-2 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-3 font-mono text-[10.5px] font-bold text-[var(--fg-muted)] uppercase tracking-wider shrink-0">
          <div className="col-span-3">ERP Kaynağı</div>
          <div className="col-span-2">Ülke</div>
          <div className="col-span-4">Bağlı Kargo Taşıyıcısı</div>
          <div className="col-span-3 text-right">Durum</div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-soft)]">
          {loading && <div className="p-8 text-center text-xs text-[var(--fg-muted)]">Eşleştirmeler yükleniyor...</div>}
          {!loading && rows.length === 0 && (
            <div className="p-8 text-center text-xs text-[var(--fg-muted)]">Tanımlı ERP kaynağı bulunamadı.</div>
          )}

          {rows.map((row) => {
            const isSaving = savingId === row.sourceId;
            return (
              <div key={row.sourceId} className="grid grid-cols-12 gap-2 items-center p-3 hover:bg-[var(--bg-subtle)]/30 transition text-xs">
                <div className="col-span-3 font-bold text-[var(--fg)]">
                  {row.sourceDisplayName}
                </div>

                <div className="col-span-2 font-mono text-[11px] text-[var(--fg-muted)]">
                  {COUNTRY_LABELS[row.country] ?? row.country}
                </div>

                <div className="col-span-4">
                  <FilterSelect
                    value={row.carrierId ? String(row.carrierId) : ''}
                    onChange={(v) => { if (v) void assign(row.sourceId, Number(v)); }}
                    placeholder="Taşıyıcı Seç"
                    height="h-7.5"
                    options={carrierOptions}
                  />
                </div>

                <div className="col-span-3 flex items-center justify-end gap-1.5 font-mono text-[10.5px]">
                  {isSaving ? (
                    <span className="text-[var(--fg-muted)] flex items-center gap-1">
                      <Loader2 size={11} className="animate-spin" /> Kaydediliyor...
                    </span>
                  ) : !row.carrierId ? (
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertTriangle size={11} /> Eşleştirilmedi
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-bold">Aktif</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
