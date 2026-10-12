'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Layers, RefreshCw, X } from 'lucide-react';
import {
  vehicleFitmentsApi, type FitmentSource, type VehicleFitmentFilter, type VehicleFitmentPendingDto,
} from '../../lib/api/vehicle-fitments';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';

const PAGE_SIZE = 50;

const SOURCE_LABELS: Record<FitmentSource, string> = {
  TitleParse: 'Ürün adı',
  Fitment: 'Tedarikçi listesi',
  Manual: 'Elle',
};

const INPUT_CLASS = 'h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--fg)]';
const BUTTON_CLASS = 'inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] px-3 text-xs hover:bg-[var(--bg-subtle)] disabled:opacity-40';

const years = (r: VehicleFitmentPendingDto) =>
  r.yearFrom == null ? '' : `${r.yearFrom}–${r.yearTo ?? ''}`;

const vehicleLabel = (r: VehicleFitmentPendingDto) =>
  [r.make, r.model, r.generation, years(r)].filter(Boolean).join(' ');

// Uyumluluk v2 onay kuyruğu (kuşak düzeyi; ERP ürünü + site kalemi). Otomatik onay eşiğinin altındaki
// adaylar burada bekler; onay/ret elle karardır ve sonraki doldurma turları onu ezmez.
export function VehicleFitmentQueue() {
  const [filter, setFilter] = useState<VehicleFitmentFilter>({});
  const [rows, setRows] = useState<VehicleFitmentPendingDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useFeedback();

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await vehicleFitmentsApi.pending(filter, page * PAGE_SIZE, PAGE_SIZE);
      setRows(result.items);
      setTotal(result.total);
      setSelected(new Set());
    } catch (e) {
      setError(describeError(e));
    }
  }, [filter, page]);

  useEffect(() => { void load(); }, [load]);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    try {
      notify.success(await action());
      await load();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const review = (approve: boolean) => run(async () => {
    const { changed } = await vehicleFitmentsApi.review([...selected], approve);
    return `${changed} satır ${approve ? 'onaylandı' : 'reddedildi'}.`;
  });

  const populate = () => run(async () => {
    await vehicleFitmentsApi.populate();
    return 'Doldurma turu kuyruğa alındı; birkaç dakika içinde kuyruk güncellenir.';
  });

  const updateFilter = (patch: VehicleFitmentFilter) => { setFilter((f) => ({ ...f, ...patch })); setPage(0); };

  const toggle = (id: number) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="flex w-full flex-col gap-4 border-t border-[var(--border-soft)] p-4 text-xs sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Kuşak Uyumluluğu (v2) — onay kuyruğu</h2>
          </div>
          <p className="mt-0.5 max-w-2xl text-[11px] text-[var(--fg-muted)]">
            Ürün ve site kalemleri araç kuşağına (ör. Passat B8, Golf 7.5) bağlanır. Güveni yüksek olanlar kendiliğinden
            onaylanır; buradakiler emin olunamayan adaylardır. Toplam {total} bekleyen.
          </p>
        </div>
        <button type="button" onClick={() => void populate()} disabled={busy} className={`${BUTTON_CLASS} text-[var(--fg)]`}>
          <RefreshCw size={13} /> Yeniden doldur
        </button>
      </div>

      {error && <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <input className={INPUT_CLASS} placeholder="Marka" value={filter.make ?? ''}
          onChange={(e) => updateFilter({ make: e.target.value || undefined })} />
        <input className={INPUT_CLASS} placeholder="Model" value={filter.model ?? ''}
          onChange={(e) => updateFilter({ model: e.target.value || undefined })} />
        <select className={INPUT_CLASS} value={filter.source ?? ''}
          onChange={(e) => updateFilter({ source: (e.target.value || undefined) as FitmentSource | undefined })}>
          <option value="">Tüm kaynaklar</option>
          {Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <div className="flex-1" />
        <button type="button" onClick={() => void review(false)} disabled={busy || selected.size === 0}
          className={`${BUTTON_CLASS} text-rose-600 hover:bg-rose-500/10`}>
          <X size={13} /> Seçilenleri reddet
        </button>
        <button type="button" onClick={() => void review(true)} disabled={busy || selected.size === 0}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] hover:opacity-90 disabled:opacity-40">
          <Check size={13} /> Seçilenleri onayla ({selected.size})
        </button>
      </div>

      <div className="divide-y divide-[var(--border-soft)] overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)]">
        {rows.length === 0 && <div className="p-6 text-center text-[var(--fg-muted)]">Onay bekleyen satır yok.</div>}
        {rows.map((r) => (
          <label key={r.id} className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-[var(--bg-subtle)]/40">
            <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[var(--fg)]">{r.productName || `#${r.refId}`}</span>
              <span className="text-[11px] text-[var(--fg-muted)]">
                → {vehicleLabel(r)} · {SOURCE_LABELS[r.source]} · {r.refType === 'SiteCatalogItem' ? 'Site' : 'ERP'}
              </span>
            </div>
            <span className="shrink-0 font-mono text-[11px] text-[var(--fg-muted)]">{r.confidence.toFixed(2)}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}
          className="h-7 rounded-[4px] border border-[var(--border)] px-2.5 disabled:opacity-40">Önceki</button>
        <span className="text-[var(--fg-muted)]">Sayfa {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
        <button type="button" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}
          className="h-7 rounded-[4px] border border-[var(--border)] px-2.5 disabled:opacity-40">Sonraki</button>
      </div>
    </div>
  );
}
