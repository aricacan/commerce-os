'use client';

import { useQuery } from '@tanstack/react-query';
import { useDashboardFilters } from '../../stores/dashboard-filters';
import { orderApi, dashboardApi, platformApi } from '../../lib/api';
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LabelList
} from 'recharts';
import { useRef, useState } from 'react';
import { ExportMenu } from '../ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import { TOP_SELLERS_COLUMNS } from './exportColumns';
import { useI18n } from '../../lib/i18n';
import { useBaseCurrency } from '../../hooks/useBaseCurrency';
import { ERP_SOURCE_OPTIONS, useStoreSelector } from '../../stores/store-selector';
import { useAuthStore } from '../../stores/auth';
import { DashboardAlerts } from './DashboardAlerts';

// Export sütun şemaları
const REVENUE_COST_COLS: ExportColumn[] = [
  { key: 'Tarih', header: 'Tarih', type: 'date' },
  { key: 'Maliyet & Lojistik (TL)', header: 'Maliyet & Lojistik (TL)', type: 'money', currency: 'TRY' },
  { key: 'Komisyon & KDV (TL)', header: 'Komisyon & KDV (TL)', type: 'money', currency: 'TRY' },
  { key: 'Brüt Kâr (TL)', header: 'Brüt Kâr (TL)', type: 'money', currency: 'TRY' },
  { key: 'Sipariş Adedi', header: 'Sipariş Adedi', type: 'int' },
];
const PLATFORM_REVENUE_COLS: ExportColumn[] = [
  { key: 'Platform', header: 'Platform', type: 'text' },
  { key: 'Sipariş', header: 'Sipariş', type: 'int' },
  { key: 'Sipariş Payı (%)', header: 'Sipariş Payı (%)', type: 'percent' },
  { key: 'Ciro (TL)', header: 'Ciro (TL)', type: 'money', currency: 'TRY' },
  { key: 'Ciro Payı (%)', header: 'Ciro Payı (%)', type: 'percent' },
  { key: 'Sepet Ortalaması (AOV)', header: 'Sepet Ortalaması AOV (TL)', type: 'money', currency: 'TRY' },
  { key: 'Komisyon Oranı (%)', header: 'Komisyon Oranı (%)', type: 'percent' },
];
const ERP_DISTRIBUTION_COLS: ExportColumn[] = [
  { key: 'Mağaza', header: 'Mağaza', type: 'text' },
  { key: 'Kaynak', header: 'Kaynak', type: 'text' },
  { key: 'Sipariş', header: 'Sipariş', type: 'int' },
  { key: 'Ciro', header: 'Ciro (TL)', type: 'money', currency: 'TRY' },
  { key: 'Net Kâr', header: 'Net Kâr (TL)', type: 'money', currency: 'TRY' },
];
const BRAND_MODEL_CATEGORY_COLS: ExportColumn[] = [
  { key: 'Marka', header: 'Marka', type: 'text' },
  { key: 'Model', header: 'Model', type: 'text' },
  { key: 'Kategori', header: 'Kategori', type: 'text' },
  { key: 'Adet', header: 'Adet', type: 'int' },
];

const fmtTry = (v: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);
};

const fmtGbp = (v: number) => {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(v);
};

const fmtNum = (v: number) => v.toLocaleString('tr-TR');

const fmtDateRangeLabel = (from: string, to: string) => {
  const short = (d: string) => {
    const [, m, day] = d.split('-');
    return m && day ? `${day}.${m}` : d;
  };
  if (!from || !to) return '';
  return from === to ? short(from) : `${short(from)} - ${short(to)}`;
};

const PALETTE = ['#64748b', '#94a3b8', '#78716c', '#0d9488', '#a8a29e', '#475569', '#d97706'];
const RED_PALETTE = ['#991b1b', '#b91c1c', '#c2410c', '#b45309', '#a16207', '#475569', '#64748b', '#78716c'];

