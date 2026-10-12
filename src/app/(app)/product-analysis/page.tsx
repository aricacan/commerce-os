'use client';

import { useState, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Package, ChevronLeft, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { productApi } from '../../../lib/api';
import { useI18n } from '../../../lib/i18n';
import { DateRangePicker } from '../../../components/ui/DateRangePicker';
import { resolveDatePreset, type DatePreset } from '../../../utils/date';
import type { CrossPlatformProduct } from '../../../types/api';
import { useMobile } from '../../../hooks/useMobile';
import { useBaseCurrency } from '../../../hooks/useBaseCurrency';
import { ExportMenu } from '../../../components/ui/ExportMenu';
import type { ExportColumn } from '../../../lib/export';
import { FilterSelect, type FilterSelectOption } from '../../../components/ui/FilterSelect';

const PRODUCT_ANALYSIS_COLS: ExportColumn[] = [
  { key: 'sku',          header: 'SKU',              type: 'text' },
  { key: 'name',         header: 'Ürün Adı',         type: 'text' },
  { key: 'brand',        header: 'Marka',            type: 'text' },
  { key: 'storeCount',   header: 'Mağaza Sayısı',    type: 'int' },
  { key: 'basePrice',    header: 'Taban Fiyat (TL)', type: 'money', currency: 'TRY' },
  { key: 'stock',        header: 'Stok',             type: 'int' },
  { key: 'totalSold',    header: 'Toplam Satış',     type: 'int' },
  { key: 'totalRevenue', header: 'Toplam Ciro (TL)', type: 'money', currency: 'TRY' },
  { key: 'topPlatform',  header: 'En İyi Platform',  type: 'text' },
];

function fmtTry(n: number) {
  return '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtGbp(n: number) {
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function makeCurrencyFormatter(toGbp: (n: number) => number | null, isBaseSourceType: (s?: string | null) => boolean) {
  return function fmt(n: number, sourceType?: string | null) {
    const tryStr = fmtTry(n);
    if (!isBaseSourceType(sourceType)) return tryStr;
    const gbp = toGbp(n);
    return gbp != null ? `${fmtGbp(gbp)} (${tryStr})` : tryStr;
  };
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

type SortOption = 'revenue_desc' | 'revenue_asc' | 'sold_desc' | 'sold_asc';

// ── Büyütülmüş Donut / Pasta Grafik (conic-gradient, monokrom/kontrast) ──────

const SEGMENT_PALETTE = [
  '#4a5568', '#718096', '#a0aec0', '#cbd5e0', '#e2e8f0', '#2d3748', '#1a202c',
];

function DonutChart({
  segments,
  size = 140,
}: {
  segments: { label: string; value: number; color?: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return null;

  const stops = segments
    .reduce<{ text: string[]; cumulative: number }>((acc, s, idx) => {
      const color = s.color || SEGMENT_PALETTE[idx % SEGMENT_PALETTE.length];
      const startPct = (acc.cumulative / total) * 100;
      const nextCumulative = acc.cumulative + s.value;
      const endPct = (nextCumulative / total) * 100;
      return { text: [...acc.text, `${color} ${startPct}% ${endPct}%`], cumulative: nextCumulative };
    }, { text: [], cumulative: 0 })
    .text.join(', ');

  const cutout = Math.round(size * 0.28);

  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div
        className="h-full w-full rounded-full"
        style={{ background: `conic-gradient(${stops})` }}
      />
      <div
        className="absolute rounded-full bg-[var(--card)] flex items-center justify-center"
        style={{ inset: cutout }}
      >
        <span className="text-[10.5px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
          {segments.length} kanal
        </span>
      </div>
    </div>
  );
}

// ── Genişletilmiş Satır İçeriği (Gri Arka Div Kaldırıldı, Kart İçi Temiz Yapı) ──

function ProductRowDetail({
  product,
  fmt,
}: {
  product: CrossPlatformProduct;
  fmt: (n: number, sourceType?: string | null) => string;
}) {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const isMobile = useMobile();

  const revenueShare = product.platformBreakdown.map((p, idx) => ({
    ...p,
    label: p.platformName,
    value: p.revenue,
    color: SEGMENT_PALETTE[idx % SEGMENT_PALETTE.length],
    pct: product.totalRevenue > 0 ? Math.round((p.revenue / product.totalRevenue) * 100) : 0,
  }));

  return (
    <div className="border-t border-[var(--border-soft)] bg-transparent p-4 md:px-6 md:py-5">
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-[1.1fr_1.3fr]'}`}>
        
        {/* Sol: Platform Ciro Payı & Büyütülmüş Pasta Grafik */}
        <div className="rounded-[4px] border border-[var(--border-soft)] p-3.5">
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            {t('product_analysis_revenue_share')}
          </p>

          {revenueShare.length === 0 ? (
            <p className="text-xs text-[var(--fg-muted)]">{t('product_analysis_no_revenue_data')}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-5">
              <DonutChart segments={revenueShare} size={130} />
              
              {/* Kanal Listesi (Renkli Noktalar Kaldırıldı, Sade Monokrom Liste) */}
              <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
                {revenueShare.map((p) => (
                  <div
                    key={p.platformName}
                    className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] py-1 last:border-b-0 text-xs"
                  >
                    <span className="truncate font-semibold text-[var(--fg)]">{p.platformName}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-[var(--fg)]">%{p.pct}</span>
                      <span className="font-mono text-[10.5px] text-[var(--fg-muted)] w-12 text-right">
                        {fmtShort(p.unitsSold)} {isTr ? 'ad.' : 'u.'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sağ: Mağaza / ERP Kırılımı */}
        <div className="rounded-[4px] border border-[var(--border-soft)] p-3.5">
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            {isTr ? 'Mağaza / ERP Kırılımı' : 'Store / ERP Breakdown'}
          </p>

          {product.storeBreakdown.length === 0 ? (
            <p className="text-xs text-[var(--fg-muted)]">{t('product_analysis_no_order_data')}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {product.storeBreakdown.map((sb) => (
                <div
                  key={`${sb.storeId}-${sb.sourceType ?? ''}`}
                  className="flex items-center justify-between gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-xs font-bold text-[var(--fg)]">
                      {sb.sourceType ? `${sb.sourceType} — ${sb.storeName}` : sb.storeName}
                    </p>
                    <p className="m-0 text-[10.5px] text-[var(--fg-muted)]">
                      {sb.unitsSold.toLocaleString('tr-TR')} {t('product_analysis_product_unit')}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold text-[var(--fg)]">
                    {fmt(sb.revenue, sb.sourceType)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Düz Liste Satırı (Keskin, Monokrom, Renkli Noktalar Kaldırıldı) ──────────

function ProductRow({
  product,
  rowNum,
  isOpen,
  onToggle,
  fmt,
}: {
  product: CrossPlatformProduct;
  rowNum: number;
  isOpen: boolean;
  onToggle: () => void;
  fmt: (n: number, sourceType?: string | null) => string;
}) {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const isMobile = useMobile();

  return (
    <div className="border-b border-[var(--border-soft)] transition hover:bg-[var(--bg-subtle)]/40 last:border-b-0">
      <div
        onClick={onToggle}
        className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-2.5 md:flex-nowrap md:gap-4"
      >
        <span className="w-5 shrink-0 text-center font-mono text-[11px] font-bold text-[var(--fg-muted)]">
          {rowNum}
        </span>

        {!isMobile && (
          <Package size={14} className="shrink-0 text-[var(--fg-muted)]" />
        )}

        {/* Ürün Adı + SKU + Marka */}
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-xs font-bold text-[var(--fg)]" title={product.name}>
            {product.name}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10.5px] font-semibold text-[var(--fg-muted)]">
              {product.supplierSKU}
            </span>
            {product.brand && (
              <span className="text-[10.5px] text-[var(--fg-muted)]">· {product.brand}</span>
            )}
            {product.storeCount > 1 && (
              <span className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1.5 py-0.2 text-[9.5px] font-bold text-[var(--fg-muted)]">
                {product.storeCount} {isTr ? 'mağaza' : 'stores'}
              </span>
            )}
          </div>
        </div>

        {/* İstatistikler */}
        {isMobile ? (
          <div className="grid w-full grid-cols-3 gap-2 border-t border-[var(--border-soft)] pt-2 mt-1">
            <div>
              <p className="m-0 text-[9px] font-bold uppercase text-[var(--fg-muted)]">{t('product_analysis_col_base_price')}</p>
              <p className="m-0 mt-0.5 font-mono text-xs font-semibold text-[var(--fg)]">{fmt(product.basePrice)}</p>
            </div>
            <div>
              <p className="m-0 text-[9px] font-bold uppercase text-[var(--fg-muted)]">{t('product_analysis_col_stock')}</p>
              <p className={`m-0 mt-0.5 font-mono text-xs font-semibold ${product.stockQuantity < 5 ? 'text-red-500' : 'text-[var(--fg)]'}`}>
                {product.stockQuantity.toLocaleString('tr-TR')}
              </p>
            </div>
            <div>
              <p className="m-0 text-[9px] font-bold uppercase text-[var(--fg-muted)]">{t('product_analysis_col_total_sales')}</p>
              <p className="m-0 mt-0.5 font-mono text-xs font-bold text-[var(--fg)]">{product.totalUnitsSold.toLocaleString('tr-TR')}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="w-24 shrink-0 text-right">
              <p className="m-0 text-[9.5px] font-bold uppercase text-[var(--fg-muted)]">{t('product_analysis_col_base_price')}</p>
              <p className="m-0 mt-0.5 font-mono text-xs font-semibold text-[var(--fg)]">{fmt(product.basePrice)}</p>
            </div>

            <div className="w-16 shrink-0 text-right">
              <p className="m-0 text-[9.5px] font-bold uppercase text-[var(--fg-muted)]">{t('product_analysis_col_stock')}</p>
              <p className={`m-0 mt-0.5 font-mono text-xs font-semibold ${product.stockQuantity < 5 ? 'text-red-500' : 'text-[var(--fg)]'}`}>
                {product.stockQuantity.toLocaleString('tr-TR')}
              </p>
            </div>

            <div className="w-20 shrink-0 text-right">
              <p className="m-0 text-[9.5px] font-bold uppercase text-[var(--fg-muted)]">{t('product_analysis_col_total_sales')}</p>
              <p className="m-0 mt-0.5 font-mono text-xs font-bold text-[var(--fg)]">{product.totalUnitsSold.toLocaleString('tr-TR')}</p>
            </div>

            <div className="w-32 shrink-0 text-right">
              <p className="m-0 text-[9.5px] font-bold uppercase text-[var(--fg-muted)]">{t('kpi_revenue')}</p>
              <p className="m-0 mt-0.5 font-mono text-xs font-bold text-[var(--fg)]">{fmtTry(product.totalRevenue)}</p>
            </div>

            <div className="w-28 shrink-0 text-right">
              <p className="m-0 text-[9.5px] font-bold uppercase text-[var(--fg-muted)]">{isTr ? 'En İyi Kanal' : 'Top Channel'}</p>
              <p className="m-0 mt-0.5 truncate text-xs font-semibold text-[var(--fg)]" title={product.topPlatform ?? '—'}>
                {product.topPlatform ?? '—'}
              </p>
            </div>
          </>
        )}

        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--fg-muted)] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[var(--fg)]' : ''
          }`}
        />
      </div>

      {/* Akordeon Detayı */}
      {isOpen && <ProductRowDetail product={product} fmt={fmt} />}
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────

export default function ProductAnalysisPage() {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const { toGbp, isBaseSourceType } = useBaseCurrency();
  const fmt = makeCurrencyFormatter(toGbp, isBaseSourceType);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('revenue_desc');
  const deferredSearch = useDeferredValue(search);
  const { from, to } = resolveDatePreset(dateRange, customFrom, customTo);

  function changeDateRange(preset: DatePreset) {
    setDateRange(preset);
    setPage(1);
  }

  function changeCustomDates(f: string, t2: string) {
    setCustomFrom(f);
    setCustomTo(t2);
    setPage(1);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cross-platform', deferredSearch, dateRange, from, to, sortBy, page],
    queryFn: () => productApi.crossPlatform({ search: deferredSearch || undefined, from: from || undefined, to: to || undefined, sortBy, page, pageSize: 30 }),
    staleTime: 60_000,
  });

  const totalPages = data ? Math.ceil(data.totalCount / data.pageSize) : 1;
  const platforms = data?.availablePlatforms ?? [];

  const SORT_OPTIONS: FilterSelectOption[] = [
    { value: 'revenue_desc', label: isTr ? 'En Çok Ciro' : 'Highest Revenue' },
    { value: 'revenue_asc', label: isTr ? 'En Az Ciro' : 'Lowest Revenue' },
    { value: 'sold_desc', label: isTr ? 'En Çok Satış' : 'Most Sold' },
    { value: 'sold_asc', label: isTr ? 'En Az Satış' : 'Least Sold' },
  ];

  function toggleExpand(sku: string) {
    setExpanded((e) => (e === sku ? null : sku));
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-transparent p-4 md:p-5">
      {/* ── Tek Dış Kabuk Kartı ── */}
      <div className="flex min-h-0 flex-1 flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)]">
        
        {/* ── Üst Çubuk: İstatistik Rozetleri + Filtreler ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] p-3">
          {/* KPI Kutuları */}
          {data && (
            <div data-tour="product-analysis-kpis" className="flex flex-wrap items-center gap-1.5">
              {[
                { label: t('product_analysis_kpi_total_products'), value: data.totalCount.toLocaleString('tr-TR') },
                { label: t('product_analysis_kpi_platform_count'), value: platforms.length.toString() },
                { label: t('product_analysis_kpi_total_sold'), value: fmtShort(data.totalUnitsSoldAll) },
                { label: t('kpi_revenue'), value: fmtTry(data.totalRevenueAll) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 py-1"
                >
                  <span className="text-xs font-bold text-[var(--fg)]">{value}</span>
                  <span className="text-[10.5px] text-[var(--fg-muted)]">{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Filtreler */}
          <div data-tour="product-analysis-filters" className="flex flex-wrap items-center gap-2">
            <DateRangePicker
              value={dateRange}
              onChange={changeDateRange}
              customFrom={customFrom}
              customTo={customTo}
              onCustomChange={changeCustomDates}
              includeAll
            />

            <div className="relative">
              <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={t('product_analysis_search_placeholder')}
                className="h-8 w-48 rounded-[4px] border border-[var(--border)] bg-[var(--card)] pl-7 pr-2.5 text-xs text-[var(--fg)] outline-none transition focus:border-[var(--fg)]"
              />
            </div>

            <FilterSelect
              value={sortBy}
              options={SORT_OPTIONS}
              placeholder={isTr ? 'Sıralama' : 'Sort'}
              onChange={(val) => { setSortBy((val || 'revenue_desc') as SortOption); setPage(1); }}
              minWidth={130}
            />

            {data && (
              <ExportMenu
                filename="urun-analizi"
                columns={PRODUCT_ANALYSIS_COLS}
                totalHint={data.totalCount}
                getDataAsync={async (opts) => {
                  const res = await productApi.crossPlatform({
                    search: deferredSearch || undefined,
                    from: from || undefined,
                    to: to || undefined,
                    sortBy,
                    page: 1,
                    pageSize: opts?.limit ?? 100000,
                  });
                  return res.items.map((p: CrossPlatformProduct) => ({
                    sku: p.supplierSKU,
                    name: p.name,
                    brand: p.brand ?? '',
                    storeCount: p.storeCount,
                    basePrice: p.basePrice,
                    stock: p.stockQuantity,
                    totalSold: p.totalUnitsSold,
                    totalRevenue: p.totalRevenue,
                    topPlatform: p.topPlatform ?? '',
                  }));
                }}
              />
            )}
          </div>
        </div>

        {/* ── Ürün Listesi ── */}
        <div data-tour="product-analysis-table" className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 p-14 text-xs text-[var(--fg-muted)]">
              <Loader2 size={20} className="animate-spin text-[var(--fg)]" />
              <span>{t('loading')}</span>
            </div>
          ) : isError ? (
            <div className="p-14 text-center text-xs text-red-500">{t('product_analysis_load_error')}</div>
          ) : !data?.items.length ? (
            <div className="p-14 text-center text-xs text-[var(--fg-muted)]">
              {search
                ? (isTr ? `"${search}" ile eşleşen ürün bulunamadı.` : `No products found matching "${search}".`)
                : t('product_analysis_empty')}
            </div>
          ) : (
            <div>
              {data.items.map((product, i) => {
                const rowNum = (page - 1) * 30 + i + 1;
                return (
                  <ProductRow
                    key={product.supplierSKU}
                    product={product}
                    rowNum={rowNum}
                    isOpen={expanded === product.supplierSKU}
                    onToggle={() => toggleExpand(product.supplierSKU)}
                    fmt={fmt}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Sayfalama ── */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-2.5">
            <span className="text-[11px] text-[var(--fg-muted)]">
              {page} / {totalPages}
              <span className="ml-1 opacity-70">({data?.totalCount ?? 0} {t('product_analysis_product_unit')})</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-[11px] font-semibold text-[var(--fg)] disabled:opacity-40"
              >
                <ChevronLeft size={12} />
                <span>{t('product_analysis_prev')}</span>
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-[11px] font-semibold text-[var(--fg)] disabled:opacity-40"
              >
                <span>{t('product_analysis_next')}</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
