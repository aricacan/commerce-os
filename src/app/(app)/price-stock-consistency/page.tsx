'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { priceStockConsistencyApi } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';
import { useI18n } from '../../../lib/i18n';
import { describeError } from '../../../lib/errors';
import type { PriceStockConsistencyOverview, PriceStockConsistencyRow } from '../../../types/api';
import {
  RefreshCw,
  Search, ArrowUp, ArrowDown, ExternalLink,
  Wrench, Check, X, Loader2, Info,
} from 'lucide-react';
import { ExportMenu } from '../../../components/ui/ExportMenu';
import type { ExportColumn } from '../../../lib/export';
import { useMobile } from '../../../hooks/useMobile';
import { FilterSelect, type FilterSelectOption } from '../../../components/ui/FilterSelect';

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'sku', header: 'SKU' },
  { key: 'productName', header: 'Ürün' },
  { key: 'marketplace', header: 'Platform' },
  { key: 'ourPrice', header: 'Bizim Fiyatımız', type: 'money' },
  { key: 'externalPriceTry', header: 'Harici Fiyat (₺)', type: 'money' },
  { key: 'priceDeviationPct', header: 'Fiyat Sapması %', type: 'decimal' },
  { key: 'ourStock', header: 'Bizim Stoğumuz', type: 'int' },
  { key: 'externalStock', header: 'Harici Stok', type: 'int' },
  { key: 'stockDelta', header: 'Stok Farkı', type: 'int' },
  { key: 'lastSyncedAt', header: 'Son Sync', type: 'date' },
];

const MARKETPLACE_LABELS: Record<string, string> = { shop: 'Shopify', ty: 'Trendyol', hb: 'Hepsiburada', base: 'BaseLinker' };
const marketplaceLabel = (code: string) => MARKETPLACE_LABELS[code] ?? code;

/** Sapma %5'i geçince kritik sayılır — altı normal/izlenecek, üstü müdahale edilecek. */
const CRITICAL_DEVIATION_PCT = 5;

type FilterMode = 'all' | 'price' | 'stock' | 'ok';
type SortKey = 'product' | 'priceDev' | 'stockDelta' | 'synced';
type SortDir = 'asc' | 'desc';

const money = (v: number) => `₺${v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Harici fiyatın TL karşılığı — kur yoksa null gelir; ₺0 göstermek yerine açıkça belirtilir. */
const externalMoney = (v: number | null, tr: boolean) => (v === null ? (tr ? 'Kur yok' : 'No FX rate') : money(v));

// ── Sapma Rozeti ──────────────────────────────────────────────────────────────

function DeviationBadge({ value, kind }: { value: number; kind: 'price' | 'stock' }) {
  const critical = kind === 'price' ? Math.abs(value) > CRITICAL_DEVIATION_PCT : Math.abs(value) > 0;
  const up = value > 0;
  const text = kind === 'price'
    ? `%${up ? '+' : ''}${value.toFixed(1)}`
    : `${up ? '+' : ''}${value.toFixed(0)}`;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-[3px] border px-1.5 py-0.5 font-mono text-[11px] font-bold ${
        critical
          ? 'border-red-500/30 bg-red-500/10 text-red-500'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-500'
      }`}
    >
      {up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      <span>{text}</span>
    </span>
  );
}

// ── Stok Düzeltme Kontrolü ──────────────────────────────────────────────────