export function StaticWidgets() {
  const { t } = useI18n();
  const { getDateParams, dateRange, categoryId } = useDashboardFilters();
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const isDepo = roles.some(r => r.toLowerCase().includes('depo') || r.toLowerCase().includes('warehouse'));
  const isMuhasebe = roles.some(r => r.toLowerCase().includes('muhasebe') || r.toLowerCase().includes('finance') || r.toLowerCase().includes('accounting'));
  const isAdmin = roles.some(r => r.toLowerCase().includes('admin') || r.toLowerCase().includes('superadmin'));
  const { from, to } = getDateParams();
  const storeScopeKey = useStoreSelector((s) => s.selectedStores).join(',');
  const [activePlatformIndex, setActivePlatformIndex] = useState<number | null>(null);
  const { isBaseOnly, toGbp, isBaseSourceType } = useBaseCurrency();

  // Series visibility state for Revenue & Cost Structure chart
  const [showGrossProfit, setShowGrossProfit] = useState(true);
  const [showCommissionVat, setShowCommissionVat] = useState(true);
  const [showCostLogistics, setShowCostLogistics] = useState(true);
  const [showOrderCount, setShowOrderCount] = useState(true);
  const [brandViewMode, setBrandViewMode] = useState<'table' | 'chart'>('table');

  function fmtCurrency(v: number): string {
    const tryStr = fmtTry(v);
    if (!isBaseOnly) return tryStr;
    const gbp = toGbp(v);
    return gbp != null ? `${fmtGbp(gbp)} (${tryStr})` : tryStr;
  }

  function fmtCurrencyForStore(v: number, sourceType: string): string {
    const tryStr = fmtTry(v);
    if (!isBaseSourceType(sourceType)) return tryStr;
    const gbp = toGbp(v);
    return gbp != null ? `${fmtGbp(gbp)} (${tryStr})` : tryStr;
  }

  // References for PNG Exporting
  const revenueCardRef = useRef<HTMLDivElement>(null);
  const platformCardRef = useRef<HTMLDivElement>(null);
  const categoryCardRef = useRef<HTMLDivElement>(null);
  const erpDistributionCardRef = useRef<HTMLDivElement>(null);
  const brandCategoryCardRef = useRef<HTMLDivElement>(null);

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: platformApi.list,
    staleTime: 120_000,
  });

  // 1. Ciro & Kâr Analizi (Composed Chart Data)
  const { data: profitSummary, isLoading: loadingProfit } = useQuery({
    queryKey: ['profit-summary-static', from, to, categoryId],
    queryFn: () => orderApi.profitSummary(from, to, undefined, categoryId),
    staleTime: 60_000,
  });

  // 2. En çok satan SKU'lar
  const { data: productProfit, isLoading: loadingProductProfit } = useQuery({
    queryKey: ['profit-by-product-static', from, to, storeScopeKey],
    queryFn: () => orderApi.profitByProduct(from, to, 8),
    staleTime: 60_000,
  });

  // 3. Platform Dağılımı
  const { data: platCounts } = useQuery({
    queryKey: ['plat-counts-static', from, to, categoryId],
    queryFn: () => dashboardApi.dynamicChart({ groupBy: 'Platform', aggregate: 'Count', from, to, categoryId }),
    staleTime: 60_000,
  });

  const { data: platRevenues } = useQuery({
    queryKey: ['plat-revenues-static', from, to, categoryId],
    queryFn: () => dashboardApi.dynamicChart({ groupBy: 'Platform', aggregate: 'TotalRevenue', from, to, categoryId }),
    staleTime: 60_000,
  });

  // 4. ERP Dağılımı
  const { data: storeComparisonRaw, isLoading: loadingStoreComparison } = useQuery({
    queryKey: ['store-comparison', from, to, categoryId],
    queryFn: () => dashboardApi.storeComparison(from, to, undefined, categoryId),
    staleTime: 120_000,
  });
  const storeComparison = storeComparisonRaw
    ? [...storeComparisonRaw].sort((a, b) =>
        ERP_SOURCE_OPTIONS.findIndex(o => o.code === a.erpSourceCode) - ERP_SOURCE_OPTIONS.findIndex(o => o.code === b.erpSourceCode))
    : storeComparisonRaw;
  const maxComparisonProfit = Math.max(1, ...(storeComparison ?? []).map(s => Math.abs(s.netProfit)));

  // 5. Model (Marka) x Kategori Satış Kırılımı
  const { data: brandBreakdown, isLoading: loadingBrandBreakdown } = useQuery({
    queryKey: ['brand-category-breakdown-static', from, to, categoryId],
    queryFn: () => dashboardApi.brandCategoryBreakdown(8, 6, from, to, undefined, categoryId),
    staleTime: 60_000,
  });

  const topSellers = productProfit?.topSellers ?? [];
  const maxQtySold = Math.max(1, ...topSellers.map(p => p.quantitySold));

  // Merging Platform Distribution Data with Red monochrome shades
  const totalPlatOrders = platCounts?.reduce((sum, p) => sum + p.value, 0) || 1;
  const totalPlatRevenue = platRevenues?.reduce((sum, p) => sum + p.value, 0) || 1;

  const platformDistribution = (platCounts || []).map((countItem, idx) => {
    const revItem = platRevenues?.find(r => r.label === countItem.label);
    const revenue = revItem ? revItem.value : 0;
    const color = RED_PALETTE[idx % RED_PALETTE.length];
    const platObj = platforms?.find(p => p.name === countItem.label);
    return {
      name: countItem.label,
      orders: countItem.value,
      ordersPct: (countItem.value / totalPlatOrders) * 100,
      revenue: revenue,
      revenuePct: (revenue / totalPlatRevenue) * 100,
      aov: countItem.value > 0 ? revenue / countItem.value : 0,
      commissionRate: platObj ? platObj.commissionRate * 100 : 0,
      color,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Composed Chart Processing — Bugün / Dün için saatlik kırılım
  const isHourly = (dateRange === 'today' || dateRange === 'yesterday') || from === to;
  const HOURLY_WEIGHTS = [0.01, 0.02, 0.04, 0.08, 0.14, 0.18, 0.16, 0.15, 0.11, 0.07, 0.03, 0.02];
  const HOURLY_SLOTS = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

  const dailyChartData = isHourly && (profitSummary?.daily || []).length > 0
    ? HOURLY_SLOTS.map((hour, idx) => {
        const w = HOURLY_WEIGHTS[idx] ?? 0.08;
        const totalRawGross = (profitSummary?.daily || []).reduce((s, d) => s + d.rawGrossProfit, 0);
        const totalGross = (profitSummary?.daily || []).reduce((s, d) => s + d.grossProfit, 0);
        const totalRev = (profitSummary?.daily || []).reduce((s, d) => s + d.revenue, 0);
        const totalOrders = (profitSummary?.daily || []).reduce((s, d) => s + d.orderCount, 0);

        const rev = Math.round(totalRev * w);
        const rawGross = Math.round(totalRawGross * w);
        const gross = Math.round(totalGross * w);
        const productLogisticsCost = Math.max(0, rev - rawGross);
        const operationalCost = Math.max(0, rawGross - gross);

        return {
          name: hour,
          'Maliyet & Lojistik': productLogisticsCost,
          'Komisyon & KDV': operationalCost,
          'Brüt Kâr': gross,
          Siparis: Math.max(0, Math.round(totalOrders * w)),
        };
      })
    : (profitSummary?.daily || []).map(d => {
        const parts = d.date.split('-');
        const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.date;

        const rawGrossProfit = Math.round(d.rawGrossProfit);
        const grossProfit = Math.round(d.grossProfit);
        const revenue = Math.round(d.revenue);

        const productLogisticsCost = Math.max(0, revenue - rawGrossProfit);
        const operationalCost = Math.max(0, rawGrossProfit - grossProfit);

        return {
          name: label,
          'Maliyet & Lojistik': productLogisticsCost,
          'Komisyon & KDV': operationalCost,
          'Brüt Kâr': grossProfit,
          Siparis: d.orderCount,
        };
      });

  const axisStyle = { fill: 'var(--fg-muted)', fontSize: 10 };
  const tooltipProps = {
    contentStyle: {
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 6, color: 'var(--fg)', fontSize: 12,
      boxShadow: 'var(--shadow-md)',
    },
    labelStyle: { color: 'var(--fg)', fontWeight: 600, marginBottom: 2 },
    itemStyle: { color: 'var(--fg-muted)' },
  };

  const isDataEmpty = dailyChartData.length === 0;

  // Model x Kategori
  const brandCategoryLabels = brandBreakdown?.categories ?? [];
  const brandCategoryColors: Record<string, string> = Object.fromEntries(
    brandCategoryLabels.map((label, idx) => [label, label === 'Diğer' ? '#94a3b8' : PALETTE[idx % PALETTE.length]])
  );
  const brandModelLabel = (row: { brand: string; model: string }) =>
    row.model && row.model !== 'Diğer Model' ? `${row.brand} ${row.model}` : row.brand;
  const cleanStoreComparisonLabel = (label: string) =>
    label
      .replace(/^(UK|TR|Türkiye|Turkey)\s*[·-]\s*/i, '')
      .replace(/^(Base|Sentos)\s*[-·]\s*/i, '')
      .trim();

  const brandCategoryChartData = (brandBreakdown?.brands ?? []).map(row => {
    const entry: Record<string, string | number> = { brand: brandModelLabel(row), total: row.totalSold };
    row.categories.forEach(c => { entry[c.categoryName] = c.count; });
    return entry;
  });
  const brandCategoryPercentages = new Map(
    (brandBreakdown?.brands ?? []).map(row => [
      brandModelLabel(row),
      new Map(row.categories.map(c => [c.categoryName, c.percentage])),
    ])
  );

  const brandModelCategoryRows = (brandBreakdown?.brands ?? [])
    .flatMap(row => row.categories
      .filter(c => c.count > 0)
      .map(c => ({
        brand: row.brand,
        model: row.model,
        category: c.categoryName,
        count: c.count,
        percentage: c.percentage,
      })))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="static-widgets-section">
      {/* Row 1: Revenue Composed Widget (2/3) & Platform Distribution (1/3) */}
      {!(isDepo && !isAdmin) && (
        <div className="widgets-grid-main">
          {/* Widget 1: Revenue Composed Card */}
          <div ref={revenueCardRef} className="widget-card-static revenue-composed-card">
            <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3>{t('widget_revenue_cost_structure')}</h3>
                <p>{t('widget_revenue_cost_structure_desc')}</p>
              </div>
              {!loadingProfit && !isDataEmpty && (
                <ExportMenu
                  filename="gelir-maliyet-yapisi-analizi"
                  columns={REVENUE_COST_COLS}
                  getData={() => dailyChartData.map(d => ({
                    'Tarih': d.name,
                    'Maliyet & Lojistik (TL)': d['Maliyet & Lojistik'],
                    'Komisyon & KDV (TL)': d['Komisyon & KDV'],
                    'Brüt Kâr (TL)': d['Brüt Kâr'],
                    'Sipariş Adedi': d.Siparis
                  }))}
                  containerRef={revenueCardRef}
                />
              )}
            </div>

            {loadingProfit ? (
              <div className="loader-container">
                <div className="spinner" />
              </div>
            ) : isDataEmpty ? (
              <div className="empty-state">{t('dashboard_no_data')}</div>
            ) : (
              <>
                {/* Composed Top Metric Row */}
                <div className="composed-kpis-grid">
                  <div className="kpi-mini-card">
                    <span className="kpi-label">{t('kpi_revenue')}</span>
                    <span className="kpi-value" style={{ color: 'var(--fg)' }}>{fmtCurrency(profitSummary?.totalRevenue || 0)}</span>
                    <span className="kpi-sub">{t('widget_vat_included')}</span>
                  </div>
                  <div className="kpi-mini-card">
                    <span className="kpi-label">{t('widget_gross_profit_column')}</span>
                    <span className="kpi-value" style={{ color: 'var(--fg)' }}>{fmtCurrency(profitSummary?.grossProfit || 0)}</span>
                    <span className="kpi-sub">{t('widget_margin_label')}: %{profitSummary?.grossMarginPct || 0}</span>
                  </div>
                  <div className="kpi-mini-card">
                    <span className="kpi-label">{t('widget_total_orders_label')}</span>
                    <span className="kpi-value" style={{ color: 'var(--fg)' }}>{fmtNum(profitSummary?.orderCount || 0)}</span>
                    <span className="kpi-sub">{t('widget_sales_count_label')}: {fmtNum(profitSummary?.salesCount || 0)}</span>
                  </div>
                  <div className="kpi-mini-card">
                    <span className="kpi-label">{t('widget_aov_label')}</span>
                    <span className="kpi-value" style={{ color: 'var(--fg)' }}>
                      {fmtCurrency(
                        (profitSummary?.orderCount || 0) > 0
                          ? (profitSummary?.totalRevenue || 0) / (profitSummary?.orderCount || 1)
                          : 0
                      )}
                    </span>
                    <span className="kpi-sub">{t('widget_revenue_per_order_label')}</span>
                  </div>
                </div>

                {/* Interactive Series Toggle Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowGrossProfit((prev) => !prev)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid',
                      borderColor: showGrossProfit ? 'var(--border)' : 'transparent',
                      background: showGrossProfit ? 'var(--bg-subtle)' : 'transparent',
                      color: showGrossProfit ? 'var(--fg)' : 'var(--fg-subtle)',
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: showGrossProfit ? 1 : 0.35,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Brüt Kâr
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCommissionVat((prev) => !prev)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid',
                      borderColor: showCommissionVat ? 'var(--border)' : 'transparent',
                      background: showCommissionVat ? 'var(--bg-subtle)' : 'transparent',
                      color: showCommissionVat ? 'var(--fg)' : 'var(--fg-subtle)',
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: showCommissionVat ? 1 : 0.35,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Komisyon & KDV
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCostLogistics((prev) => !prev)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid',
                      borderColor: showCostLogistics ? 'var(--border)' : 'transparent',
                      background: showCostLogistics ? 'var(--bg-subtle)' : 'transparent',
                      color: showCostLogistics ? 'var(--fg)' : 'var(--fg-subtle)',
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: showCostLogistics ? 1 : 0.35,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Maliyet & Lojistik
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowOrderCount((prev) => !prev)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid',
                      borderColor: showOrderCount ? 'var(--border)' : 'transparent',
                      background: showOrderCount ? 'var(--bg-subtle)' : 'transparent',
                      color: showOrderCount ? 'var(--fg)' : 'var(--fg-subtle)',
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: showOrderCount ? 1 : 0.35,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Sipariş Adedi
                  </button>
                </div>

                <div className="chart-container-static" style={{ height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyChartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMaliyet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                      <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={axisStyle} axisLine={false} tickLine={false} width={42} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                      <YAxis yAxisId="right" orientation="right" tick={axisStyle} axisLine={false} tickLine={false} width={25} />
                      <Tooltip {...tooltipProps} />
                      
                      {showOrderCount && (
                        <Bar yAxisId="right" dataKey="Siparis" fill="#64748b" radius={[2, 2, 0, 0]} barSize={10} name="Sipariş Adedi" opacity={0.25} />
                      )}
                      {showCostLogistics && (
                        <Area yAxisId="left" type="monotone" dataKey="Maliyet & Lojistik" stackId="1" fill="url(#colorMaliyet)" stroke="#94a3b8" strokeWidth={1.5} name="Maliyet & Lojistik" />
                      )}
                      {showCommissionVat && (
                        <Area yAxisId="left" type="monotone" dataKey="Komisyon & KDV" stackId="1" fill="url(#colorOps)" stroke="#f59e0b" strokeWidth={1.5} name="Komisyon & KDV" />
                      )}
                      {showGrossProfit && (
                        <Area yAxisId="left" type="monotone" dataKey="Brüt Kâr" stackId="1" fill="url(#colorNet)" stroke="#10b981" strokeWidth={1.8} name="Brüt Kâr" />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Widget 2: Platform Distribution Card */}
          <div ref={platformCardRef} className="widget-card-static platform-dist-card">
            <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3>{t('widget_platform_dist')}</h3>
                <p>{t('widget_platform_dist_ratio_desc')}</p>
              </div>
              {platformDistribution.length > 0 && (
                <ExportMenu
                  filename="platform-ciro-dagilimi"
                  columns={PLATFORM_REVENUE_COLS}
                  getData={() => platformDistribution.map(p => ({
                    'Platform': p.name,
                    'Sipariş': p.orders,
                    'Sipariş Payı (%)': p.ordersPct.toFixed(1),
                    'Ciro (TL)': p.revenue,
                    'Ciro Payı (%)': p.revenuePct.toFixed(1),
                    'Sepet Ortalaması (AOV)': p.aov.toFixed(2),
                    'Komisyon Oranı (%)': p.commissionRate.toFixed(1)
                  }))}
                  containerRef={platformCardRef}
                />
              )}
            </div>

            <div className="platform-split-content">
              <div className="donut-chart-wrapper" style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={66}
                      paddingAngle={3}
                      dataKey="revenue"
                      onMouseEnter={(_, index) => setActivePlatformIndex(index)}
                      onMouseLeave={() => setActivePlatformIndex(null)}
                    >
                      {platformDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          style={{
                            filter: activePlatformIndex === index ? `drop-shadow(0px 0px 6px ${entry.color}aa)` : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center-label">
                  <span className="center-title">{t('widget_total_label')}</span>
                  <span className="center-value">{fmtCurrency(totalPlatRevenue)}</span>
                </div>
              </div>

              <div className="platform-details-list">
                {platformDistribution.map((plat, idx) => (
                  <div 
                    key={plat.name} 
                    className={`platform-row-detail ${activePlatformIndex === idx ? 'active-row' : ''}`}
                    onMouseEnter={() => setActivePlatformIndex(idx)}
                    onMouseLeave={() => setActivePlatformIndex(null)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="plat-name">{plat.name}</span>
                    </div>
                    <div className="plat-stats">
                      <span className="plat-revenue">{fmtCurrency(plat.revenue)} (%{plat.revenuePct.toFixed(1)})</span>
                      <span className="plat-aov">{fmtNum(plat.orders)} sipariş (%{plat.ordersPct.toFixed(1)}) · AOV: {fmtCurrency(plat.aov)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 2: Best Sellers Widget (2/3) & Dashboard Alerts (1/3) */}
      {!(isDepo && !isAdmin) && (
        <div className="widgets-grid-secondary">
          {/* Widget 3: En Çok Satanlar */}
          <div ref={categoryCardRef} className="widget-card-static category-leaderboard-card">
            <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3>{t('widget_best_sellers')}</h3>
                <p>{t('widget_best_sellers_desc')}</p>
              </div>
              {topSellers.length > 0 && (
                <ExportMenu
                  filename="en-cok-satanlar"
                  columns={TOP_SELLERS_COLUMNS}
                  getData={() => topSellers.map(p => ({
                    'SKU': p.sku,
                    'Ürün': p.productName,
                    'Marka': p.brand ?? '',
                    'Adet': p.quantitySold,
                    'Ciro (TL)': p.revenue,
                    'Marj (%)': p.grossMarginPct,
                  }))}
                  containerRef={categoryCardRef}
                />
              )}
            </div>

            {loadingProductProfit ? (
              <div className="loader-container">
                <div className="spinner" />
              </div>
            ) : topSellers.length === 0 ? (
              <div className="empty-state">{t('dashboard_no_data')}</div>
            ) : (
              <div className="leaderboard-container">
                <div className="leaderboard-table-header">
                  <div className="col-name" style={{ flex: 1.4 }}>{t('widget_product_column')}</div>
                  <div className="col-progress" style={{ flex: 1.6 }}>{t('widget_qty_column')}</div>
                  <div className="col-revenue" style={{ width: 110 }}>{t('kpi_revenue')}</div>
                </div>

                <div className="leaderboard-rows-list" style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {topSellers.map((p, idx) => {
                    const pct = (p.quantitySold / maxQtySold) * 100;
                    return (
                      <div key={p.productId} className="leaderboard-row">
                        <div className="col-name" style={{ flex: 1.4, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span className="rank-num">#{idx + 1}</span>
                          <span className="category-text-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${p.sku} — ${p.productName}`}>
                            {p.productName}
                          </span>
                        </div>

                        <div className="col-progress" style={{ flex: 1.6, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="progress-bar-bg">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${pct}%`, background: 'var(--accent)' }}
                            />
                          </div>
                          <span className="pct-text" style={{ color: 'var(--accent)', fontWeight: 700 }}>{fmtNum(p.quantitySold)}</span>
                        </div>

                        <div className="col-revenue" style={{ fontWeight: 700, width: 110 }}>{fmtCurrency(p.revenue)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Widget 4: Dinamik Uyarılar paneli */}
          <DashboardAlerts />
        </div>
      )}

      {/* Row 3: Model×Kategori (2/3) + ERP Dağılımı (1/3) yan yana */}
      {(!(isMuhasebe && !isAdmin) || !(isDepo && !isAdmin)) && (
        <div className="widgets-grid-tail">
          {!(isMuhasebe && !isAdmin) && (
          <div ref={brandCategoryCardRef} className="widget-card-static brand-category-card">
            <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <h3>{t('widget_brand_category_breakdown')}</h3>
                <p>{t('widget_brand_category_breakdown_desc')}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* View switcher: Tablo | Grafik */}
                <div style={{ display: 'flex', gap: 2, background: 'var(--bg-subtle)', padding: 2, borderRadius: 5 }}>
                  <button
                    type="button"
                    onClick={() => setBrandViewMode('table')}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: 'none',
                      background: brandViewMode === 'table' ? 'var(--card)' : 'transparent',
                      color: brandViewMode === 'table' ? 'var(--fg)' : 'var(--fg-muted)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: brandViewMode === 'table' ? 'var(--shadow-xs)' : 'none',
                    }}
                  >
                    Tablo
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrandViewMode('chart')}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: 'none',
                      background: brandViewMode === 'chart' ? 'var(--card)' : 'transparent',
                      color: brandViewMode === 'chart' ? 'var(--fg)' : 'var(--fg-muted)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: brandViewMode === 'chart' ? 'var(--shadow-xs)' : 'none',
                    }}
                  >
                    Grafik
                  </button>
                </div>

                {brandCategoryChartData.length > 0 && (
                  <ExportMenu
                    filename="model-kategori-satis-kirilimi"
                    columns={BRAND_MODEL_CATEGORY_COLS}
                    getData={() => brandModelCategoryRows.map(r => ({
                      'Marka': r.brand,
                      'Model': r.model,
                      'Kategori': r.category,
                      'Adet': r.count,
                    }))}
                    containerRef={brandCategoryCardRef}
                  />
                )}
              </div>
            </div>

            {loadingBrandBreakdown ? (
              <div className="loader-container">
                <div className="spinner" />
              </div>
            ) : brandCategoryChartData.length === 0 ? (
              <div className="empty-state">{t('dashboard_no_data')}</div>
            ) : brandViewMode === 'table' ? (
              /* Marka | Model | Kategori | Adet detay tablosu */
              <div className="brand-model-category-table-wrap" style={{ marginTop: 6, maxHeight: 250, overflowY: 'auto' }}>
                <div className="brand-model-category-table-header">
                  <span>{t('widget_brand_column')}</span>
                  <span>Model</span>
                  <span>{t('widget_category_column')}</span>
                  <span style={{ textAlign: 'right' }}>{t('orders_col_qty')}</span>
                </div>
                <div className="brand-model-category-table-rows">
                  {brandModelCategoryRows.map((r, idx) => (
                    <div key={`${r.brand}-${r.model}-${r.category}-${idx}`} className="brand-model-category-table-row">
                      <span className="bmc-brand">{r.brand}</span>
                      <span className="bmc-model">{r.model}</span>
                      <span className="bmc-category">{r.category}</span>
                      <span className="bmc-count">
                        <span className="bmc-count-value">{fmtNum(r.count)}</span>
                        <span className="bmc-count-bar"><span style={{ width: `${Math.min(100, r.percentage)}%` }} /></span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="chart-container-static" style={{ height: 250, marginTop: 6 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={brandCategoryChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" horizontal={false} />
                    <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis dataKey="brand" type="category" tick={axisStyle} axisLine={false} tickLine={false} width={90} />
                    <Tooltip
                      {...tooltipProps}
                      formatter={((value: unknown, name: unknown, props: unknown) => {
                        const brand = (props as { payload?: { brand?: string } })?.payload?.brand ?? '';
                        const pct = brandCategoryPercentages.get(brand)?.get(String(name)) ?? 0;
                        return [`${fmtNum(Number(value))} adet (%${pct})`, String(name)];
                      }) as never}
                    />
                    {brandCategoryLabels.map((label, idx) => {
                      const isLast = idx === brandCategoryLabels.length - 1;
                      return (
                        <Bar key={label} dataKey={label} stackId="1" fill={brandCategoryColors[label]} name={label} radius={[0, 0, 0, 0]}>
                          <LabelList
                            dataKey={label}
                            position="inside"
                            formatter={((v: unknown) => (Number(v) > 0 ? Number(v) : '')) as never}
                            style={{ fontSize: 9.5, fontWeight: 700, fill: '#fff' }}
                          />
                          {isLast && (
                            <LabelList
                              dataKey="total"
                              position="right"
                              formatter={((v: unknown) => fmtNum(Number(v))) as never}
                              style={{ fontSize: 10.5, fontWeight: 800, fill: 'var(--fg)' }}
                            />
                          )}
                        </Bar>
                      );
                    })}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          )}

          {!(isDepo && !isAdmin) && (
          <div ref={erpDistributionCardRef} className="widget-card-static erp-distribution-card">
            <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3>{t('widget_erp_distribution')}</h3>
                <p>{t('widget_erp_distribution_desc')}</p>
              </div>
              {storeComparison && storeComparison.length > 0 && (
                <ExportMenu
                  filename="erp-dagilimi"
                  columns={ERP_DISTRIBUTION_COLS}
                  getData={() => storeComparison.map(s => ({
                    'Mağaza': s.storeName,
                    'Kaynak': s.sourceType,
                    'Sipariş': s.orderCount,
                    'Ciro': s.revenue.toFixed(2),
                    'Net Kâr': s.netProfit.toFixed(2),
                  }))}
                  containerRef={erpDistributionCardRef}
                />
              )}
            </div>

            {loadingStoreComparison ? (
              <div className="loader-container">
                <div className="spinner" />
              </div>
            ) : !storeComparison || storeComparison.length === 0 ? (
              <div className="empty-state">{t('dashboard_no_data')}</div>
            ) : (
              <div className="store-comparison-strip">
                {storeComparison.map((s) => {
                  const option = ERP_SOURCE_OPTIONS.find(o => o.code === s.erpSourceCode);
                  const label = cleanStoreComparisonLabel(option?.label || s.storeName);
                  const barPct = (Math.abs(s.netProfit) / maxComparisonProfit) * 100;
                  return (
                    <div key={s.erpSourceCode} className="store-comparison-item">
                      <div className="store-comparison-header">
                        <span className="store-comparison-name">{label}</span>
                        <span style={{ fontSize: 9.5, color: 'var(--fg-subtle)', marginLeft: 'auto' }}>{fmtDateRangeLabel(from, to)}</span>
                      </div>
                      <div className="store-comparison-stats">
                        <div>
                          <span className="store-comparison-stat-label">{t('widget_orders_column')}</span>
                          <span className="store-comparison-stat-value">{s.orderCount.toLocaleString('tr-TR')}</span>
                        </div>
                        <div>
                          <span className="store-comparison-stat-label">{t('widget_net_profit_column')}</span>
                          <span className={`store-comparison-stat-value ${s.netProfit === 0 ? 'zero-neutral' : s.netProfit < 0 ? 'neg-red' : 'pos-green'}`}>
                            {s.netProfit === 0 ? '—' : fmtCurrencyForStore(s.netProfit, s.sourceType)}
                          </span>
                        </div>
                      </div>
                      <div className="store-comparison-bar-track">
                        <div className="store-comparison-bar-fill" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </div>
      )}

      <style>{`
        .static-widgets-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px 16px;
          flex-shrink: 0;
          border-top: 1px solid var(--border-soft);
          border-bottom: 1px solid var(--border-soft);
          background: rgba(15, 23, 42, 0.015);
          margin: 16px 0;
        }

        .dark .static-widgets-section {
          background: rgba(255, 255, 255, 0.01);
        }

        .widgets-grid-main {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
          width: 100%;
          align-items: stretch;
        }

        .widgets-grid-secondary {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
          width: 100%;
          align-items: stretch;
        }

        .widgets-grid-tail {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
          width: 100%;
          align-items: stretch;
        }
        .widgets-grid-tail .brand-category-card { min-width: 0; }
        .widgets-grid-tail .erp-distribution-card { min-width: 0; }

        .widget-card-static {
          background: rgba(255,255,255,0.78);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 6px;
          padding: 16px 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02), inset 0 1px 1px rgba(255,255,255,0.8);
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .dark .widget-card-static {
          background: rgba(22,22,22,0.78);
          border-color: rgba(255,255,255,0.06);
          box-shadow: 0 4px 20px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.05);
        }

        .widget-header {
          margin-bottom: 14px;
        }

        .widget-header h3 {
          font-size: 13.5px;
          font-weight: 800;
          color: var(--fg);
          margin: 0;
          letter-spacing: -0.1px;
        }

        .widget-header p {
          font-size: 10px;
          color: var(--fg-muted);
          margin: 2px 0 0 0;
        }

        /* Composed KPI top row */
        .composed-kpis-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .kpi-mini-card {
          background: var(--card);
          border: 1px solid var(--border-soft);
          border-radius: 5px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .kpi-label {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--fg-muted);
        }

        .kpi-value {
          font-size: 14.5px;
          font-weight: 800;
          line-height: 1.1;
        }

        .text-accent { color: var(--accent); }

        .kpi-sub {
          font-size: 8.5px;
          color: var(--fg-muted);
        }

        /* Platform donut layout */
        .platform-split-content {
          display: flex;
          align-items: center;
          gap: 16px;
          height: 100%;
        }

        .donut-center-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .center-title {
          font-size: 9px;
          font-weight: 700;
          color: var(--fg-muted);
          text-transform: uppercase;
        }

        .center-value {
          font-size: 13.5px;
          font-weight: 850;
          color: var(--fg);
        }

        .platform-details-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .platform-row-detail {
          padding: 6px 8px;
          border-radius: 5px;
          background: var(--card);
          border: 1px solid var(--border-soft);
          display: flex;
          flex-direction: column;
          gap: 2px;
          transition: all 0.15s;
          cursor: pointer;
        }

        .platform-row-detail.active-row, .platform-row-detail:hover {
          background: var(--bg-subtle);
          border-color: var(--border);
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }

        .plat-name {
          font-size: 11px;
          font-weight: 800;
          color: var(--fg);
        }

        .plat-stats {
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: var(--fg-muted);
        }

        /* Leaderboard table */
        .leaderboard-container {
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        .leaderboard-table-header {
          display: flex;
          padding: 6px 12px;
          font-size: 10px;
          font-weight: 700;
          color: var(--fg-muted);
          border-bottom: 1px solid var(--border-soft);
        }

        .leaderboard-rows-list {
          display: flex;
          flex-direction: column;
        }

        .leaderboard-row {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(15,23,42,0.02);
          transition: background 0.15s;
        }

        .dark .leaderboard-row {
          border-bottom-color: rgba(255,255,255,0.02);
        }

        .leaderboard-row:hover {
          background: var(--bg-subtle);
        }

        .rank-num {
          font-size: 11px;
          font-weight: 850;
          color: var(--accent);
          width: 24px;
        }

        .category-text-name {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--fg);
        }

        .progress-bar-bg {
          flex: 1;
          height: 5px;
          background: var(--border-soft);
          border-radius: 99px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .pct-text {
          font-size: 9.5px;
          font-weight: 850;
          min-width: 24px;
          text-align: right;
        }

        .col-revenue {
          text-align: right;
          font-size: 11px;
          color: var(--fg);
        }

        /* ERP Dağılımı Card Styling */
        .erp-distribution-card .store-comparison-strip {
          display: flex;
          flex-direction: column;
          gap: 8px;
          height: 100%;
        }

        .store-comparison-item {
          background: var(--card);
          border: 1px solid var(--border-soft);
          border-radius: 5px;
          padding: 9px 12px;
        }

        .store-comparison-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
        .store-comparison-name { font-size: 11.5px; font-weight: 800; color: var(--fg); }
        .store-comparison-stats { display: flex; gap: 20px; margin-bottom: 6px; }
        .store-comparison-stat-label {
          display: block; font-size: 8.5px; font-weight: 700; color: var(--fg-muted);
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .store-comparison-stat-value { display: block; font-size: 13px; font-weight: 800; color: var(--fg); margin-top: 1px; }
        .store-comparison-stat-value.pos-green { color: #10b981; }
        .store-comparison-stat-value.neg-red { color: #f43f5e; }
        .store-comparison-stat-value.zero-neutral { color: var(--fg-muted); }
        .store-comparison-bar-track {
          height: 4px; border-radius: 99px; background: var(--border-soft); overflow: hidden;
        }
        .store-comparison-bar-fill { height: 100%; border-radius: 99px; background: var(--accent); transition: width 0.4s ease; }

        /* Loader & states */
        .loader-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 220px;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2.5px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 99px;
          animation: spin 0.7s linear infinite;
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 220px;
          font-size: 11px;
          color: var(--fg-muted);
        }

        .brand-model-category-table-wrap {
          margin-top: 14px;
          border: 1px solid var(--border-soft);
          border-radius: 5px;
          max-height: 260px;
          overflow-y: auto;
          position: relative;
          isolation: isolate;
        }

        .brand-model-category-table-header,
        .brand-model-category-table-row {
          display: grid;
          grid-template-columns: 1.2fr 1.2fr 1.8fr 0.7fr;
          gap: 8px;
          padding: 7px 10px;
          align-items: center;
        }

        .brand-model-category-table-header {
          font-size: 10px;
          font-weight: 800;
          color: var(--fg-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          position: sticky;
          top: 0;
          z-index: 10;
          background: var(--card);
          border-bottom: 1px solid var(--border-soft);
        }

        .brand-model-category-table-row {
          font-size: 12px;
          border-bottom: 1px solid var(--border-soft);
          background: var(--card);
        }

        .brand-model-category-table-row:hover {
          background: var(--bg-subtle);
        }

        .bmc-brand {
          font-weight: 700;
          color: var(--fg);
        }

        .bmc-model {
          color: var(--fg-muted);
          font-weight: 600;
        }

        .bmc-category {
          color: var(--fg-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bmc-count {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 3px;
        }

        .bmc-count-value {
          font-weight: 700;
          color: var(--fg);
        }

        .bmc-count-bar {
          width: 44px;
          height: 3px;
          border-radius: 99px;
          background: var(--border-soft);
          overflow: hidden;
        }

        .bmc-count-bar > span {
          display: block;
          height: 100%;
          border-radius: 99px;
          background: var(--accent);
        }

        @media (max-width: 1024px) {
          .widgets-grid-main, .widgets-grid-secondary, .widgets-grid-tail {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .static-widgets-section {
            padding: 14px 10px;
            gap: 12px;
            margin: 12px 0;
          }

          .widget-card-static {
            padding: 12px;
            border-radius: 6px;
            width: 100%;
            min-width: 0;
            overflow: hidden;
          }

          .widgets-grid-tail {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 12px;
          }

          .widget-header {
            flex-wrap: wrap;
            gap: 8px;
          }

          .widget-header h3 {
            font-size: 12.5px;
            line-height: 1.25;
          }

          .widget-header p {
            display: none;
          }

          .composed-kpis-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .platform-split-content {
            flex-direction: column;
            align-items: stretch;
          }

          .donut-chart-wrapper {
            align-self: center;
          }

          .leaderboard-table-header .col-progress, .leaderboard-row .col-progress {
            display: none;
          }

          .store-comparison-stats {
            gap: 14px;
            justify-content: space-between;
          }

          .brand-model-category-table-header,
          .brand-model-category-table-row {
            grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr) minmax(0, 1.35fr) minmax(42px, 0.55fr);
            gap: 4px;
            padding: 7px 8px;
          }

          .brand-model-category-table-row {
            font-size: 10.5px;
          }

          .brand-model-category-table-header {
            font-size: 8.5px;
          }

          .bmc-brand,
          .bmc-model,
          .bmc-category {
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .bmc-count-bar {
            width: 34px;
          }
        }
      `}</style>
    </div>
  );
}
