'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { categoryPriceApi } from '../../lib/api';
import { CategoryPriceStatus } from '../../types/api';
import type { OverLimitProduct } from '../../types/api';
import { ErpSourceFilter, useErpSourceFilter } from './ErpSourceFilter';
import { ExportMenu, type ExportRow } from '../../components/ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import { PriceComparisonPageShell } from './PriceComparisonPageShell';

const OVER_LIMIT_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'sku', header: 'SKU' },
  { key: 'productName', header: 'Ürün' },
  { key: 'category', header: 'Kategori' },
  { key: 'status', header: 'Durum' },
  { key: 'target', header: 'Hedef Fiyat', type: 'money' },
  { key: 'observed', header: 'Gözlemlenen Fiyat', type: 'money' },
  { key: 'deviationPct', header: 'Sapma %', type: 'decimal' },
];

function money(n: number, symbol: string): string {
  return symbol + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function OverLimitTab() {
  const { sources, isLoading: sourcesLoading } = useErpSourceFilter();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (selectedId == null && sources.length > 0) setSelectedId(sources[0].id);
  }, [sources, selectedId]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['category-price-over-limit', selectedId],
    queryFn: () => categoryPriceApi.overLimit(selectedId as number),
    enabled: selectedId != null,
    staleTime: 30_000,
  });

  const selectedSource = sources.find((s) => s.id === selectedId);
  const symbol = selectedSource?.erp === 'Base' ? '£' : '₺';
  const allItems = useMemo(() => data?.items ?? [], [data]);

  const items = useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase();
    return allItems.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q)
    );
  }, [allItems, search]);

  if (sourcesLoading) return <div className="p-6 text-center text-xs text-[var(--fg-muted)]">Yükleniyor…</div>;
  if (sources.length === 0) return <div className="p-6 text-center text-xs text-[var(--fg-muted)]">Aktif ERP kaynağı yok.</div>;

  return (
    <PriceComparisonPageShell
      toolbar={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <ErpSourceFilter sources={sources} selectedId={selectedId} onChange={setSelectedId} minWidth={170} />
            {allItems.length > 0 && (
              <span className="inline-flex h-8 items-center rounded-[4px] border border-rose-500/20 bg-rose-500/5 px-2.5 text-xs font-semibold text-rose-500/90">
                {allItems.length} ürün sınır dışında
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-60 items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--fg)] focus-within:border-[var(--fg)]">
              <Search size={13} className="text-[var(--fg-muted)] shrink-0" />
              <input
                value={search}
                placeholder="Ürün veya SKU ara"
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none"
              />
            </div>

            <ExportMenu
              filename={`fiyat-sinir-asanlar-${selectedSource?.erp ?? ''}`}
              columns={OVER_LIMIT_EXPORT_COLUMNS}
              getData={() =>
                items.map((p): ExportRow => ({
                  sku: p.sku,
                  productName: p.productName,
                  category: p.categoryName,
                  status: p.status === CategoryPriceStatus.Over ? 'Üstünde' : 'Altında',
                  target: p.targetPrice,
                  observed: p.observedPrice,
                  deviationPct: p.deviationPct,
                }))
              }
            />
          </div>
        </>
      }
    >
      {isLoading && <div className="p-8 text-center text-xs text-[var(--fg-muted)]">Yükleniyor…</div>}
      {isError && <div className="p-8 text-center text-xs text-rose-500/85">Liste yüklenemedi.</div>}
      {data && allItems.length === 0 && (
        <div className="p-8 text-center text-xs text-[var(--fg-muted)]">
          Bu ERP kaynağında tolerans dışında ürün yok.
        </div>
      )}

      <div className="flex flex-col divide-y divide-[var(--border-soft)] border border-[var(--border-soft)] rounded-[4px] overflow-hidden">
        {items.map((p) => (
          <OverLimitRow key={p.productId} p={p} symbol={symbol} />
        ))}
        {allItems.length > 0 && items.length === 0 && (
          <div className="p-8 text-center text-xs text-[var(--fg-muted)]">Aramaya uygun ürün bulunamadı.</div>
        )}
      </div>
    </PriceComparisonPageShell>
  );
}

function OverLimitRow({ p, symbol }: { p: OverLimitProduct; symbol: string }) {
  const over = p.status === CategoryPriceStatus.Over;
  const tone = over ? 'text-rose-500/85' : 'text-amber-500/85';

  return (
    <div className="flex items-center justify-between gap-3 bg-[var(--card)] p-3 hover:bg-[var(--bg-subtle)]/40 transition text-xs">
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold text-[var(--fg)]">{p.productName}</div>
        <div className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
          <span className="font-semibold text-[var(--fg-muted)]">{p.sku}</span> · {p.categoryName} · Hedef: {money(p.targetPrice, symbol)} · Gözlem: {money(p.observedPrice, symbol)}
        </div>
      </div>
      <div className={`shrink-0 text-xs font-bold ${tone}`}>
        {p.deviationPct > 0 ? '+' : ''}
        {p.deviationPct}%
      </div>
    </div>
  );
}
