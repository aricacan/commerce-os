'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Grid3x3, ChevronRight } from 'lucide-react';
import { orderApi, financeApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { localDateStr } from '../../utils/date';
import type { DailyProfit } from '../../types/api';
import { useDashboardFilters } from '../../stores/dashboard-filters';
import { useStoreSelector } from '../../stores/store-selector';
import { useAppsLauncher } from '../../stores/apps-launcher';
import { useBaseCurrency } from '../../hooks/useBaseCurrency';
import { ExportMenu } from '../ui/ExportMenu';
import { Sparkline } from '../ui/Sparkline';
import type { ExportColumn } from '../../lib/export';
import { useAuthStore } from '../../stores/auth';
import { SITEHUB_DASHBOARD_ROLES } from '../../lib/sitehub/roles';
import { CountryComparison } from './CountryComparison';
import { AdsHubSummaryCard } from './AdsHubSummaryCard';
import { OmnichannelSummaryCard } from './OmnichannelSummaryCard';
import { SiteHubSummaryCard } from './SiteHubSummaryCard';
import { RadarSummaryCard } from './RadarSummaryCard';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { DeferredKpiTrendChart } from './DeferredKpiTrendChart';

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('tr-TR');
}

function abbrevCurrency(n: number, symbol: string): string {
  if (Math.abs(n) >= 1_000_000) return symbol + (n / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(n) >= 1_000) return symbol + (n / 1_000).toFixed(1) + 'K';
  return symbol + n.toLocaleString('tr-TR');
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// "YYYY-MM-DD" -> "GG.AA", tek günlük aralıkta tek tarih, aksi halde "GG.AA - GG.AA" —
// kart arka yüzündeki grafik başlığı artık bunu kullanıyor (eskiden sabit "Bu Hafta" yazıyordu).
function fmtRangeLabel(from: string, to: string): string {
  const short = (d: string) => {
    const [, m, day] = d.split('-');
    return m && day ? `${day}.${m}` : d;
  };
  if (!from || !to) return '';
  return from === to ? short(from) : `${short(from)} - ${short(to)}`;
}

function abbrevValTable(n: number, symbol: string): string {
  if (n === 0) return '0' + symbol;
  const str = n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toLocaleString('tr-TR');
  return str + symbol;
}

// ─── Back face large chart ────────────────────────────────────────────────────

function KpiBackChart({
  chartData, color, label, dateRangeLabel,
}: {
  chartData: { label: string; value: number }[];
  color: string;
  label: string;
  dateRangeLabel: string;
}) {
  const { t } = useI18n();
  if (!chartData.length) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t('no_data')}</span>
      </div>
    );
  }
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '10px 12px 8px' }}>
      <span style={{ fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
        {label} — {dateRangeLabel}
      </span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkline data={chartData.map((point) => point.value)} color={color} />
      </div>
    </div>
  );
}

// ─── Flip KPI Card ────────────────────────────────────────────────────────────

interface KpiCardProps {
  labelKey: string;
  accent: string;
  value: string;
  delta: number | null;
  sparkline?: number[];
  chartData?: { label: string; value: number }[];
  isLoading: boolean;
  delay: number;
  // Arka yüzdeki grafik başlığında gösterilen aralık ("13.07 - 13.08" gibi) — üstteki
  // tarih filtresinden türer, eskiden sabit "Bu Hafta" yazıyordu.
  dateRangeLabel: string;
  // Kâr kartlarında (Brüt/Net Kâr) sistem geneli KDV moduna göre "KDV Dahil Değil" /
  // "KDV Dahil" rozeti — rakamın kendisi zaten OrderProfitContext üzerinden bu moda göre
  // hesaplanıyor, burada sadece o gerçeği kullanıcıya açıkça yazıyoruz.
  vatBadge?: string;
}