function StockFixControl({
  row,
  tr,
  editing,
  value,
  onChange,
  onStart,
  onConfirm,
  onCancel,
  submitting,
  error,
  variant = 'desktop',
}: {
  row: PriceStockConsistencyRow;
  tr: boolean;
  editing: boolean;
  value: string;
  onChange: (v: string) => void;
  onStart: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
  variant?: 'desktop' | 'mobile';
}) {
  if (row.externalStock == null) {
    return <span className="text-[11px] text-[var(--fg-muted)]">—</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={onStart}
        title={tr ? 'Stoğu harici değere eşitle' : 'Sync stock to external value'}
        className={`inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-[11px] font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] ${
          variant === 'mobile' ? 'w-full justify-center' : ''
        }`}
      >
        <Wrench size={11} className="text-[var(--fg-muted)]" />
        <span>{tr ? 'Eşitle' : 'Sync'}</span>
      </button>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${variant === 'mobile' ? 'w-full' : ''}`}>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={submitting}
          className="h-7 w-16 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-1.5 font-mono text-xs font-bold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
          autoFocus
        />
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-[var(--fg)] text-[var(--card)] transition hover:opacity-90 disabled:opacity-50"
          title={tr ? 'Onayla' : 'Confirm'}
        >
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] transition hover:text-[var(--fg)]"
          title={tr ? 'İptal' : 'Cancel'}
        >
          <X size={12} />
        </button>
      </div>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────

export default function PriceStockConsistencyPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const isMobile = useMobile();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('priceDev');
  const [sortDir, _setSortDir] = useState<SortDir>('desc');

  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [highlightRowId, setHighlightRowId] = useState<number | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['price-stock-consistency'],
    queryFn: priceStockConsistencyApi.overview,
    staleTime: 5 * 60_000,
  });

  const stockFixMutation = useMutation({
    mutationFn: ({ productId, stockQuantity }: { productId: number; stockQuantity: number }) =>
      priceStockConsistencyApi.updateStock(productId, stockQuantity),
    onSuccess: (updatedRow) => {
      queryClient.setQueryData<PriceStockConsistencyOverview>(['price-stock-consistency'], (old) => {
        if (!old) return old;
        const rows = old.rows.map((r) => (r.id === updatedRow.id ? updatedRow : r));
        return {
          ...old,
          rows,
          priceDeviationCount: rows.filter((r) => r.hasPriceDeviation).length,
          stockDeviationCount: rows.filter((r) => r.hasStockDeviation).length,
          consistentCount: rows.filter((r) => !r.hasPriceDeviation && !r.hasStockDeviation).length,
        };
      });
      setEditingRowId(null);
      setHighlightRowId(updatedRow.id);
      setTimeout(() => setHighlightRowId((id) => (id === updatedRow.id ? null : id)), 1600);
    },
  });

  const startFix = (row: PriceStockConsistencyRow) => {
    stockFixMutation.reset();
    setEditingRowId(row.id);
    setEditValue(String(row.externalStock ?? row.ourStock));
  };

  const cancelFix = () => {
    stockFixMutation.reset();
    setEditingRowId(null);
  };

  const confirmFix = (row: PriceStockConsistencyRow) => {
    const parsed = Number(editValue);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return;
    stockFixMutation.mutate({ productId: row.productId, stockQuantity: parsed });
  };

  const allRows: PriceStockConsistencyRow[] = useMemo(() => data?.rows ?? [], [data]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = allRows.filter((r) => {
      if (filter === 'price' && !r.hasPriceDeviation) return false;
      if (filter === 'stock' && !r.hasStockDeviation) return false;
      if (filter === 'ok' && (r.hasPriceDeviation || r.hasStockDeviation)) return false;
      if (!term) return true;
      return (
        r.productName.toLowerCase().includes(term) ||
        r.sku.toLowerCase().includes(term) ||
        r.marketplace.toLowerCase().includes(term)
      );
    });

    const factor = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'product': return factor * a.productName.localeCompare(b.productName, 'tr');
        case 'priceDev': return factor * (Math.abs(a.priceDeviationPct ?? 0) - Math.abs(b.priceDeviationPct ?? 0));
        case 'stockDelta': return factor * (Math.abs(a.stockDelta) - Math.abs(b.stockDelta));
        case 'synced': return factor * (Date.parse(a.lastSyncedAt) - Date.parse(b.lastSyncedAt));
      }
    });
  }, [allRows, filter, search, sortKey, sortDir]);

  const healthPct = data && data.totalListings > 0
    ? Math.round((data.consistentCount / data.totalListings) * 100)
    : 0;

  const filters: { key: FilterMode; label: string; count?: number }[] = [
    { key: 'all', label: tr ? 'Tümü' : 'All', count: data?.totalListings },
    { key: 'price', label: tr ? 'Fiyat Sapması' : 'Price Dev.', count: data?.priceDeviationCount },
    { key: 'stock', label: tr ? 'Stok Farkı' : 'Stock Delta', count: data?.stockDeviationCount },
    { key: 'ok', label: `${tr ? 'Uyumlu' : 'Consistent'} (%${healthPct})`, count: data?.consistentCount },
  ];

  const SORT_OPTIONS: FilterSelectOption[] = [
    { value: 'priceDev', label: tr ? 'Fiyat Sapması (%)' : 'Price Deviation (%)' },
    { value: 'stockDelta', label: tr ? 'Stok Farkı' : 'Stock Delta' },
    { value: 'product', label: tr ? 'Ürün Adı' : 'Product Name' },
    { value: 'synced', label: tr ? 'Son Senkron' : 'Last Sync' },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-transparent p-4 md:p-5">
      {/* ── Tek Dış Kabuk Kartı ── */}
      <div className="flex min-h-0 flex-1 flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)]">
        
        {/* ── Üst Çubuk: Filtre Butonları + Arama + Sıralama + Dışa Aktar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] p-3">
          
          {/* Sol: Filtre Sayaç Butonları */}
          <div data-tour="consistency-filters" className="flex flex-wrap items-center gap-1.5">
            {filters.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] px-3 text-xs font-semibold transition ${
                    active
                      ? 'bg-[var(--fg)] text-[var(--card)] font-bold'
                      : 'border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count !== undefined && (
                    <span
                      className={`rounded-[3px] px-1 py-0.2 font-mono text-[10.5px] font-bold ${
                        active ? 'bg-[var(--card)] text-[var(--fg)]' : 'bg-[var(--card)] text-[var(--fg-muted)]'
                      }`}
                    >
                      {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sağ: Arama + Sıralama + Yenile + Dışa Aktar */}
          <div data-tour="consistency-actions" className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr ? 'SKU veya ürün ara…' : 'Search SKU or product…'}
                className="h-8 w-44 rounded-[4px] border border-[var(--border)] bg-[var(--card)] pl-7 pr-2.5 text-xs text-[var(--fg)] outline-none transition focus:border-[var(--fg)]"
              />
            </div>

            <FilterSelect
              value={sortKey}
              options={SORT_OPTIONS}
              placeholder={tr ? 'Sıralama' : 'Sort'}
              onChange={(val) => setSortKey((val || 'priceDev') as SortKey)}
              minWidth={140}
            />

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title={tr ? 'Yenile' : 'Refresh'}
              className="inline-flex h-8 items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-50"
            >
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{tr ? 'Yenile' : 'Refresh'}</span>
            </button>

            <ExportMenu
              filename="fiyat-stok-tutarlilik"
              columns={EXPORT_COLUMNS}
              getData={() => rows.map((r) => ({
                sku: r.sku,
                productName: r.productName,
                marketplace: marketplaceLabel(r.marketplace),
                ourPrice: r.ourPrice,
                // Kur yoksa hücre boş kalır — 0 yazmak "₺0 / sapma yok" gibi yanlış okunurdu.
                externalPriceTry: r.externalPriceTry ?? '',
                priceDeviationPct: r.priceDeviationPct ?? '',
                ourStock: r.ourStock,
                externalStock: r.externalStock ?? 0,
                stockDelta: r.stockDelta,
                lastSyncedAt: r.lastSyncedAt,
              }))}
            />
          </div>
        </div>

        {/* ── Bilgilendirme Notu: Fiyat Sapması Formülü ── */}
        <div className="flex items-center gap-2 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-3.5 py-2 text-[11px] text-[var(--fg-muted)]">
          <Info size={13} className="shrink-0 text-[var(--fg-muted)]" />
          <span>
            {tr
              ? 'Fiyat Sapması: Harici Pazaryeri Fiyatı (₺) ile Bizim Sistem Fiyatımız arasındaki farktır. ±%5 üzeri sapmalar risk olarak işaretlenir.'
              : 'Price Deviation: Percentage delta between External Marketplace (TRY) and Our Internal Price. Deviations > ±5% are flagged.'}
          </span>
        </div>

        {/* ── Tablo / Kart İçeriği ── */}
        <div data-tour="consistency-table" className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 p-14 text-xs text-[var(--fg-muted)]">
              <Loader2 size={20} className="animate-spin text-[var(--fg)]" />
              <span>{tr ? 'Yükleniyor…' : 'Loading…'}</span>
            </div>
          ) : isError ? (
            <div className="p-14 text-center text-xs text-red-500">
              {tr ? 'Veri yüklenemedi. Lütfen tekrar deneyin.' : 'Failed to load data.'}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-14 text-center text-xs text-[var(--fg-muted)]">
              {search
                ? (tr ? `"${search}" ile eşleşen kayıt bulunamadı.` : `No records found matching "${search}".`)
                : (tr ? 'Bu filtreye uygun kayıt yok.' : 'No records match this filter.')}
            </div>
          ) : isMobile ? (
            /* ── Mobil Görünüm (Kartlar) ── */
            <div className="flex flex-col gap-2 p-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={`flex flex-col gap-2.5 rounded-[4px] border p-3 transition ${
                    highlightRowId === row.id
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : 'border-[var(--border-soft)] bg-[var(--card)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-xs font-bold text-[var(--fg)]">{row.productName}</p>
                      <p className="mt-0.5 font-mono text-[10.5px] text-[var(--fg-muted)]">{row.sku}</p>
                    </div>
                    <span className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-bold text-[var(--fg-muted)]">
                      {marketplaceLabel(row.marketplace)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 p-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[var(--fg-muted)]">{tr ? 'Fiyat' : 'Price'}</span>
                      <p className="m-0 mt-0.5 font-mono font-bold text-[var(--fg)]">{money(row.ourPrice)}</p>
                      <p className="m-0 text-[10.5px] text-[var(--fg-muted)]">{externalMoney(row.externalPriceTry, tr)}</p>
                      <div className="mt-1">
                        {row.hasPriceDeviation && row.priceDeviationPct !== null ? (
                          <DeviationBadge value={row.priceDeviationPct} kind="price" />
                        ) : row.fxRateUnavailable ? (
                          <span className="text-[10.5px] font-bold text-amber-500">{tr ? 'Hesaplanamadı' : 'Unknown'}</span>
                        ) : (
                          <span className="text-[10.5px] font-bold text-emerald-500">{tr ? 'Uyumlu' : 'Match'}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-[var(--fg-muted)]">{tr ? 'Stok' : 'Stock'}</span>
                      <p className="m-0 mt-0.5 font-mono font-bold text-[var(--fg)]">{row.ourStock} {tr ? 'ad.' : 'u.'}</p>
                      <p className="m-0 text-[10.5px] text-[var(--fg-muted)]">{tr ? 'harici:' : 'ext:'} {row.externalStock ?? '—'}</p>
                      <div className="mt-1">
                        {row.hasStockDeviation ? (
                          <DeviationBadge value={row.stockDelta} kind="stock" />
                        ) : (
                          <span className="text-[10.5px] font-bold text-emerald-500">{tr ? 'Uyumlu' : 'Match'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <StockFixControl
                      row={row}
                      tr={tr}
                      editing={editingRowId === row.id}
                      value={editValue}
                      onChange={setEditValue}
                      onStart={() => startFix(row)}
                      onConfirm={() => confirmFix(row)}
                      onCancel={cancelFix}
                      submitting={stockFixMutation.isPending}
                      error={editingRowId === row.id && stockFixMutation.isError ? describeError(stockFixMutation.error) : null}
                      variant="mobile"
                    />
                    {row.externalUrl && (
                      <a
                        href={row.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--fg)] hover:underline shrink-0"
                      >
                        <span>{tr ? 'İlan' : 'Listing'}</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Masaüstü Görünüm (Keskin Tablo) ── */
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-3.5 py-2.5">{tr ? 'Ürün / SKU' : 'Product / SKU'}</th>
                  <th className="px-3.5 py-2.5">{tr ? 'Platform' : 'Marketplace'}</th>
                  <th className="px-3.5 py-2.5 text-right">{tr ? 'Bizim Fiyat' : 'Our Price'}</th>
                  <th className="px-3.5 py-2.5 text-right">{tr ? 'Harici Fiyat' : 'External Price'}</th>
                  <th className="px-3.5 py-2.5 text-right">{tr ? 'Fiyat Sapması' : 'Price Dev.'}</th>
                  <th className="px-3.5 py-2.5 text-right border-l border-[var(--border-soft)]">{tr ? 'Bizim Stok' : 'Our Stock'}</th>
                  <th className="px-3.5 py-2.5 text-right">{tr ? 'Harici Stok' : 'External Stock'}</th>
                  <th className="px-3.5 py-2.5 text-right">{tr ? 'Stok Farkı' : 'Stock Delta'}</th>
                  <th className="px-3.5 py-2.5">{tr ? 'Son Senkron' : 'Last Sync'}</th>
                  <th className="px-3.5 py-2.5 text-right">{tr ? 'İşlem' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`transition hover:bg-[var(--bg-subtle)]/40 ${
                      highlightRowId === row.id ? 'bg-emerald-500/10' : ''
                    }`}
                  >
                    {/* Ürün Adı & SKU */}
                    <td className="px-3.5 py-2.5 align-top">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[240px] font-semibold text-[var(--fg)]" title={row.productName}>
                          {row.productName}
                        </span>
                        {row.externalUrl && (
                          <a
                            href={row.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--fg-muted)] hover:text-[var(--fg)]"
                            title={tr ? 'İlanı Aç' : 'Open Listing'}
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                      <span className="font-mono text-[10.5px] text-[var(--fg-muted)] block mt-0.5">{row.sku}</span>
                    </td>

                    {/* Platform */}
                    <td className="px-3.5 py-2.5 align-top">
                      <span className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-bold text-[var(--fg-muted)]">
                        {marketplaceLabel(row.marketplace)}
                      </span>
                    </td>

                    {/* Bizim Fiyat */}
                    <td className="px-3.5 py-2.5 align-top text-right font-mono font-bold text-[var(--fg)]">
                      {money(row.ourPrice)}
                    </td>

                    {/* Harici Fiyat */}
                    <td className="px-3.5 py-2.5 align-top text-right">
                      <span className="font-mono font-semibold text-[var(--fg)] block">{externalMoney(row.externalPriceTry, tr)}</span>
                      {row.externalCurrency !== 'TRY' && (
                        <span className="font-mono text-[10px] text-[var(--fg-muted)]">
                          {row.externalCurrency} {row.externalPriceOriginal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>

                    {/* Fiyat Sapması */}
                    <td className="px-3.5 py-2.5 align-top text-right">
                      {row.hasPriceDeviation && row.priceDeviationPct !== null ? (
                        <DeviationBadge value={row.priceDeviationPct} kind="price" />
                      ) : row.fxRateUnavailable ? (
                        <span className="text-[11px] font-semibold text-amber-500">{tr ? 'Hesaplanamadı' : 'Unknown'}</span>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-500">{tr ? 'Uyumlu' : 'Match'}</span>
                      )}
                    </td>

                    {/* Bizim Stok */}
                    <td className="px-3.5 py-2.5 align-top text-right font-mono font-bold text-[var(--fg)] border-l border-[var(--border-soft)]">
                      {row.ourStock.toLocaleString('tr-TR')}
                    </td>

                    {/* Harici Stok */}
                    <td className="px-3.5 py-2.5 align-top text-right font-mono text-[var(--fg)]">
                      {row.externalStock != null ? row.externalStock.toLocaleString('tr-TR') : '—'}
                    </td>

                    {/* Stok Farkı */}
                    <td className="px-3.5 py-2.5 align-top text-right">
                      {row.hasStockDeviation ? (
                        <DeviationBadge value={row.stockDelta} kind="stock" />
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-500">{tr ? 'Uyumlu' : 'Match'}</span>
                      )}
                    </td>

                    {/* Son Senkron */}
                    <td className="px-3.5 py-2.5 align-top font-mono text-[10.5px] text-[var(--fg-muted)] whitespace-nowrap">
                      {formatDateTime(row.lastSyncedAt)}
                    </td>

                    {/* İşlem */}
                    <td className="px-3.5 py-2.5 align-top text-right">
                      <StockFixControl
                        row={row}
                        tr={tr}
                        editing={editingRowId === row.id}
                        value={editValue}
                        onChange={setEditValue}
                        onStart={() => startFix(row)}
                        onConfirm={() => confirmFix(row)}
                        onCancel={cancelFix}
                        submitting={stockFixMutation.isPending}
                        error={editingRowId === row.id && stockFixMutation.isError ? describeError(stockFixMutation.error) : null}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Alt Bar: Toplam Sayı ── */}
        <div className="flex h-9 shrink-0 items-center justify-between border-t border-[var(--border-soft)] px-4 text-[11px] text-[var(--fg-muted)]">
          <span>
            {tr ? 'Gösterilen:' : 'Showing:'} <b className="text-[var(--fg)]">{rows.length}</b> / {allRows.length} {tr ? 'ilan' : 'listings'}
          </span>
          <span>
            {tr ? 'Uyum Oranı:' : 'Consistency Rate:'} <b className="text-emerald-500">%{healthPct}</b>
          </span>
        </div>
      </div>
    </div>
  );
}
