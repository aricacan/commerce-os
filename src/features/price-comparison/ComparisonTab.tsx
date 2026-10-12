'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryPriceApi } from '../../lib/api';
import { CategoryPriceStatus } from '../../types/api';
import type { CurrencyComparison, CategoryPriceStatusValue } from '../../types/api';
import { ErpSourceFilter, useErpSourceFilter } from './ErpSourceFilter';
import { ExportMenu, type ExportRow } from '../../components/ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import { Check, Save, Search } from 'lucide-react';
import Link from 'next/link';
import { PriceComparisonPageShell } from './PriceComparisonPageShell';

const COMPARISON_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'category', header: 'Kategori' },
  { key: 'status', header: 'Durum' },
  { key: 'target', header: 'Hedef Fiyat', type: 'money' },
  { key: 'observedAvg', header: 'Gözlemlenen Ort.', type: 'money' },
  { key: 'observedMin', header: 'Min', type: 'money' },
  { key: 'observedMax', header: 'Maks', type: 'money' },
  { key: 'deviationPct', header: 'Sapma %', type: 'decimal' },
  { key: 'productCount', header: 'Ürün Sayısı', type: 'int' },
];

interface StatusStyle {
  label: string;
  className: string;
}

function statusStyle(s: CategoryPriceStatusValue): StatusStyle {
  switch (s) {
    case CategoryPriceStatus.WithinTolerance:
      return { label: 'Sınırda', className: 'bg-emerald-500/5 text-emerald-600/85 dark:text-emerald-400/85 border border-emerald-500/20' };
    case CategoryPriceStatus.Over:
      return { label: 'Üstünde', className: 'bg-rose-500/5 text-rose-500/80 border border-rose-500/20' };
    case CategoryPriceStatus.Under:
      return { label: 'Altında', className: 'bg-amber-500/5 text-amber-500/80 border border-amber-500/20' };
    case CategoryPriceStatus.NoData:
      return { label: 'Veri yok', className: 'bg-[var(--bg-subtle)] text-[var(--fg-muted)] border border-[var(--border-soft)]' };
    default:
      return { label: 'Hedef yok', className: 'bg-[var(--bg-subtle)] text-[var(--fg-muted)] border border-[var(--border-soft)]' };
  }
}

function money(n: number | null, symbol: string): string {
  if (n == null) return '—';
  return symbol + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ComparisonTab() {
  const { sources, isLoading: sourcesLoading } = useErpSourceFilter();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (selectedId == null && sources.length > 0) setSelectedId(sources[0].id);
  }, [sources, selectedId]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['category-price-compare', selectedId],
    queryFn: () => categoryPriceApi.compare(selectedId as number),
    enabled: selectedId != null,
    staleTime: 30_000,
  });

  const selectedSource = sources.find((s) => s.id === selectedId);
  const currency = selectedSource?.erp === 'Base' ? 'GBP' : 'TL';
  const symbol = currency === 'GBP' ? '£' : '₺';

  const allRows = useMemo(() => {
    return (data?.rows ?? []).filter(
      (r) => (currency === 'GBP' ? r.gbp : r.tl).status !== CategoryPriceStatus.NoTarget
    );
  }, [data, currency]);

  const rows = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.toLowerCase();
    return allRows.filter((r) => r.categoryName.toLowerCase().includes(q));
  }, [allRows, search]);

  if (sourcesLoading) return <div className="p-6 text-center text-xs text-[var(--fg-muted)]">Yükleniyor…</div>;
  if (sources.length === 0) return <div className="p-6 text-center text-xs text-[var(--fg-muted)]">Aktif ERP kaynağı yok.</div>;

  return (
    <PriceComparisonPageShell
      toolbar={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <ErpSourceFilter sources={sources} selectedId={selectedId} onChange={setSelectedId} minWidth={170} />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-60 items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--fg)] focus-within:border-[var(--fg)]">
              <Search size={13} className="text-[var(--fg-muted)] shrink-0" />
              <input
                value={search}
                placeholder="Kategori filtrele"
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none"
              />
            </div>

            <ExportMenu
              filename={`fiyat-karsilastirma-${selectedSource?.erp ?? ''}`}
              columns={COMPARISON_EXPORT_COLUMNS}
              getData={() =>
                rows.map((row): ExportRow => {
                  const c = currency === 'GBP' ? row.gbp : row.tl;
                  return {
                    category: row.categoryName,
                    status: statusStyle(c.status).label,
                    target: c.targetPrice ?? 0,
                    observedAvg: c.observedAvg ?? 0,
                    observedMin: c.observedMin ?? 0,
                    observedMax: c.observedMax ?? 0,
                    deviationPct: c.deviationPct ?? 0,
                    productCount: c.productCount,
                  };
                })
              }
            />
          </div>
        </>
      }
    >
      {isLoading && <div className="p-8 text-center text-xs text-[var(--fg-muted)]">Yükleniyor…</div>}
      {isError && <div className="p-8 text-center text-xs text-rose-500/85">Karşılaştırma yüklenemedi.</div>}

      {data && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const c = currency === 'GBP' ? row.gbp : row.tl;
            const otherTargetPrice = currency === 'GBP' ? row.tl.targetPrice : row.gbp.targetPrice;
            return (
              <CategoryCard
                key={row.internalCategoryId}
                name={row.categoryName}
                categoryId={row.internalCategoryId}
                c={c}
                symbol={symbol}
                currency={currency}
                otherTargetPrice={otherTargetPrice}
              />
            );
          })}

          {allRows.length === 0 && (
            <div className="col-span-full p-8 text-center text-xs text-[var(--fg-muted)]">
              Henüz hedef fiyat girilmiş kategori yok.
            </div>
          )}

          {allRows.length > 0 && rows.length === 0 && (
            <div className="col-span-full p-8 text-center text-xs text-[var(--fg-muted)]">
              Aramaya uygun kategori bulunamadı.
            </div>
          )}
        </div>
      )}
    </PriceComparisonPageShell>
  );
}