function KpiCard({ labelKey, accent, value, delta, sparkline, chartData, isLoading, delay, dateRangeLabel, vatBadge }: KpiCardProps) {
  const { t, lang } = useI18n();
  const [showChart, setShowChart] = useState(false);
  const hasChart = (chartData && chartData.length > 0) || (sparkline && sparkline.length >= 2);

  return (
    <div
      style={{
        position: 'relative',
        height: '110px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '12px 14px',
        boxShadow: 'var(--shadow-xs)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        animationDelay: `${delay}ms`,
        animation: 'kpi-enter 0.4s ease both',
        cursor: hasChart ? 'pointer' : 'default',
        overflow: 'hidden',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
      }}
      onClick={() => hasChart && setShowChart((prev) => !prev)}
      title={hasChart ? (lang === 'tr' ? (showChart ? 'Metriği Göster' : 'Grafiği Göster') : (showChart ? 'Show Metric' : 'Show Chart')) : undefined}
    >
      {showChart ? (
        <div className="animate-fade-in" style={{ height: '100%', width: '100%' }}>
          <KpiBackChart
            chartData={chartData ?? (sparkline?.map((v, i) => ({ label: String(i + 1), value: v })) ?? [])}
            color={accent}
            label={labelKey}
            dateRangeLabel={dateRangeLabel}
          />
        </div>
      ) : (
        <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{
              display: 'block', fontSize: 9.5, fontWeight: 800,
              color: 'var(--fg-muted)', letterSpacing: '0.4px',
              textTransform: 'uppercase',
            }}>
              {labelKey}
              {vatBadge && (
                <span style={{
                  marginLeft: 5, fontSize: 8, fontWeight: 700, textTransform: 'none',
                  letterSpacing: 0, color: 'var(--fg-subtle)',
                }}>
                  ({vatBadge})
                </span>
              )}
            </span>
          </div>

          {isLoading ? (
            <div className="skeleton" style={{ height: 26, width: '55%', borderRadius: 4, background: 'var(--border-soft)' }} />
          ) : (
            <p style={{ fontSize: 22, fontWeight: 800, color: accent, lineHeight: 1, letterSpacing: '-0.5px', margin: 0 }}>
              <AnimatedNumber value={value} />
            </p>
          )}

          {!isLoading && delta !== null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 700, fontSize: 10.5,
                color: delta >= 0 ? '#10b981' : '#f43f5e',
              }}>
                {delta >= 0 ? <TrendingUp size={10} strokeWidth={2.5} /> : <TrendingDown size={10} strokeWidth={2.5} />}
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </span>
              <span style={{ fontSize: 9, color: 'var(--fg-subtle)' }}>{t('kpi_vs_previous')}</span>
            </div>
          ) : (
            <div style={{ height: 14 }} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Uygulamalar Kısayolu ─────────────────────────────────────────────────────

// 7. kart: metrik değil, KAPI. Modüllere (Omnichannel, AdsHub, Kargo, Radar…) ulaşmanın
// tek yolu Topbar'daki küçük ızgara ikonuydu ve kimse orayı fark etmiyordu.
//
// Kart artık Topbar'ın dar menüsünü UZAKTAN AÇMIYOR (öyleyken ekranın öbür ucundaki
// bir listeyi açıp kapatan bir anahtar gibi davranıyordu). Kendi büyük keşif panelini
// açar (bkz. components/layout/AppsDirectory.tsx) — uygulama listesi orada da
// TEKRARLANMAZ, iki yüzey de aynı katalogtan beslenir (hooks/useAppCatalog.ts).
function AppsLauncherCard({ delay }: { delay: number }) {
  const { lang } = useI18n();
  const isTr = lang === 'tr';
  const openApps = useAppsLauncher((s) => s.openDirectory);

  return (
    <button
      type="button"
      onClick={openApps}
      className="apps-launcher-card"
      aria-label={isTr ? 'Uygulamaları Aç' : 'Open Apps'}
      style={{
        position: 'relative',
        minWidth: 0,
        height: '110px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '12px 14px',
        boxShadow: 'var(--shadow-xs)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        cursor: 'pointer',
        textAlign: 'left',
        animationDelay: `${delay}ms`,
        animation: 'kpi-enter 0.4s ease both',
        overflow: 'hidden',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {/* Üst Başlık — Diğer 6 KPI kartı ile aynı dikey hizada */}
      <div className="apps-launcher-top">
        <span
          style={{
            display: 'block',
            fontSize: 9.5,
            fontWeight: 800,
            color: 'var(--fg-muted)',
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
          }}
        >
          {isTr ? 'Uygulamalar' : 'Apps'}
        </span>
      </div>

      {/* Orta Alan: İkon + Başlık */}
      <div
        className="apps-launcher-body"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 0,
        }}
      >
        <span
          className="apps-launcher-icon"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            borderRadius: 6,
            flexShrink: 0,
            background: 'var(--bg-subtle)',
            color: 'var(--fg)',
          }}
        >
          <Grid3x3 size={15} strokeWidth={2} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left' }}>
          <span
            className="apps-launcher-title"
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: 'var(--fg)',
              lineHeight: 1.15,
              letterSpacing: '-0.3px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {isTr ? 'Uygulamalar' : 'Apps'}
          </span>
          <span
            className="apps-launcher-mobile-desc"
            style={{
              display: 'none',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--fg-muted)',
              lineHeight: 1.2,
            }}
          >
            {isTr ? 'Tüm modülleri keşfedin' : 'Explore all modules'}
          </span>
        </div>
      </div>

      {/* Alt Alan: Kataloğu Aç Linki */}
      <div className="apps-launcher-footer" style={{ display: 'flex', alignItems: 'center', height: 14 }}>
        <span
          className="apps-launcher-desc"
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            color: 'var(--fg-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {isTr ? 'Kataloğu Aç' : 'Open Catalog'}
          <ChevronRight size={10} strokeWidth={2.5} />
        </span>
      </div>

      <span
        className="apps-launcher-chevron"
        style={{
          display: 'none',
          marginLeft: 'auto',
          flexShrink: 0,
          color: 'var(--fg-muted)',
        }}
      >
        <ChevronRight size={18} />
      </span>
    </button>
  );
}

