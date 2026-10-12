'use client';

import { useMemo, useState } from 'react';
import { useMobile } from '../../hooks/useMobile';
import { Skeleton, SkeletonList } from '../ui/Skeleton';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { logisticsApi, platformApi, categoryApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { resolveDatePreset, type DatePreset } from '../../utils/date';
import { DateRangePicker } from '../ui/DateRangePicker';
import { FilterSelect, type FilterSelectOption } from '../ui/FilterSelect';
import { Warehouse, RefreshCw } from 'lucide-react';

const MapChart = dynamic(() => import('./MapChart'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--fg)]" />
    </div>
  ),
});

type ViewMode = 'city' | 'platform' | 'warehouse';
type ErpCountryFilter = 'all' | 'base' | 'sentos';
const ERP_COUNTRY_STORE_CODES: Record<ErpCountryFilter, string | undefined> = {
  all: undefined,
  base: 'base-storea,base-storeb',
  sentos: 'storea-sentos,storeb-sentos',
};

function fmt(n: number) {
  if (n >= 1_000_000) return '₺' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return '₺' + (n / 1_000).toFixed(1) + 'K';
  return '₺' + n.toLocaleString('tr-TR');
}

export function LogisticsMapView() {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const isMobile = useMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('city');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [platformId, setPlatformId] = useState<number | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [erpCountry, setErpCountry] = useState<ErpCountryFilter>('all');
  const { from, to } = resolveDatePreset(datePreset, customFrom, customTo);
  const storeCode = ERP_COUNTRY_STORE_CODES[erpCountry];

  const { data: platforms } = useQuery({ queryKey: ['platforms'], queryFn: platformApi.list, staleTime: 300_000 });
  const { data: categories } = useQuery({ queryKey: ['categories-master'], queryFn: categoryApi.master, staleTime: 300_000 });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['logistics-map', from, to, platformId, categoryId, storeCode],
    queryFn: () => logisticsApi.map(from, to, platformId, categoryId, storeCode),
    staleTime: 120_000,
  });

  const activeData = viewMode === 'city'
    ? (data?.ordersByCity ?? [])
    : viewMode === 'platform'
      ? (data?.platformMarkers ?? [])
      : [];
  const totalOrders = activeData.reduce((s, d) => s + d.count, 0);
  const totalRevenue = activeData.reduce((s, d) => s + d.revenue, 0);
  const topItem = activeData[0];

  const stats = [
    {
      label: viewMode === 'city' ? t('logistics_kpi_city_orders') : viewMode === 'platform' ? t('logistics_kpi_platform_orders') : t('logistics_kpi_warehouse_count'),
      value: viewMode === 'warehouse' ? String(data?.warehouses.length ?? 0) : String(totalOrders),
    },
    {
      label: viewMode === 'warehouse' ? t('logistics_kpi_active_warehouses') : t('logistics_kpi_revenue'),
      value: viewMode === 'warehouse' ? String(data?.warehouses.filter(w => w.lat !== 0 || w.lng !== 0).length ?? 0) : fmt(totalRevenue),
    },
    {
      label: viewMode === 'city' ? t('logistics_kpi_city_count') : viewMode === 'platform' ? t('logistics_kpi_platform_count') : t('logistics_kpi_integration'),
      value: viewMode === 'warehouse' ? t('logistics_integration') : String(activeData.length),
    },
    {
      label: viewMode === 'city' ? t('logistics_kpi_top_city') : viewMode === 'platform' ? t('logistics_kpi_top_platform') : t('logistics_kpi_primary_warehouse'),
      value: viewMode === 'warehouse'
        ? (data?.warehouses[0]?.name ?? '—')
        : topItem
          ? (viewMode === 'city' ? (topItem as { city: string }).city : (topItem as { platform: string }).platform)
          : '—',
    },
  ];

  const VIEW_MODES: { id: ViewMode; label: string }[] = [
    { id: 'city', label: isTr ? 'Şehirler' : 'Cities' },
    { id: 'platform', label: isTr ? 'Pazaryerleri' : 'Platforms' },
    { id: 'warehouse', label: isTr ? 'Depolar' : 'Warehouses' },
  ];

  const mapTitle = viewMode === 'city'
    ? t('logistics_map_delivery_points')
    : viewMode === 'platform'
      ? t('logistics_map_platform_dist')
      : t('logistics_map_warehouse_locations');

  const rankingTitle = viewMode === 'city'
    ? t('logistics_city_ranking')
    : viewMode === 'platform'
      ? t('logistics_platform_ranking')
      : t('logistics_warehouse_list');

  const platformOptions: FilterSelectOption[] = useMemo(() => (
    (platforms ?? [])
      .filter((p) => p.name !== 'Sentos')
      .map((p) => ({ value: String(p.id), label: p.name }))
  ), [platforms]);

  const categoryOptions: FilterSelectOption[] = useMemo(() => (
    (categories ?? []).map((c) => ({ value: String(c.id), label: c.name }))
  ), [categories]);

  const erpOptions: FilterSelectOption[] = useMemo(() => [
    { value: 'sentos', label: 'Sentos (TR)' },
    { value: 'base', label: 'Base (UK)' },
  ], []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent p-3 md:p-4">
      {/* ── Üst Araç Çubuğu: KPI + Filtreler ── */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5 rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] p-2.5">
        {/* KPI Kutuları */}
        <div data-tour="logistics-kpis" className="flex flex-wrap items-center gap-1.5">
          {stats.map(({ label, value }) => (
            <div
              key={label}
              className="inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 py-1"
            >
              {isLoading ? (
                <Skeleton height={14} width={36} />
              ) : (
                <span className="text-xs font-bold text-[var(--fg)]">{value}</span>
              )}
              <span className="text-[10.5px] text-[var(--fg-muted)]">{label}</span>
            </div>
          ))}
        </div>

        {/* Filtreler ve Görünüm Seçici */}
        <div data-tour="logistics-filters" className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            value={datePreset}
            onChange={setDatePreset}
            customFrom={customFrom}
            customTo={customTo}
            onCustomChange={(f, t2) => { setCustomFrom(f); setCustomTo(t2); setDatePreset('custom'); }}
            includeAll
          />

          <FilterSelect
            value={platformId ? String(platformId) : ''}
            options={platformOptions}
            placeholder={t('filter_all_platforms')}
            onChange={(val) => setPlatformId(val ? Number(val) : undefined)}
            minWidth={130}
          />

          <FilterSelect
            value={categoryId ? String(categoryId) : ''}
            options={categoryOptions}
            placeholder={t('orders_all_categories')}
            onChange={(val) => setCategoryId(val ? Number(val) : undefined)}
            minWidth={140}
          />

          <FilterSelect
            value={erpCountry === 'all' ? '' : erpCountry}
            options={erpOptions}
            placeholder={t('orders_filter_all')}
            onChange={(val) => setErpCountry((val || 'all') as ErpCountryFilter)}
            minWidth={120}
          />

          {/* Görünüm Butonları */}
          <div data-tour="logistics-views" className="inline-flex rounded-[4px] border border-[var(--border)] bg-[var(--card)] p-0.5">
            {VIEW_MODES.map(({ id, label }) => {
              const active = viewMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setViewMode(id)}
                  className={`rounded-[3px] px-2.5 py-1 text-[11px] font-bold transition ${
                    active
                      ? 'bg-[var(--fg)] text-[var(--card)] shadow-sm'
                      : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Harita ve Sağ Panel ── */}
      <div className={`flex min-h-0 flex-1 gap-2.5 ${isMobile ? 'flex-col overflow-y-auto' : 'flex-row overflow-hidden'}`}>
        {/* Harita Kartı */}
        <div data-tour="logistics-map" className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-soft)] px-3 py-2">
            <span className="text-xs font-bold text-[var(--fg)]">{mapTitle}</span>
            {viewMode !== 'warehouse' && (
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--fg-muted)]">
                <span>{t('logistics_legend_density_low')}</span>
                <div className="h-2 w-12 rounded-[2px] bg-gradient-to-r from-[var(--fg-muted)]/20 to-[var(--fg)]" />
                <span>{t('logistics_legend_density_high')}</span>
              </div>
            )}
          </div>

          {isError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
              <p className="text-xs text-red-500">{t('logistics_map_error')}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex h-7 items-center gap-1 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--card)]"
              >
                <RefreshCw size={12} />
                <span>{t('try_again')}</span>
              </button>
            </div>
          ) : (
            <div className="relative min-h-[320px] flex-1">
              <MapChart
                orders={data?.ordersByCity ?? []}
                platforms={data?.platformMarkers ?? []}
                warehouses={data?.warehouses ?? []}
                loading={isLoading}
                viewMode={viewMode}
              />
            </div>
          )}
        </div>

        {/* Sağ Sıralama Paneli */}
        <div data-tour="logistics-details" className={`flex shrink-0 flex-col overflow-hidden rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] ${isMobile ? 'w-full' : 'w-64'}`}>
          <div className="shrink-0 border-b border-[var(--border-soft)] px-3 py-2">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              {rankingTitle}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {isLoading ? (
              <SkeletonList count={6} rowHeight={42} className="px-2 py-1" />
            ) : viewMode === 'warehouse' ? (
              (data?.warehouses ?? []).length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--fg-muted)]">
                  {t('logistics_no_warehouses')}
                </div>
              ) : (
                (data?.warehouses ?? []).map((w) => {
                  const hasCoords = w.lat !== 0 || w.lng !== 0;
                  return (
                    <div key={w.id} className="flex items-center gap-2 rounded-[4px] p-2 hover:bg-[var(--bg-subtle)]">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg)]">
                        <Warehouse size={12} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[var(--fg)]">{w.name}</p>
                        <p className="text-[10.5px] text-[var(--fg-muted)]">
                          {hasCoords ? w.city : t('logistics_no_location')}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--fg-muted)]">{t('logistics_integration')}</span>
                    </div>
                  );
                })
              )
            ) : activeData.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--fg-muted)]">
                {viewMode === 'city' ? t('logistics_no_city_data') : t('logistics_no_platform_data')}
              </div>
            ) : (
              activeData.slice(0, 25).map((d, idx) => {
                const label = viewMode === 'city' ? (d as { city: string }).city : (d as { platform: string }).platform;
                const pct = activeData[0]?.count ? (d.count / activeData[0].count) * 100 : 0;
                return (
                  <div key={label} className="rounded-[4px] p-1.5 transition hover:bg-[var(--bg-subtle)]">
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] text-[9.5px] font-bold ${
                          idx === 0
                            ? 'bg-[var(--fg)] text-[var(--card)]'
                            : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="truncate text-xs font-semibold text-[var(--fg)]" title={label}>{label}</span>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-[var(--fg)]">{d.count}</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className="h-full bg-[var(--fg)] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right font-mono text-[10px] text-[var(--fg-muted)]">{fmt(d.revenue)}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
