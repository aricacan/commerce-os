'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Truck, ChevronDown, X, Trash2, Plus } from 'lucide-react';
import { forecastApi } from '../../lib/api/forecast';

/**
 * C5 — kiracının kendi girdiği ülke bazlı tedarik süresi (ör. TR→TR 1-2 saat,
 * TR→UK 10-15 gün). Yeniden sipariş noktası bu değerlere göre hesaplanır —
 * hiçbir varsayılan değer İCAT EDİLMEZ, kiracı girmezse SkuForecastPanel'de
 * "yeniden sipariş noktası" alanı gösterilmez (bkz. SkuForecastService.WithReorderPointAsync).
 */
export function LeadTimeSettingsPanel() {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState('');
  const [minHours, setMinHours] = useState('');
  const [maxHours, setMaxHours] = useState('');
  const qc = useQueryClient();

  const { data: leadTimes } = useQuery({
    queryKey: ['sellingview-lead-times'],
    queryFn: () => forecastApi.leadTimes.list(),
    enabled: open,
  });

  const upsert = useMutation({
    mutationFn: forecastApi.leadTimes.upsert,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sellingview-lead-times'] });
      setCountry('');
      setMinHours('');
      setMaxHours('');
    },
  });

  const remove = useMutation({
    mutationFn: forecastApi.leadTimes.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sellingview-lead-times'] }),
  });

  const canSubmit =
    country.trim().length === 2 &&
    minHours !== '' &&
    maxHours !== '' &&
    Number(minHours) >= 0 &&
    Number(maxHours) >= Number(minHours);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-ui-xs font-semibold rounded-[4px] border border-border-soft bg-bg-subtle hover:bg-bg-subtle text-fg transition-colors cursor-pointer"
      >
        <Truck size={12} />
        <span>Tedarik Süresi</span>
        <ChevronDown size={12} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-30 w-[300px] rounded-[6px] border border-border-soft bg-card shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-2.5 py-2 border-b border-border-soft">
            <span className="text-ui-xs font-bold text-fg">Ülke Bazlı Tedarik Süresi</span>
            <button type="button" onClick={() => setOpen(false)} className="text-fg-subtle hover:text-fg cursor-pointer">
              <X size={13} />
            </button>
          </div>

          <div className="p-2.5 flex flex-col gap-2">
            {leadTimes?.length === 0 && (
              <div className="text-ui-xs text-fg-subtle">Henüz tedarik süresi girilmedi.</div>
            )}
            {leadTimes?.map((lt) => (
              <div key={lt.country} className="flex items-center justify-between gap-2 text-ui-xs">
                <span className="font-semibold text-fg">{lt.country}</span>
                <span className="text-fg-muted">
                  {lt.minHours}–{lt.maxHours} saat
                </span>
                <button
                  type="button"
                  onClick={() => remove.mutate(lt.country)}
                  className="text-fg-subtle hover:text-danger cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            <div className="pt-2 mt-1 border-t border-border-soft flex items-center gap-1.5">
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="TR"
                maxLength={2}
                className="w-11 text-ui-xs px-1.5 py-1 rounded-[4px] border border-border-soft bg-transparent outline-none text-fg"
              />
              <input
                type="number"
                min={0}
                value={minHours}
                onChange={(e) => setMinHours(e.target.value)}
                placeholder="min saat"
                className="w-16 text-ui-xs px-1.5 py-1 rounded-[4px] border border-border-soft bg-transparent outline-none text-fg"
              />
              <input
                type="number"
                min={0}
                value={maxHours}
                onChange={(e) => setMaxHours(e.target.value)}
                placeholder="max saat"
                className="w-16 text-ui-xs px-1.5 py-1 rounded-[4px] border border-border-soft bg-transparent outline-none text-fg"
              />
              <button
                type="button"
                disabled={!canSubmit || upsert.isPending}
                onClick={() =>
                  upsert.mutate({ country, minHours: Number(minHours), maxHours: Number(maxHours) })
                }
                className="ml-auto p-1.5 rounded-[4px] bg-fg text-bg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <Plus size={12} />
              </button>
            </div>
            {upsert.isError && (
              <div className="text-ui-xs text-danger">{(upsert.error as Error)?.message ?? 'Kaydedilemedi.'}</div>
            )}
            <div className="text-ui-2xs text-fg-subtle">Örn. TR→TR 1-2 saat, TR→UK 240-360 saat (10-15 gün).</div>
          </div>
        </div>
      )}
    </div>
  );
}
