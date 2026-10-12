'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Trash2, Plus } from 'lucide-react';
import { warehouseApi, type WmsKitComponent } from '../../lib/api';
import { useWmsAlert } from '../../stores/wms-alert';

function KitManagementSection() {
  const queryClient = useQueryClient();
  const wmsAlert = useWmsAlert();
  const { data: kits } = useQuery({ queryKey: ['wms-kits'], queryFn: () => warehouseApi.listProductKits() });
  const [kitProductId, setKitProductId] = useState('');
  const [components, setComponents] = useState<WmsKitComponent[]>([{ componentProductId: 0, quantity: 1 }]);

  const createKit = useMutation({
    mutationFn: () => warehouseApi.createProductKit({
      kitProductId: Number(kitProductId),
      components: components.filter((c) => c.componentProductId > 0 && c.quantity > 0),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-kits'] });
      setKitProductId('');
      setComponents([{ componentProductId: 0, quantity: 1 }]);
      wmsAlert.show('Kit tanımlandı.', 'success');
    },
    onError: () => wmsAlert.show('Kit oluşturulamadı — bu ürün için zaten bir tanım olabilir.'),
  });

  const deleteKit = useMutation({
    mutationFn: (id: number) => warehouseApi.deleteProductKit(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wms-kits'] }),
  });

  function updateComponent(index: number, field: keyof WmsKitComponent, value: number) {
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  const canSubmit = kitProductId.trim() !== '' && components.some((c) => c.componentProductId > 0 && c.quantity > 0);

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs space-y-3">
      <div className="flex items-center gap-2 font-bold text-xs text-[var(--fg)]">
        <Boxes size={14} className="text-[var(--fg-muted)]" />
        <span>Ürün Kit & Set Tanımları</span>
      </div>

      <div className="divide-y divide-[var(--border-soft)]">
        {kits?.map((k) => (
          <div key={k.id} className="py-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--fg)]">
              Ürün #{k.kitProductId} — {k.components.map((c) => `${c.quantity}x #${c.componentProductId}`).join(' + ')}
            </span>
            <button
              type="button"
              onClick={() => deleteKit.mutate(k.id)}
              className="h-6 w-6 flex items-center justify-center text-[var(--fg-muted)] hover:text-rose-500 transition cursor-pointer"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-[var(--border-soft)] space-y-2">
        <span className="font-semibold text-xs text-[var(--fg)] block">Yeni Kit Tanımla</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={kitProductId}
            onChange={(e) => setKitProductId(e.target.value)}
            placeholder="Ana Ürün ID"
            className="h-8 w-32 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
          />
          <button
            type="button"
            onClick={() => setComponents((p) => [...p, { componentProductId: 0, quantity: 1 }])}
            className="h-8 px-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer flex items-center gap-1"
          >
            <Plus size={12} /> Parça Ekle
          </button>
        </div>

        {components.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="number"
              value={c.componentProductId || ''}
              onChange={(e) => updateComponent(i, 'componentProductId', Number(e.target.value))}
              placeholder="Bileşen Ürün ID"
              className="h-8 w-32 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
            <input
              type="number"
              value={c.quantity}
              onChange={(e) => updateComponent(i, 'quantity', Number(e.target.value))}
              placeholder="Adet"
              className="h-8 w-20 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>
        ))}

        <button
          type="button"
          onClick={() => createKit.mutate()}
          disabled={!canSubmit || createKit.isPending}
          className="h-8 px-4 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
        >
          {createKit.isPending ? 'Kaydediliyor...' : 'Kiti Kaydet'}
        </button>
      </div>
    </div>
  );
}

export function ManagementTab({ warehouseId }: { warehouseId: number }) {
  const { data: slotting } = useQuery({
    queryKey: ['wms-slotting', warehouseId],
    queryFn: () => warehouseApi.getSlottingSuggestions(warehouseId),
  });

  const { data: kpis } = useQuery({
    queryKey: ['wms-kpi', warehouseId],
    queryFn: () => warehouseApi.getKpiOverview(warehouseId),
  });

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs overflow-y-auto max-w-4xl">
      <div>
        <h2 className="text-sm font-bold text-[var(--fg)]">Depo Yönetimi & Optimizasyon</h2>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Kit ürün tanımları, ABC raf optimizasyonu (Slotting) ve toplama KPI göstergeleri.
        </p>
      </div>

      {/* KPI Overview */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
            <span className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold">Tamamlanan Toplama Görevi</span>
            <div className="text-xl font-bold text-[var(--fg)] my-1">{kpis.completedTaskCount}</div>
            <div className="text-[10px] text-[var(--fg-muted)]">Son dönem tamamlanan görevler</div>
          </div>
          <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
            <span className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold">Ortalama Toplama Süresi</span>
            <div className="text-xl font-bold text-[var(--fg)] my-1">
              {kpis.avgPickingDurationMinutes != null ? `${kpis.avgPickingDurationMinutes.toFixed(1)} dk` : '—'}
            </div>
            <div className="text-[10px] text-[var(--fg-muted)]">Görev başına ortalama süre</div>
          </div>
        </div>
      )}

      <KitManagementSection />

      {/* Slotting Suggestions (ABC Analysis) */}
      <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col">
        <div className="p-3 bg-[var(--bg-subtle)]/40 border-b border-[var(--border-soft)] font-bold text-xs text-[var(--fg)] flex items-center justify-between">
          <span>ABC Raf Yerleşim Önerileri (Slotting)</span>
          <span className="text-[11px] text-[var(--fg-muted)]">
            Toplam {slotting?.totalSuggestions ?? 0} öneri
          </span>
        </div>
        <div className="divide-y divide-[var(--border-soft)] max-h-80 overflow-y-auto">
          {(!slotting?.suggestions || slotting.suggestions.length === 0) && (
            <div className="p-6 text-center text-xs text-[var(--fg-muted)]">
              Şu anda taşınması önerilen ürün bulunmuyor.
            </div>
          )}
          {slotting?.suggestions.map((s) => (
            <div key={`${s.productId}-${s.locationId}`} className="p-3 flex items-center justify-between gap-2 hover:bg-[var(--bg-subtle)]/30 transition text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-[2px] font-bold ${
                    s.abcClass === 'A' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                  }`}>
                    {s.abcClass} Grubu
                  </span>
                  <span className="font-bold text-[var(--fg)]">{s.productName}</span>
                </div>
                <div className="text-[11px] text-[var(--fg-muted)] mt-0.5">
                  Mevcut Konum: {s.locationFullCode} (Mesafe: {s.distance.toFixed(1)}m) — Satış: {s.quantitySold} adet
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
