'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { stockApi, type StockRiskRow, type StockFlag } from '@/lib/api/stock';
import { Search, X, AlertTriangle, AlertCircle, TrendingDown } from 'lucide-react';
import { toast } from '@/lib/toast';

type StockClass = 'negative' | 'atRisk' | 'belowThreshold' | 'ok';

export function classifyStockRow(row: StockRiskRow): { key: StockClass; label: string } {
  if (row.negative) return { key: 'negative', label: 'Negatif Stok' };
  if (row.atRisk) return { key: 'atRisk', label: 'Stoksuz, Sevk Bekliyor' };
  if (row.belowThreshold) return { key: 'belowThreshold', label: 'Eşik Altı' };
  return { key: 'ok', label: 'Normal' };
}

const BADGE_CLASS: Record<StockClass, string> = {
  negative: 'bg-danger-soft text-danger border border-danger/20',
  atRisk: 'bg-warning-soft text-warning border border-warning/20',
  belowThreshold: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  ok: 'bg-bg-subtle text-fg-muted border border-border-soft',
};

const FILTERS: ReadonlyArray<{ id: StockFlag | null; label: string }> = [
  { id: null, label: 'Tüm Riskler' },
  { id: 'atRisk', label: 'Stoksuz (Sevk Bekleyen)' },
  { id: 'belowThreshold', label: 'Eşik Altında' },
  { id: 'negative', label: 'Negatif Stok' },
];

export function StockRiskWorkspace({ initialFlag = null }: { initialFlag?: StockFlag | null }) {
  const [flag, setFlag] = useState<StockFlag | null>(initialFlag);
  const [rows, setRows] = useState<StockRiskRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (next: StockFlag | null) => {
    setLoading(true);
    try {
      setRows(await stockApi.availability(next));
      setError(null);
    } catch {
      setError('Stok risk listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(flag);
  }, [flag, reload]);

  async function saveThreshold(productId: number, value: string) {
    const parsed = value.trim() === '' ? null : Number(value);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return;
    try {
      await stockApi.setThreshold(productId, parsed);
      toast.success('Stok eşiği güncellendi.');
      await reload(flag);
    } catch {
      toast.error('Eşik kaydedilemedi.');
    }
  }

  // Summary counts
  const stats = useMemo(() => {
    let negativeCount = 0;
    let atRiskCount = 0;
    let belowCount = 0;
    for (const r of rows) {
      if (r.negative) negativeCount++;
      if (r.atRisk) atRiskCount++;
      if (r.belowThreshold) belowCount++;
    }
    return {
      total: rows.length,
      negative: negativeCount,
      atRisk: atRiskCount,
      below: belowCount,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase().trim();
    return rows.filter(
      (r) =>
        r.supplierSku.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5 max-w-full">
      {/* Üst İstatistik Kartları */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-[4px] border border-border-soft bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-ui-2xs font-semibold uppercase tracking-wider text-fg-muted">
              Riskli Ürünler
            </span>
            <AlertCircle size={14} className="text-fg-subtle" />
          </div>
          <p className="mt-1 text-ui-xl font-bold tracking-tight text-fg">
            {stats.total.toLocaleString('tr-TR')}
          </p>
        </div>

        <div className="rounded-[4px] border border-warning/30 bg-warning-soft/20 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-ui-2xs font-semibold uppercase tracking-wider text-warning">
              Sevk Bekleyen
            </span>
            <AlertTriangle size={14} className="text-warning" />
          </div>
          <p className="mt-1 text-ui-xl font-bold tracking-tight text-warning">
            {stats.atRisk.toLocaleString('tr-TR')}
          </p>
        </div>

        <div className="rounded-[4px] border border-amber-500/20 bg-amber-500/10 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-ui-2xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Eşik Altı
            </span>
            <TrendingDown size={14} className="text-amber-500" />
          </div>
          <p className="mt-1 text-ui-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {stats.below.toLocaleString('tr-TR')}
          </p>
        </div>

        <div className="rounded-[4px] border border-danger/30 bg-danger-soft/20 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-ui-2xs font-semibold uppercase tracking-wider text-danger">
              Negatif Stok
            </span>
            <AlertCircle size={14} className="text-danger" />
          </div>
          <p className="mt-1 text-ui-xl font-bold tracking-tight text-danger">
            {stats.negative.toLocaleString('tr-TR')}
          </p>
        </div>
      </div>

      {/* Filtre ve Arama Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[4px] border border-border-soft bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((item) => {
            const active = flag === item.id;
            return (
              <button
                key={item.id ?? 'all'}
                type="button"
                onClick={() => setFlag(item.id)}
                className={`cursor-pointer rounded-[3px] px-3 py-1.5 text-ui-xs font-semibold transition-colors ${
                  active
                    ? 'bg-fg text-card shadow-xs'
                    : 'border border-border-soft bg-bg text-fg-muted hover:border-border hover:text-fg'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
          />
          <input
            type="text"
            placeholder="SKU veya ürün ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-[3px] border border-border-soft bg-bg pl-8 pr-7 text-ui-xs text-fg outline-none transition focus:border-border"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-[4px] border border-danger/30 bg-danger-soft p-3 text-ui-xs text-danger">
          {error}
        </div>
      )}

      {/* Tablo Konteyneri */}
      <div className="overflow-hidden rounded-[4px] border border-border-soft bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-ui-xs">
            <thead>
              <tr className="border-b border-border-soft bg-bg-subtle/50 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                <th className="px-3 py-2.5">SKU</th>
                <th className="px-3 py-2.5">Ürün Adı</th>
                <th className="px-3 py-2.5 text-right">ERP Stoğu</th>
                <th className="px-3 py-2.5 text-right">Bekleyen Sipariş</th>
                <th className="px-3 py-2.5 text-right">Kargolanmamış</th>
                <th className="px-3 py-2.5 text-right">Min Eşik</th>
                <th className="px-3 py-2.5">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-fg-muted">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-fg-muted">
                    {search ? 'Aramanıza uygun ürün bulunamadı.' : 'Bu filtrede riskli ürün bulunmuyor.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const badge = classifyStockRow(row);
                  return (
                    <tr
                      key={row.productId}
                      className="transition-colors hover:bg-bg-subtle/40"
                    >
                      <td className="px-3 py-2.5 font-mono text-ui-xs font-semibold text-fg">
                        {row.supplierSku}
                      </td>
                      <td className="px-3 py-2.5 max-w-xs truncate font-medium text-fg" title={row.name}>
                        {row.name}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono font-bold tabular-nums ${
                          row.erpStock < 0
                            ? 'text-danger'
                            : row.erpStock === 0
                            ? 'text-warning'
                            : 'text-fg'
                        }`}
                      >
                        {row.erpStock}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-fg-muted">
                        {row.committed}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-fg-muted">
                        {row.unshippedLineCount}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          min={0}
                          defaultValue={row.minStockThreshold ?? ''}
                          placeholder="—"
                          onBlur={(e) => void saveThreshold(row.productId, e.target.value)}
                          className="h-7 w-16 rounded-[3px] border border-border-soft bg-bg px-2 py-1 text-right font-mono text-ui-xs text-fg outline-none transition focus:border-border"
                          aria-label={`${row.supplierSku} stok eşiği`}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block rounded-[3px] px-2 py-0.5 text-[10.5px] font-semibold ${
                            BADGE_CLASS[badge.key]
                          }`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
