'use client';

import { LayoutDashboard } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { useSentosTrackOverview, useSentosTrackWarnings } from '@/hooks/sentostrack/useSentosTrack';
import { EmptyState, ErrorState } from './shared';

const CHART_HEIGHT = 200;
const TOOLTIP_STYLE = {
  borderRadius: 4,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  fontSize: 11,
  color: 'var(--fg)',
};
const AXIS_TICK = { fontSize: 10.5, fill: 'var(--fg-muted)' };

export function OverviewTab() {
  const { data: overview, isLoading, isError } = useSentosTrackOverview();
  const { data: warnings } = useSentosTrackWarnings(undefined, undefined);

  if (isLoading) return <div className="p-8 text-center text-xs text-[var(--fg-muted)]">Yükleniyor…</div>;
  if (isError) return <ErrorState />;
  if (!overview || overview.length === 0) {
    return <EmptyState text="Henüz veri yok. Potansiyel stok Excel'i yükleyin." />;
  }

  const summary = warnings?.summary;

  const levelData = summary
    ? [
        { name: 'Kritik', value: summary.red, fill: 'var(--fg)' },
        { name: 'Uyarı', value: summary.orange, fill: 'var(--fg-muted)' },
        { name: 'Dikkat', value: summary.yellow, fill: 'var(--border)' },
        { name: 'Yeterli', value: summary.green, fill: 'var(--bg-subtle)' },
      ].filter((d) => d.value > 0)
    : [];

  const storeData = overview.map((o) => ({
    name: o.storeDisplayName.replace(' Sentos', ''),
    Kritik: o.warningRed,
    Uyarı: o.warningOrange,
  }));

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div data-tour="sentostrack-overview-header">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">SentosTrack Stok Senkronizasyon Özeti</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Sentos ERP mağazaları, anlık stok senkronizasyonu ve potansiyel stok analizleri.
        </p>
      </div>

      {/* Store KPI Cards */}
      <div data-tour="sentostrack-overview-kpis" className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {overview.map((o) => (
          <div key={o.storeCode} className="p-4 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[var(--fg)]">{o.storeDisplayName}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--fg-muted)]">
                {o.storeCode}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-[var(--border-soft)] pt-2 font-mono">
              <div>
                <span className="text-[10px] text-[var(--fg-muted)]">Potansiyel SKU</span>
                <div className="font-bold text-sm text-[var(--fg)] mt-0.5">{o.potentialSkuCount.toLocaleString('tr-TR')}</div>
              </div>
              <div>
                <span className="text-[10px] text-[var(--fg-muted)]">Kritik</span>
                <div className="font-bold text-sm text-rose-500 mt-0.5">{o.warningRed}</div>
              </div>
              <div>
                <span className="text-[10px] text-[var(--fg-muted)]">Uyarı</span>
                <div className="font-bold text-sm text-amber-500 mt-0.5">{o.warningOrange}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div data-tour="sentostrack-overview-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Stok Sağlığı */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <h3 className="font-bold text-xs text-[var(--fg)]">Stok Sağlık Dağılımı</h3>
          <div style={{ height: CHART_HEIGHT }} className="w-full">
            {levelData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)]">Uyarı verisi yok.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={levelData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {levelData.map((d, index) => (
                      <Cell key={`cell-${index}`} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Mağaza Bazında Uyarılar */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <h3 className="font-bold text-xs text-[var(--fg)]">Mağaza Bazında Kritik / Uyarı Sayıları</h3>
          <div style={{ height: CHART_HEIGHT }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storeData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                <XAxis dataKey="name" tick={AXIS_TICK} stroke="var(--border-soft)" />
                <YAxis tick={AXIS_TICK} stroke="var(--border-soft)" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Kritik" fill="var(--fg)" />
                <Bar dataKey="Uyarı" fill="var(--fg-muted)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
