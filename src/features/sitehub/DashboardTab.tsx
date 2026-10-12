'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Inbox, Eye, Mail, ListChecks, RefreshCw, LayoutGrid } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  siteHubApi,
} from '../../lib/api/sitehub';
import { ErrorState, formatDateTime } from './shared';
import { buildSiteColors, pivotRequests, pivotTraffic, seriesKey, shortDateLabel } from './charts';
import { FilterSelect } from '../../components/ui/FilterSelect';

const RUN_LIMIT = 10;
const CHART_HEIGHT = 240;

const DAY_OPTIONS = [
  { value: '7', label: 'Son 7 Gün' },
  { value: '30', label: 'Son 30 Gün' },
  { value: '90', label: 'Son 90 Gün' },
];

const TOOLTIP_STYLE = {
  borderRadius: 4,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  fontSize: 11,
  color: 'var(--fg)',
};
const AXIS_TICK = { fontSize: 10.5, fill: 'var(--fg-muted)' };

interface Props {
  onOpenSite: (siteId: number) => void;
}

export function DashboardTab({ onOpenSite }: Props) {
  const [days, setDays] = useState<number>(30);
  const dashboardQuery = useQuery({
    queryKey: ['sitehub', 'dashboard', days],
    queryFn: async () => {
      const [overview, analytics, runs] = await Promise.all([
        siteHubApi.getOverview(),
        siteHubApi.getAnalytics(days),
        siteHubApi.getRuns(RUN_LIMIT),
      ]);
      return { overview, analytics, runs };
    },
  });
  const { overview, analytics, runs } = dashboardQuery.data ?? {
    overview: null,
    analytics: null,
    runs: [],
  };
  const loading = dashboardQuery.isFetching;
  const error = dashboardQuery.error instanceof Error ? dashboardQuery.error.message : null;

  const sites = useMemo(() => analytics?.sites ?? [], [analytics]);
  const siteColors = useMemo(() => buildSiteColors(sites), [sites]);

  const requestRows = useMemo(
    () => (analytics ? pivotRequests(analytics.requestPoints, analytics.sites, analytics.days) : []),
    [analytics],
  );

  const trafficRows = useMemo(
    () => (analytics ? pivotTraffic(analytics.trafficPoints, analytics.sites, analytics.days) : []),
    [analytics],
  );

  const typeRows = useMemo(() => {
    if (!analytics) return [];
    return analytics.typeBreakdown.map((t) => ({
      name: t.siteName,
      siteConnectionId: t.siteConnectionId,
      Teklif: t.offers,
      Mesaj: t.messages,
      total: t.offers + t.messages,
    }));
  }, [analytics]);

  const hasTraffic = trafficRows.some((row) =>
    sites.some((s) => Number(row[seriesKey(s.siteConnectionId)]) > 0));

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      {/* Header & Date Range Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3" data-tour="sitehub-dashboard-header">
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Web Siteleri Genel Bakış</h2>
          </div>
          <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
            Tüm sitelerin talep ve trafik istatistikleri.
            {overview?.lastSyncedAt && ` • Son senkron: ${formatDateTime(overview.lastSyncedAt)}`}
          </p>
        </div>

        <div className="w-36">
          <FilterSelect
            value={String(days)}
            onChange={(v) => setDays(Number(v))}
            placeholder="Tarih Aralığı"
            height="h-8"
            options={DAY_OPTIONS}
          />
        </div>
      </div>

      {error && <ErrorState text={error} />}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5" data-tour="sitehub-dashboard-kpis">
        <KpiCard
          label="Açık Talepler"
          value={overview?.openRequestCount ?? 0}
          hint="Bekleyen formlar"
          Icon={Inbox}
        />
        <KpiCard
          label="Yeni (İşlenmemiş)"
          value={overview?.newRequestCount ?? 0}
          hint="İlk aksiyon bekliyor"
          Icon={Mail}
        />
        <KpiCard
          label="Son 24 Saat"
          value={overview?.requestsLast24Hours ?? 0}
          hint="Gelen talep sayısı"
          Icon={ListChecks}
        />
        <KpiCard
          label="Sayfa Görüntüleme"
          value={overview?.pageViewsPeriod ?? 0}
          hint="Dönemsel toplam"
          Icon={Eye}
        />
        <KpiCard
          label="Tekil Ziyaretçi"
          value={overview?.uniqueVisitorsPeriod ?? 0}
          hint="Tüm siteler"
          Icon={Eye}
        />
        <KpiCard
          label="Aktif Siteler"
          value={overview?.activeSiteCount ?? 0}
          hint={`Toplam ${overview?.siteCount ?? 0} site`}
          Icon={RefreshCw}
        />
      </div>

      {/* Siteler — panodan siteye gecis.
          onOpenSite prop'u SiteHubWorkspace tarafindan GECILIYOR ama bu bilesende hic
          kullanilmiyordu: panoda bir siteye tiklamak hicbir sey yapmiyordu. */}
      {sites.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" data-tour="sitehub-dashboard-sites">
          <span className="text-[11px] font-semibold uppercase text-[var(--fg-muted)]">Siteler</span>
          {sites.map((s) => (
            <button
              key={s.siteConnectionId}
              type="button"
              onClick={() => onOpenSite(s.siteConnectionId)}
              className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-2.5 py-1 text-xs font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: siteColors[s.siteConnectionId] }}
              />
              {s.siteName}
            </button>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" data-tour="sitehub-dashboard-charts">
        {/* Talep Trendi */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-[var(--fg)]">Günlük Talep Trendi (Teklif + Mesaj)</h3>
            <span className="text-[10.5px] font-mono text-[var(--fg-muted)]">Son {days} gün</span>
          </div>

          <div style={{ height: CHART_HEIGHT }} className="w-full">
            {loading && !analytics ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)]">Yükleniyor...</div>
            ) : requestRows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)]">Veri bulunamadı.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={requestRows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={shortDateLabel} stroke="var(--border-soft)" />
                  <YAxis tick={AXIS_TICK} allowDecimals={false} stroke="var(--border-soft)" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  {sites.map((s) => (
                    <Line
                      key={s.siteConnectionId}
                      type="monotone"
                      dataKey={seriesKey(s.siteConnectionId)}
                      name={s.siteName}
                      stroke={siteColors[s.siteConnectionId]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Trafik / Ziyaretçi Trendi */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-[var(--fg)]">Ziyaretçi Trendi</h3>
            <span className="text-[10.5px] font-mono text-[var(--fg-muted)]">Son {days} gün</span>
          </div>

          <div style={{ height: CHART_HEIGHT }} className="w-full">
            {!hasTraffic ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)] text-center px-4">
                Ziyaretçi sayacı adaptörü olan siteler bağlandığında trafik grafiği burada görünür.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficRows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={shortDateLabel} stroke="var(--border-soft)" />
                  <YAxis tick={AXIS_TICK} allowDecimals={false} stroke="var(--border-soft)" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  {sites.map((s) => (
                    <Line
                      key={s.siteConnectionId}
                      type="monotone"
                      dataKey={seriesKey(s.siteConnectionId)}
                      name={s.siteName}
                      stroke={siteColors[s.siteConnectionId]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Site Dağılımı ve Son Senkron Turları */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" data-tour="sitehub-dashboard-breakdown">
        {/* Site Bazında Talep Kırılımı */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <h3 className="font-bold text-xs text-[var(--fg)]">Site Bazında Talep Türü Dağılımı</h3>
          <div style={{ height: 200 }} className="w-full">
            {typeRows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)]">Veri yok.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeRows} layout="vertical" margin={{ top: 5, right: 15, bottom: 0, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis type="number" tick={AXIS_TICK} stroke="var(--border-soft)" />
                  <YAxis type="category" dataKey="name" tick={AXIS_TICK} stroke="var(--border-soft)" width={80} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Teklif" stackId="a" fill="var(--fg)" />
                  <Bar dataKey="Mesaj" stackId="a" fill="var(--fg-muted)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Son Senkronizasyon Turları */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col">
          <div className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-4 py-2.5 font-bold text-xs text-[var(--fg)]">
            Son Senkronizasyon Turları
          </div>
          <div className="divide-y divide-[var(--border-soft)] overflow-y-auto max-h-[200px]">
            {runs.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--fg-muted)]">Henüz senkron kaydı yok.</div>
            ) : (
              runs.map((r) => {
                const duration = r.finishedAt ? Math.max(0, new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()) : 0;
                return (
                  <div key={r.id} className="flex items-center justify-between px-4 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${r.success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="font-semibold text-[var(--fg)]">{r.siteName}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[10.5px] text-[var(--fg-muted)]">
                      <span>+{r.importedCount} talep</span>
                      {duration > 0 && <span>{duration}ms</span>}
                      <span>{formatDateTime(r.finishedAt ?? r.startedAt)}</span>
                    </div>
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

function KpiCard({
  label, value, hint, Icon,
}: {
  label: string; value: number; hint: string; Icon: LucideIcon;
}) {
  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between text-[var(--fg-muted)]">
        <span className="text-[10.5px] font-semibold uppercase">{label}</span>
        <Icon size={13} />
      </div>
      <div className="font-mono text-xl font-bold text-[var(--fg)] my-1">{value}</div>
      <div className="text-[10px] text-[var(--fg-muted)]">{hint}</div>
    </div>
  );
}
