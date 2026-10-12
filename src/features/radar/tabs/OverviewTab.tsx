'use client';

import { useState } from 'react';
import {
  Mail, Send, MessageSquareReply, Clock,
  TrendingUp, MapPin, PieChart as PieIcon, Filter, AlertTriangle, LayoutGrid,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useRadarStats, useRadarRecentActivity } from '../../../hooks/radar/useRadarStats';
import { useRadarAnalytics } from '../../../hooks/radar/useRadarAnalytics';
import { useRadarAlerts } from '../../../hooks/radar/useRadarAlerts';
import { formatTime } from '../../../lib/format';
import { fmt } from '../shared';
import { CountrySelect } from '../CountrySelect';

const TOOLTIP_STYLE = {
  borderRadius: 4,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  fontSize: 11,
  color: 'var(--fg)',
};
const AXIS_TICK = { fontSize: 10.5, fill: 'var(--fg-muted)' };

interface Props {
  onOpenMessages: (companyId: number) => void;
}

type ChartTab = 'trend' | 'city' | 'sic' | 'funnel';

const CHART_TABS = {
  trend: { text: 'Trend', Icon: TrendingUp },
  city: { text: 'Şehirler', Icon: MapPin },
  sic: { text: 'Kategori / SIC', Icon: PieIcon },
  funnel: { text: 'Huni', Icon: Filter },
} as const;