// ─── KpiBar ───────────────────────────────────────────────────────────────────

export function KpiBar() {
  const { t, lang } = useI18n();
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const isDepo = roles.some(r => r.toLowerCase().includes('depo') || r.toLowerCase().includes('warehouse'));
  const isMuhasebe = roles.some(r => r.toLowerCase().includes('muhasebe') || r.toLowerCase().includes('finance') || r.toLowerCase().includes('accounting'));
  const isAdmin = roles.some(r => r.toLowerCase().includes('admin') || r.toLowerCase().includes('superadmin'));
  // SiteHub özet kartı yalnızca panosu ucunu çağırabilen rollere gösterilir
  // (bkz. lib/sitehub/roles.ts) — aksi halde 403 sahte/yanıltıcı bir kart üretir.
  const canViewSiteHub = SITEHUB_DASHBOARD_ROLES.some((r) => roles.includes(r));

  const { getDateParams, categoryId, dateRange } = useDashboardFilters();
  const { from, to, days } = getDateParams();
  const { isBaseOnly, toGbp } = useBaseCurrency();
  const storeSummaryCardRef = useRef<HTMLDivElement>(null);

  // Bu KPI'lar seçili mağaza filtresine göre TÜMÜNÜ toplar — sadece Base tek başına
  // seçiliyse (isBaseOnly) GBP karşılığını parantez içinde ekler. Karma filtrede (örn.
  // "Tümü") GBP eklemek yanıltıcı olur, o yüzden sadece isBaseOnly'de gösterilir.
  function fmtCurrency(n: number): string {
    const tryStr = abbrevCurrency(n, '₺');
    if (!isBaseOnly) return tryStr;
    const gbp = toGbp(n);
    // Base ERP tek başına seçiliyken £ baskın gösterilir, ₺ parantezde arka planda kalır.
    return gbp != null ? `${abbrevCurrency(gbp, '£')} (${tryStr})` : tryStr;
  }

  function fmtValTable(n: number, isCurrency = false): string {
    if (!isCurrency) return abbrevValTable(n, '');
    const tryStr = abbrevValTable(n, '₺');
    if (!isBaseOnly) return tryStr;
    const gbp = toGbp(n);
    return gbp != null ? `${abbrevValTable(gbp, '£')} (${tryStr})` : tryStr;
  }


  const selectedStores = useStoreSelector((s) => s.selectedStores);

  // Brüt/Net Kâr kartlarının rakamı zaten bu moda göre hesaplanıyor (bkz.
  // OrderProfitContext) — burada sadece kullanıcıya hangi modda olduğunu açıkça yazıyoruz.
  const { data: vatModeData } = useQuery({
    queryKey: ['finance-vat-mode'],
    queryFn: () => financeApi.vatMode.get(),
    staleTime: 5 * 60_000,
  });
  const vatBadge = vatModeData?.mode === 'Standard'
    ? (lang === 'tr' ? 'KDV Dahil' : 'incl. VAT')
    : (lang === 'tr' ? 'KDV Dahil Değil' : 'excl. VAT');

  const { data, isLoading } = useQuery({
    queryKey: ['order-stats-compare', from, to, categoryId, dateRange],
    queryFn: () => orderApi.stats(from, to, true, undefined, categoryId, dateRange),
    staleTime: 60_000,
  });

  // Fixed 30-day data — tablo satırları + 7-gün trend. Zaman aralığı SABİT (global filtreden
  // ETKİLENMEZ, kendi zaman kovaları var: Bugün/Dün/7g/30g) ama kategori filtrelenir.
  const fixed30From = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return localDateStr(d); })();
  const fixed30To   = localDateStr();
  const { data: profitDataFixed, isLoading: profitLoading } = useQuery({
    queryKey: ['profit-summary-fixed-30d', categoryId],
    queryFn: () => orderApi.profitSummary(fixed30From, fixed30To, undefined, categoryId),
    staleTime: 60_000,
  });

  // Filter-based data — üst 6 KPI kartı (Brüt/Net Kâr + sparkline'lar), tam filtreli.
  // compare=true: Brüt/Net Kâr'ın "önceki döneme göre %" değeri için previous de gelir
  // (aynı takvim-ayı-hizalı/trailing-pencere mantığı, bkz. OrderController.ComputePreviousPeriod).
  const { data: profitCompare } = useQuery({
    queryKey: ['profit-summary-trend', from, to, categoryId, dateRange],
    queryFn: () => orderApi.profitSummaryCompare(from, to, categoryId, dateRange),
    staleTime: 60_000,
  });
  const profitData = profitCompare?.current;
  const profitDataPrev = profitCompare?.previous;

  const cur  = data?.current;
  const prev = data?.previous;

  const dailyAvg     = cur  ? cur.totalOrderCount  / Math.max(days, 1) : 0;
  const prevDailyAvg = prev ? prev.totalOrderCount / Math.max(days, 1) : 0;

  const sortedCounts     = [...(data?.current?.dailyOrderCounts  || [])].sort((a, b) => a.date.localeCompare(b.date));
  const sortedReturns    = [...(data?.current?.dailyReturnCounts || [])].sort((a, b) => a.date.localeCompare(b.date));
  const profitDailyFixed = [...(profitDataFixed?.daily || [])].sort((a, b) => a.date.localeCompare(b.date));
  const profitDailyTrend = [...(profitData?.daily    || [])].sort((a, b) => a.date.localeCompare(b.date));

  // Mağaza Özeti tablo — Brüt Kâr = alış/kargo/kutu/komisyon/hizmet bedeli/KDV düşülmüş.
  // Net Kâr = Brüt Kâr - Giderler (aylık girilenin o güne düşen orantılı payı).
  function aggregateDaily(items: DailyProfit[]) {
    return {
      siparis: items.reduce((s, d) => s + d.orderCount, 0),
      ciro: items.reduce((s, d) => s + d.revenue, 0),
      brutKar: items.reduce((s, d) => s + d.grossProfit, 0),
      netKar: items.reduce((s, d) => s + d.netProfit, 0),
    };
  }

  const todayStr    = localDateStr();
  const yesterday   = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = localDateStr(yesterday);

  const todayProfit     = aggregateDaily(profitDailyFixed.filter(d => d.date === todayStr));
  const yesterdayProfit = aggregateDaily(profitDailyFixed.filter(d => d.date === yesterdayStr));
  const last7Profit     = aggregateDaily(profitDailyFixed.slice(-7));
  const last30Profit    = aggregateDaily(profitDailyFixed);

  const rows = [
    { label: t('filter_today'),      ...todayProfit     },
    { label: t('filter_yesterday'),  ...yesterdayProfit },
    { label: t('orders_filter_week'),...last7Profit  },
    { label: t('orders_filter_month'),...last30Profit },
  ];

  // Sparklines — filter-based, seçili from/to aralığının TAMAMI (eskiden son 7 güne
  // sabitliydi; üstteki tarih filtresi "Bu Ay" gibi daha uzun bir aralık seçince de
  // arka yüzdeki grafik hep aynı 7 günü gösteriyordu).
  const revenueSparkline    = profitDailyTrend.map(d => d.revenue);
  const orderSparkline      = profitDailyTrend.map(d => d.orderCount);
  const avgSparkline        = sortedCounts.map(d => d.count);
  const grossProfitSparkline = profitDailyTrend.map(d => d.grossProfit);
  const netProfitSparkline  = profitDailyTrend.map(d => d.netProfit);
  const returnSparkline     = sortedReturns.map(d => d.count);

  // Back-face chart data with date labels — seçili aralığın tamamı
  function toChartData(items: DailyProfit[], key: keyof DailyProfit) {
    return items.map(d => ({
      label: d.date.slice(5),
      value: Math.round(d[key] as number),
    }));
  }

  // Seçili tarih aralığına dinamik trend verisi.
  //
  // SAATLİK KIRILIM KALDIRILDI (kod incelemesi 2026-09-04): "Bugün/Dün" seçiliyken grafik,
  // günün toplamını SABİT bir ağırlık dizisiyle 12 saat dilimine bölüp gösteriyordu. Ortada
  // saatlik veri yoktu — çizilen eğri tamamen UYDURMAYDI ve hiçbir "tahmin" uyarısı da
  // taşımıyordu; kullanıcı saat 14:00'te "günün cirosunun %18'i" gibi gerçekle ilgisi olmayan
  // bir rakam okuyordu. Bu, Trendyol tahmin takviminde daha önce düzeltilen "para uydurma"
  // hatasının aynısı. Gerçek saatlik kırılım backend'den gelene kadar tek günlük seçimde
  // günün GERÇEK tek değeri gösterilir.
  const dynamicTrendData = profitDailyTrend.map(item => {
        const parts = item.date.split('-');
        const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.date;
        return {
          name: label,
          Ciro: Math.round(item.revenue),
          'Brüt Kâr': Math.round(item.grossProfit),
          Siparis: item.orderCount,
        };
      });

  const dateRangeLabel = fmtRangeLabel(from, to);

  const kpis: KpiCardProps[] = [
    {
      labelKey: t('widget_revenue_column'),
      accent: 'var(--fg)',
      value: cur ? fmtCurrency(cur.totalRevenue) : '—',
      delta: cur && prev ? pctChange(cur.totalRevenue, prev.totalRevenue) : null,
      sparkline: revenueSparkline,
      chartData: toChartData(profitDailyTrend, 'revenue'),
      isLoading,
      delay: 0,
      dateRangeLabel,
    },
    {
      labelKey: t('widget_orders_label'),
      accent: 'var(--fg)',
      value: cur ? fmt(cur.totalOrderCount) : '—',
      delta: cur && prev ? pctChange(cur.totalOrderCount, prev.totalOrderCount) : null,
      sparkline: orderSparkline,
      chartData: toChartData(profitDailyTrend, 'orderCount'),
      isLoading,
      delay: 60,
      dateRangeLabel,
    },
    {
      labelKey: t('widget_daily_avg_label'),
      accent: 'var(--fg)',
      value: cur ? dailyAvg.toFixed(1) : '—',
      delta: cur && prev ? pctChange(dailyAvg, prevDailyAvg) : null,
      sparkline: avgSparkline,
      chartData: sortedCounts.map(d => ({ label: d.date.slice(5), value: d.count })),
      isLoading,
      delay: 120,
      dateRangeLabel,
    },
    {
      labelKey: t('widget_returns_label'),
      accent: 'var(--fg)',
      value: cur ? fmt(cur.returnCount ?? 0) : '—',
      delta: cur && prev ? pctChange(cur.returnCount ?? 0, prev.returnCount ?? 0) : null,
      sparkline: returnSparkline,
      chartData: sortedReturns.map(d => ({ label: d.date.slice(5), value: d.count })),
      isLoading,
      delay: 180,
      dateRangeLabel,
    },
    {
      labelKey: t('widget_gross_profit_column'),
      accent: 'var(--fg)',
      value: profitData ? fmtCurrency(profitData.grossProfit) : '—',
      delta: profitData && profitDataPrev ? pctChange(profitData.grossProfit, profitDataPrev.grossProfit) : null,
      sparkline: grossProfitSparkline,
      chartData: toChartData(profitDailyTrend, 'grossProfit'),
      isLoading: isLoading || !profitData,
      delay: 240,
      dateRangeLabel,
      vatBadge,
    },
    {
      labelKey: t('widget_net_profit_column'),
      accent: 'var(--fg)',
      value: profitData ? fmtCurrency(profitData.netProfit) : '—',
      delta: profitData && profitDataPrev ? pctChange(profitData.netProfit, profitDataPrev.netProfit) : null,
      sparkline: netProfitSparkline,
      chartData: toChartData(profitDailyTrend, 'netProfit'),
      isLoading: isLoading || !profitData,
      delay: 300,
      dateRangeLabel,
      vatBadge,
    },
  ];

  // Export: stabil key + tipli sütun (para/sayı). Tutarlar TL (raporlama birimi); değerler
  // Excel'de SAYI kalsın diye ham geçilir (toFixed string'i kaldırıldı).
  const storeSummaryExportColumns: ExportColumn[] = [
    { key: 'period', header: lang === 'tr' ? 'Dönem' : 'Period', type: 'text' },
    { key: 'orders', header: lang === 'tr' ? 'Sipariş' : 'Orders', type: 'int' },
    { key: 'revenue', header: lang === 'tr' ? 'Ciro (TL)' : 'Revenue (TL)', type: 'money', currency: 'TRY' },
    { key: 'gross', header: lang === 'tr' ? 'Brüt Kâr (TL)' : 'Gross Profit (TL)', type: 'money', currency: 'TRY' },
    { key: 'net', header: lang === 'tr' ? 'Net Kâr (TL)' : 'Net Profit (TL)', type: 'money', currency: 'TRY' },
  ];
  const storeSummaryExportRows = () => rows.map(r => ({
    period: r.label, orders: r.siparis, revenue: r.ciro, gross: r.brutKar, net: r.netKar,
  }));

  const visibleKpis = kpis.filter(kpi => {
    if (isDepo && !isAdmin) {
      return kpi.labelKey === t('widget_orders_label') ||
             kpi.labelKey === t('widget_daily_avg_label') ||
             kpi.labelKey === t('widget_returns_label');
    }
    if (isMuhasebe && !isAdmin) {
      return kpi.labelKey !== t('widget_daily_avg_label');
    }
    return true;
  });

  return (
    <div className="kpi-dashboard-top-section">
      {/* 6 metrik kartı + en sağda Uygulamalar kısayolu */}
      <div className="kpi-cards-grid-row">
        {visibleKpis.map((kpi) => (
          <KpiCard key={kpi.labelKey} {...kpi} />
        ))}
        <AppsLauncherCard delay={360} />
      </div>

      {/* Maliyeti Eksik uyarısı artık StaticWidgets'taki dinamik "Uyarılar" panelinde
          (DashboardAlerts) — tam-genişlik şerit yerine ERP Dağılımı'nın olduğu 1/3 sütunda. */}

      {/* TR / UK kapsamlı karşılaştırma — 6 KPI'nın hemen altında, aynı genişlikte 2 kart */}
      {!(isDepo && !isAdmin) && <CountryComparison />}

      {/* Bottom: DEMO Özeti (sol) + Lojistik Haritası (sağ) */}
      <div className="kpi-dashboard-split-row">
        {/* Left: Demo Oto Mağaza Özeti */}
        <div className="store-summary-card" ref={storeSummaryCardRef}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.2px' }}>
                {t('widget_store_summary_title')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ExportMenu
                filename="demo-magaza-ozeti"
                getData={storeSummaryExportRows}
                columns={storeSummaryExportColumns}
                containerRef={storeSummaryCardRef}
                label={lang === 'tr' ? 'Dışa Aktar' : 'Export'}
              />
            </div>
          </div>

          {(isLoading || profitLoading) ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0' }}>
              <div style={{ width: 24, height: 24, borderRadius: 99, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : (
            <>
              <div className="summary-table-wrapper">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th style={{ width: 110 }}></th>
                      <th>{t('widget_orders_column')}</th>
                      {!(isDepo && !isAdmin) && (
                        <>
                          <th>{t('widget_revenue_column')}</th>
                          <th>{t('widget_gross_profit_column')}</th>
                          <th>{t('widget_net_profit_column')}</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label}>
                        <td className="row-label-cell">
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{row.label}</span>
                        </td>
                        <td className="value-cell">{row.siparis.toLocaleString('tr-TR')}</td>
                        {!(isDepo && !isAdmin) && (
                          <>
                            <td className="value-cell" style={{ fontWeight: 700 }}>{fmtValTable(row.ciro, true)}</td>
                            <td className={`value-cell ${row.brutKar === 0 ? 'zero-neutral' : row.brutKar < 0 ? 'neg-red' : 'pos-green'}`} style={{ fontWeight: 700 }}>
                              {row.brutKar === 0 ? '—' : `${row.brutKar < 0 ? '-' : ''}${fmtValTable(Math.abs(row.brutKar), true)}`}
                            </td>
                            <td className={`value-cell ${row.netKar === 0 ? 'zero-neutral' : row.netKar < 0 ? 'neg-red' : 'pos-green'}`} style={{ fontWeight: 700 }}>
                              {row.netKar === 0 ? '—' : `${row.netKar < 0 ? '-' : ''}${fmtValTable(Math.abs(row.netKar), true)}`}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="chart-section-title" style={{ marginTop: 14 }}>
                <span>{dateRangeLabel ? `${t('widget_trend_label')} (${dateRangeLabel})` : t('widget_trend_label')}</span>
              </div>
              <DeferredKpiTrendChart
                data={dynamicTrendData}
                orderOnly={isDepo && !isAdmin}
                formatValue={(value) => fmtValTable(value, true)}
              />
            </>
          )}
        </div>

        {/* Right: Reklam Performansı — Trend Ürünler'in yerine geldi (kullanıcı talebi).
            AdsHub'ın harcama/gösterim/tıklama özeti, platform kırılımı ve günlük trend. */}
        <AdsHubSummaryCard selectedStores={selectedStores} />
      </div>

      {/* Mağaza özeti ve reklam performansının ALTINDA — modül özet kartları
          (Omnichannel/SiteHub/Radar). Depo-only rolüne CountryComparison ile AYNI
          gerekçeyle gizli: iş verisi, depo operasyonuyla ilgisiz. */}
      {!(isDepo && !isAdmin) && (
        <div className={`kpi-dashboard-modules-row${canViewSiteHub ? '' : ' kpi-dashboard-modules-row--two'}`}>
          <OmnichannelSummaryCard />
          {/* Kart kendi rol kapısını da uygular; buradaki kontrol yalnızca ızgaranın
              sütun sayısını kartla aynı kaynaktan türetmek için. */}
          <SiteHubSummaryCard />
          <RadarSummaryCard />
        </div>
      )}

      <style>{`
        .kpi-dashboard-top-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
        }

        /* 6 metrik + 1 Uygulamalar kartı. Uygulamalar kartı metrik kartlarından DAR:
           içinde sayı yok, sadece ikon + etiket — eşit genişlik verseydik 6 metriğin
           hepsi gereksiz yere daralırdı. */
        .kpi-cards-grid-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr) 0.72fr;
          gap: 12px;
          padding: 12px 16px 0;
        }

        .kpi-dashboard-split-row {
          display: flex;
          gap: 16px;
          padding: 0 16px;
          width: 100%;
          align-items: stretch;
        }

        .kpi-dashboard-modules-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding: 0 16px;
          width: 100%;
          align-items: stretch;
        }

        /* SiteHub kartı yetkisiz rolde gizlenince ızgarada boş sütun kalmasın. */
        .kpi-dashboard-modules-row--two {
          grid-template-columns: repeat(2, 1fr);
        }

        @media (max-width: 1100px) {
          .kpi-dashboard-modules-row { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .kpi-dashboard-modules-row { grid-template-columns: 1fr; padding: 0 12px; gap: 12px; }
        }

        .store-summary-card {
          flex: 1.3;
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

        .dark .store-summary-card {
          background: rgba(22,22,22,0.78);
          border-color: rgba(255,255,255,0.06);
          box-shadow: 0 4px 20px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.05);
        }

        .store-chart-card {
          flex: 1;
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

        .dark .store-chart-card {
          background: rgba(22,22,22,0.78);
          border-color: rgba(255,255,255,0.06);
          box-shadow: 0 4px 20px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.05);
        }

        /* ── Flip card faces ── */
        .kpi-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          background: rgba(255,255,255,0.78);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(15,23,42,0.06);
          border-radius: 6px;
          padding: 10px 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02), inset 0 1px 1px rgba(255,255,255,0.8);
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
        }

        .dark .kpi-face {
          background: rgba(22,22,22,0.78);
          border-color: rgba(255,255,255,0.06);
          box-shadow: 0 4px 20px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.05);
        }

        .kpi-face-back {
          transform: rotateY(180deg);
        }

        @media (max-width: 1100px) {
          .kpi-cards-grid-row { grid-template-columns: repeat(3, 1fr); }
          .kpi-dashboard-split-row { flex-direction: column; }
        }

        @media (max-width: 768px) {
          /* Panodaki tüm kart tipleri (KPI şerit + store-summary/chart kartları)
             aynı kenar boşluğu/köşe yuvarlaması ile mobilde tutarlı görünsün —
             önceden farklı eşik değerlerinde farklı görünüyorlardı ("irili ufaklı"). */
          .store-summary-card, .store-chart-card {
            padding: 12px;
            border-radius: 12px;
          }
          .kpi-dashboard-split-row { padding: 0 12px; gap: 12px; }
        }

        @media (max-width: 700px) {
          .kpi-cards-grid-row { grid-template-columns: repeat(2, 1fr); }
          .apps-launcher-card {
            grid-column: 1 / -1 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 56px !important;
            padding: 10px 14px !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: flex-start !important;
            text-align: left !important;
            gap: 12px !important;
            border-radius: 6px !important;
          }
          .apps-launcher-card .apps-launcher-top {
            display: none !important;
          }
          .apps-launcher-card .apps-launcher-footer {
            display: none !important;
          }
          .apps-launcher-card .apps-launcher-body {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            flex: 1 !important;
            min-width: 0 !important;
            gap: 12px !important;
          }
          .apps-launcher-card .apps-launcher-icon {
            width: 32px !important;
            height: 32px !important;
          }
          .apps-launcher-card .apps-launcher-title {
            font-size: 13.5px !important;
            font-weight: 800 !important;
            line-height: 1.2 !important;
          }
          .apps-launcher-card .apps-launcher-mobile-desc {
            display: block !important;
            font-size: 11px !important;
            font-weight: 500 !important;
            color: var(--fg-muted) !important;
            line-height: 1.2 !important;
          }
          .apps-launcher-card .apps-launcher-chevron {
            display: inline-flex !important;
          }
        }

        @media (max-width: 480px) {
          /* Kullanıcı talebi: mobilde KPI kartları 2'li sırada kalsın, en alttaki
             Uygulamalar kartı tam genişlik (2 2 2 1 düzeni). */
          .kpi-cards-grid-row { grid-template-columns: repeat(2, 1fr); padding: 12px 12px 0; gap: 8px; }
        }

        .summary-table-wrapper { overflow-x: auto; width: 100%; }
        .summary-table { width: 100%; border-collapse: collapse; }
        .summary-table th { text-align: right; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #64748b; }
        .dark .summary-table th { color: #94a3b8; }
        .summary-table th:first-child { text-align: left; }
        .summary-table td { padding: 6px 12px; border-bottom: 1px solid rgba(15,23,42,0.03); font-size: 12px; }
        .dark .summary-table td { border-bottom-color: rgba(255,255,255,0.03); }
        .summary-table tr:last-child td { border-bottom: none; }
        .row-label-cell { text-align: left; }
        .value-cell { text-align: right; font-weight: 500; color: var(--fg); }
        .pos-green { color: #10b981 !important; }
        .neg-red { color: #f43f5e !important; }
        .zero-neutral { color: var(--fg-muted) !important; }

        .row-icon-wrapper { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }

        .chart-section-title {
          font-size: 12px; font-weight: 800; color: var(--fg);
          display: flex; align-items: center;
        }

        @keyframes kpi-enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
