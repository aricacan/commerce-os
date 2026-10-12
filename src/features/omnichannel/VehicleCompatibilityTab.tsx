'use client';

import { useCallback, useEffect, useState } from 'react';
import { Car, Check, RefreshCw, X } from 'lucide-react';
import {
  vehicleCompatibilityApi, type CompatibilityCoverageDto, type PendingCompatibilityDto,
} from '../../lib/api/vehicle-compatibility';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';

const PAGE_SIZE = 50;
// Ürünün ModelYear alanından türetilen satırlar (marka+model+yıl üçü de ürünün kendi verisi).
const HIGH_CONFIDENCE = 0.9;

const keyOf = (row: PendingCompatibilityDto) => `${row.productId}:${row.vehicleModelId}`;

export function VehicleCompatibilityTab() {
  const [coverage, setCoverage] = useState<CompatibilityCoverageDto[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [rows, setRows] = useState<PendingCompatibilityDto[]>([]);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notify, confirm } = useFeedback();

  const load = useCallback(async () => {
    setError(null);
    try {
      const [cov, pending] = await Promise.all([
        vehicleCompatibilityApi.coverage(),
        vehicleCompatibilityApi.pending(country, page * PAGE_SIZE, PAGE_SIZE),
      ]);
      setCoverage(cov);
      setRows(pending);
      setSelected(new Set());
    } catch (e) {
      setError(describeError(e));
    }
  }, [country, page]);

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
    const items = rows.filter((r) => selected.has(keyOf(r)))
      .map((r) => ({ productId: r.productId, vehicleModelId: r.vehicleModelId }));
    const { changed } = await vehicleCompatibilityApi.review(items, approve);
    return `${changed} satır ${approve ? 'onaylandı' : 'reddedildi'}.`;
  });

  const approveHighConfidence = async () => {
    const ok = await confirm({
      title: `Güveni ${HIGH_CONFIDENCE} ve üstü olan bekleyen satırların tümü onaylansın mı?`,
      body: `${country ?? 'Tüm ülkeler'} — bunlar ürünün kendi marka/model/yıl alanlarından türetilmiş satırlardır. Onaylanınca bot bu araçlar için kesin "uyar" cevabı verir.`,
      confirmLabel: 'Toplu onayla',
    });
    if (!ok) return;
    await run(async () => {
      const { changed } = await vehicleCompatibilityApi.approveByConfidence(HIGH_CONFIDENCE, country);
      return `${changed} satır onaylandı.`;
    });
  };

  const populate = () => run(async () => {
    await vehicleCompatibilityApi.populate();
    return 'Doldurma turu kuyruğa alındı; birkaç dakika içinde sayılar güncellenir.';
  });

  const toggle = (row: PendingCompatibilityDto) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(keyOf(row))) next.delete(keyOf(row)); else next.add(keyOf(row));
    return next;
  });

  return (
    <div className="flex w-full flex-1 flex-col gap-4 p-4 text-xs sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Car size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Araç Uyumluluğu</h2>
          </div>
          <p className="mt-0.5 max-w-2xl text-[11px] text-[var(--fg-muted)]">
            Bot &quot;aracıma uyar mı?&quot; sorusuna yalnız onaylı satırlardan kesin cevap verir. Onay bekleyenler ürün
            adından türetilmiş adaylardır; onaylanana kadar bot bu araçlar için temsilciye sorar.
          </p>
        </div>
        <button type="button" onClick={() => void populate()} disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] px-3 text-xs text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-40">
          <RefreshCw size={13} /> Yeniden doldur
        </button>
      </div>

      {error && <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {coverage.map((c) => (
          <button key={c.country} type="button"
            onClick={() => { setCountry(country === c.country ? null : c.country); setPage(0); }}
            className={`flex flex-col gap-1 rounded-[4px] border p-3 text-left shadow-xs transition ${
              country === c.country ? 'border-[var(--fg)] bg-[var(--bg-subtle)]' : 'border-[var(--border-soft)] bg-[var(--card)]'
            }`}>
            <span className="text-[11px] font-semibold uppercase text-[var(--fg-muted)]">{c.country}</span>
            <span className="text-lg font-bold text-[var(--fg)]">%{c.approvedPercent.toLocaleString('tr-TR')}</span>
            <span className="text-[11px] text-[var(--fg-muted)]">
              {c.withApproved}/{c.vehicleProducts} ürün onaylı · {c.withPendingOnly} yalnız bekleyen · {c.withoutAny} hiç yok
            </span>
            <span className="text-[11px] text-[var(--fg-muted)]">{c.pendingRows} bekleyen satır</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-[var(--fg)]">Onay kuyruğu {country ? `(${country})` : '(tümü)'}</span>
        <div className="flex-1" />
        <button type="button" onClick={() => void approveHighConfidence()} disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] px-3 text-xs text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-40">
          Güveni ≥{HIGH_CONFIDENCE} olanları toplu onayla
        </button>
        <button type="button" onClick={() => void review(false)} disabled={busy || selected.size === 0}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] px-3 text-xs text-rose-600 hover:bg-rose-500/10 disabled:opacity-40">
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
          <label key={keyOf(r)} className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-[var(--bg-subtle)]/40">
            <input type="checkbox" checked={selected.has(keyOf(r))} onChange={() => toggle(r)} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[var(--fg)]">{r.productName}</span>
              <span className="text-[11px] text-[var(--fg-muted)]">→ {r.vehicle} · {r.country ?? '?'}</span>
            </div>
            <span className="shrink-0 font-mono text-[11px] text-[var(--fg-muted)]">{r.confidence.toFixed(1)}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}
          className="h-7 rounded-[4px] border border-[var(--border)] px-2.5 disabled:opacity-40">Önceki</button>
        <span className="text-[var(--fg-muted)]">Sayfa {page + 1}</span>
        <button type="button" disabled={rows.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}
          className="h-7 rounded-[4px] border border-[var(--border)] px-2.5 disabled:opacity-40">Sonraki</button>
      </div>
    </div>
  );
}