export function OverviewTab({ onOpenMessages }: Props) {
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>('trend');
  const [country, setCountry] = useState('');

  const { data: stats } = useRadarStats(country || undefined);
  const { data: activity, isLoading: activityLoading } = useRadarRecentActivity(20, country || undefined);
  const { data: analytics, isLoading: analyticsLoading } = useRadarAnalytics(country || undefined);
  const { data: alerts } = useRadarAlerts();

  const funnel = analytics?.funnel;
  const categoryChartData = analytics?.byCategory.map((c) => ({
    ...c,
    displayName: c.label ? `${c.category} — ${c.label}` : c.category,
  })) ?? [];

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      {/* Header & Country Filter */}
      <div data-tour="radar-overview-header" className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Radar Pazar & Lead Özeti</h2>
          </div>
          <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
            B2B potansiyel müşteri keşfi ve otomatik e-posta outreach istatistikleri.
          </p>
        </div>

        <CountrySelect value={country} onChange={setCountry} className="w-44" />
      </div>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="flex flex-col gap-1.5 shrink-0">
          {alerts
            .filter((a) => !country || a.country === country || a.country == null)
            .map((a, i) => (
              <div
                key={`${a.title}-${i}`}
                className="flex items-center gap-2 p-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-xs text-[var(--fg-muted)]"
              >
                <AlertTriangle size={13} className="shrink-0 text-[var(--fg-muted)]" />
                <span className="font-bold text-[var(--fg)]">{a.title}</span>
                <span>— {a.message}</span>
              </div>
            ))}
        </div>
      )}

      {/* KPI Cards Strip */}
      <div data-tour="radar-overview-kpis" className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--fg-muted)]">
            <span className="text-[10.5px] font-semibold uppercase">E-posta Hesapları</span>
            <Mail size={13} />
          </div>
          <div className="font-mono text-xl font-bold text-[var(--fg)] my-1">
            {stats ? `${fmt(stats.activeEmailAccounts)} / ${fmt(stats.totalEmailAccounts)}` : '—'}
          </div>
          <div className="text-[10px] text-[var(--fg-muted)]">Aktif / Toplam SMTP hesabı</div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--fg-muted)]">
            <span className="text-[10.5px] font-semibold uppercase">Gönderilen E-posta</span>
            <Send size={13} />
          </div>
          <div className="font-mono text-xl font-bold text-[var(--fg)] my-1">
            {stats ? fmt(stats.totalSentEmails) : '—'}
          </div>
          <div className="text-[10px] text-[var(--fg-muted)]">
            {stats ? `${fmt(stats.totalCompanies)} taranan şirket` : '—'}
          </div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--fg-muted)]">
            <span className="text-[10.5px] font-semibold uppercase">Yanıt / Cevap Oranı</span>
            <MessageSquareReply size={13} />
          </div>
          <div className="font-mono text-xl font-bold text-emerald-500 my-1">
            {stats ? `%${stats.replyRatePercent.toFixed(1)}` : '—'}
          </div>
          <div className="text-[10px] text-[var(--fg-muted)]">
            {stats ? `${fmt(stats.totalRepliedCompanies)} firma cevapladı` : '—'}
          </div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--fg-muted)]">
            <span className="text-[10.5px] font-semibold uppercase">Zenginleştirme Bekleyen</span>
            <Clock size={13} />
          </div>
          <div className="font-mono text-xl font-bold text-[var(--fg)] my-1">
            {stats ? fmt(stats.pendingEnrichmentCount) : '—'}
          </div>
          <div className="text-[10px] text-[var(--fg-muted)]">Website / e-posta aranıyor</div>
        </div>
      </div>

      {/* Main Content Grid: Charts (Left) & Recent Activity (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Chart Panel (7 Columns) */}
        <div data-tour="radar-overview-charts" className="lg:col-span-7 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2.5">
            <span className="font-bold text-xs text-[var(--fg)]">Pazar & Gönderim Analizi</span>

            <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-[3px]">
              {(Object.keys(CHART_TABS) as ChartTab[]).map((tabId) => {
                const isActive = activeChartTab === tabId;
                const { text, Icon } = CHART_TABS[tabId];
                return (
                  <button
                    key={tabId}
                    type="button"
                    onClick={() => setActiveChartTab(tabId)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-[2px] text-[10.5px] font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-[var(--card)] text-[var(--fg)] shadow-xs'
                        : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                    }`}
                  >
                    <Icon size={11} />
                    <span>{text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: 260 }} className="w-full">
            {analyticsLoading || !analytics ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)]">Veriler yükleniyor...</div>
            ) : activeChartTab === 'trend' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.emailTrend} margin={{ left: -20, right: 10, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={AXIS_TICK} stroke="var(--border-soft)" />
                  <YAxis tick={AXIS_TICK} allowDecimals={false} stroke="var(--border-soft)" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sent" name="Gönderilen" stroke="var(--fg)" fill="var(--bg-subtle)" strokeWidth={2} />
                  <Area type="monotone" dataKey="replied" name="Cevap Veren" stroke="var(--fg-muted)" fill="var(--border-soft)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : activeChartTab === 'city' ? (
              analytics.byCity.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)]">Şehir verisi bulunamadı.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.byCity} layout="vertical" margin={{ left: -10, right: 15, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-soft)" />
                    <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} stroke="var(--border-soft)" />
                    <YAxis type="category" dataKey="city" width={90} tick={AXIS_TICK} stroke="var(--border-soft)" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(Number(v))} />
                    <Bar dataKey="count" name="Şirket Sayısı" fill="var(--fg)" radius={[0, 3, 3, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : activeChartTab === 'sic' ? (
              categoryChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)]">SIC verisi bulunamadı.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData} dataKey="count" nameKey="displayName"
                      cx="50%" cy="50%" outerRadius={85} paddingAngle={2}
                      label={(props) => (props.payload as { category: string }).category}
                      fontSize={10}
                    >
                      {categoryChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill="var(--fg)" opacity={0.3 + (index * 0.15) % 0.7} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              )
            ) : (
              // Funnel tab
              funnel ? (
                <div className="h-full flex flex-col justify-center gap-2 p-2 max-w-sm mx-auto font-mono text-xs">
                  <div className="flex items-center justify-between p-2 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]">
                    <span>1. Taranan Şirket</span>
                    <span className="font-bold">{fmt(funnel.totalCompanies)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]">
                    <span>2. E-postası Bulunan</span>
                    <span className="font-bold">{fmt(funnel.withEmail)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]">
                    <span>3. İletişime Geçilen</span>
                    <span className="font-bold">{fmt(funnel.contacted)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-emerald-500 font-bold">
                    <span>4. Yanıt / Cevap Veren</span>
                    <span>{fmt(funnel.replied)}</span>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)]">Huni verisi bulunamadı.</div>
              )
            )}
          </div>
        </div>

        {/* Recent Activity List (5 Columns) */}
        <div data-tour="radar-overview-activity" className="lg:col-span-5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col overflow-hidden">
          <div className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-3 font-bold text-xs text-[var(--fg)]">
            Son E-posta Hareketleri
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-soft)] max-h-[300px]">
            {activityLoading && <div className="p-4 text-center text-xs text-[var(--fg-muted)]">Hareketler yükleniyor...</div>}
            {!activityLoading && (!activity || activity.length === 0) && (
              <div className="p-4 text-center text-xs text-[var(--fg-muted)]">Henüz e-posta hareketi kaydedilmedi.</div>
            )}

            {activity?.map((a) => (
              <div
                key={a.id}
                onClick={() => onOpenMessages(a.id)}
                className="p-2.5 px-3 hover:bg-[var(--bg-subtle)]/30 transition cursor-pointer flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-[var(--fg)] truncate">{a.companyName}</div>
                  <div className="text-[10.5px] text-[var(--fg-muted)] truncate font-mono">
                    {a.subject || 'Konu belirtilmemiş'}
                  </div>
                </div>

                <span className="text-[10px] font-mono text-[var(--fg-muted)] shrink-0">
                  {formatTime(a.sentAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