function CategoryCard({
  name,
  categoryId,
  c,
  symbol,
  currency,
  otherTargetPrice,
}: {
  name: string;
  categoryId: number;
  c: CurrencyComparison;
  symbol: string;
  currency: 'TL' | 'GBP';
  otherTargetPrice: number | null;
}) {
  const qc = useQueryClient();
  const st = statusStyle(c.status);
  const [val, setVal] = useState(c.targetPrice != null ? String(c.targetPrice) : '');
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setVal(c.targetPrice != null ? String(c.targetPrice) : '');
    setDirty(false);
  }, [c.targetPrice]);

  const saveMutation = useMutation({
    meta: { successMessage: 'Hedef fiyat güncellendi' } as const,
    mutationFn: (newPrice: number | null) => {
      const priceTl = currency === 'TL' ? newPrice : otherTargetPrice;
      const priceGbp = currency === 'GBP' ? newPrice : otherTargetPrice;
      return categoryPriceApi.upsertTarget(categoryId, { priceTl, priceGbp });
    },
    onSuccess: () => {
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2000);
      qc.invalidateQueries({ queryKey: ['category-price-compare'] });
      qc.invalidateQueries({ queryKey: ['category-price-targets'] });
    },
  });

  const handleSave = () => {
    const parsed = parseFloat(val.replace(',', '.'));
    const finalVal = isNaN(parsed) || parsed < 0 ? null : parsed;
    saveMutation.mutate(finalVal);
  };

  const deviationTone =
    c.deviationPct == null
      ? ''
      : c.deviationPct > 0
      ? 'text-rose-500/85'
      : c.deviationPct < 0
      ? 'text-amber-500/85'
      : 'text-[var(--fg-muted)]';

  return (
    <div className="flex flex-col gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 hover:bg-[var(--bg-subtle)]/20 transition">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-bold text-[var(--fg)]">{name}</span>
        <span className={`shrink-0 rounded-[2px] px-1.5 py-0.5 text-[11px] font-semibold ${st.className}`}>
          {st.label}
        </span>
      </div>

      <div className="flex items-baseline gap-2.5">
        <div className="flex-1">
          <div className="text-[10.5px] font-semibold uppercase text-[var(--fg-muted)]">Hedef</div>
          <div className="mt-0.5 flex items-center gap-1">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-[var(--fg-muted)]">
                {symbol}
              </span>
              <input
                inputMode="decimal"
                value={val}
                onChange={(e) => {
                  setVal(e.target.value);
                  setDirty(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
                className="h-7 w-full rounded-[3px] border border-[var(--border)] bg-[var(--card)] pl-4 pr-1.5 text-xs font-bold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>
            {dirty && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border transition ${
                  saved
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)] hover:bg-[var(--card)]'
                }`}
              >
                {saved ? <Check size={11} /> : <Save size={11} />}
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-semibold uppercase text-[var(--fg-muted)]">Gözlem Ort.</div>
          <div className="mt-0.5 text-xs font-bold text-[var(--fg)]">{money(c.observedAvg, symbol)}</div>
        </div>

        {c.deviationPct != null && (
          <div className={`ml-auto self-end text-xs font-bold ${deviationTone}`}>
            {c.deviationPct > 0 ? '+' : ''}
            {c.deviationPct}%
          </div>
        )}
      </div>

      {c.productCount > 0 && (
        <div className="mt-1 flex items-center justify-between border-t border-[var(--border-soft)] pt-1.5 text-[11px] text-[var(--fg-muted)]">
          <Link href={`/products?cat=${categoryId}`} className="font-semibold text-[var(--fg)] hover:underline">
            {c.productCount} ürün
          </Link>
          <span>
            min {money(c.observedMin, symbol)} · max {money(c.observedMax, symbol)}
          </span>
        </div>
      )}
    </div>
  );
}
