'use client';

import { AlertTriangle, PackagePlus, Boxes, Layers, LayoutDashboard } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { useBaseTrackSummary, useBaseTrackStockWarnings } from '@/hooks/basetrack/useBaseTrack';
import { ErrorState } from './shared';

const TOOLTIP_STYLE = {
  borderRadius: 4,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  fontSize: 11,
  color: 'var(--fg)',
};
const CHART_HEIGHT = 220;
const AXIS_TICK = { fontSize: 10.5, fill: 'var(--fg-muted)' };

export function OverviewTab() {
  const summary = useBaseTrackSummary();
  const warnings = useBaseTrackStockWarnings({});

  const data = summary.data;
  const loading = summary.isLoading || warnings.isLoading;
  const error = summary.error ?? warnings.error;

  const warningCounts = {
    critical: warnings.data?.summary.redCount ?? 0,
    warn: warnings.data?.summary.orangeCount ?? 0,
    watch: warnings.data?.summary.yellowCount ?? 0,
    safe: warnings.data?.summary.greenCount ?? 0,
  };

  const statusPieData = [
    { name: 'Kritik (Tükenmek Üzere)', count: warningCounts.critical, fill: 'var(--fg)' },
    { name: 'Uyarı (Sipariş Zamanı)', count: warningCounts.warn, fill: 'var(--fg-muted)' },
    { name: 'İzleme (Eşik Yakın)', count: warningCounts.watch, fill: 'var(--border)' },
    { name: 'Güvenli (Stok Yeterli)', count: warningCounts.safe, fill: 'var(--bg-subtle)' },
  ].filter((d) => d.count > 0);

  const topShortages = (warnings.data?.items ?? [])
    .filter((w) => w.depotShortage > 0)
    .slice(0, 8)
    .map((w) => ({
      sku: w.sku,
      'Eksik Adet': w.depotShortage,
      'UK Stok': w.ukStock,
    }));

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div data-tour="basetrack-overview-header">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">BaseTrack UK Depo & Sevkiyat Özeti</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          UK Base deposu, DEMO UK transferleri, stok devir hızı ve kritik uyarılar.
        </p>
      </div>

      {error && <ErrorState text={error.message} />}

      {/* KPI Cards Strip */}
      <div data-tour="basetrack-overview-kpis" className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--fg-muted)]">
            <span className="text-[10.5px] font-semibold uppercase">TR Depo Adet</span>
            <Boxes size={13} />
          </div>
          <div className="text-xl font-bold text-[var(--fg)] my-1">
            {data ? data.trDepotQty.toLocaleString('tr-TR') : '—'}
          </div>
          <div className="text-[10px] text-[var(--fg-muted)]">DEMO TR depo stoğu</div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--fg-muted)]">
            <span className="text-[10.5px] font-semibold uppercase">UK Depo Adet</span>
            <Layers size={13} />
          </div>
          <div className="text-xl font-bold text-[var(--fg)] my-1">
            {data ? data.ukDepotQty.toLocaleString('tr-TR') : '—'}
          </div>
          <div className="text-[10px] text-[var(--fg-muted)]">Fiziksel UK Base stoğu</div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--fg-muted)]">
            <span className="text-[10.5px] font-semibold uppercase">Yoldaki / Transit</span>
            <PackagePlus size={13} />
          </div>
          <div className="text-xl font-bold text-[var(--fg)] my-1">
            {data ? data.inTransitQty.toLocaleString('tr-TR') : '—'}
          </div>
          <div className="text-[10px] text-[var(--fg-muted)]">Sevkiyat hattındaki adet</div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--fg-muted)]">
            <span className="text-[10.5px] font-semibold uppercase">Kritik Stok Uyarısı</span>
            <AlertTriangle size={13} />
          </div>
          <div className="text-xl font-bold text-rose-500 my-1">
            {warningCounts.critical} SKU
          </div>
          <div className="text-[10px] text-[var(--fg-muted)]">Acil sipariş gerektiriyor</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div data-tour="basetrack-overview-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Stok Sağlık Dağılımı */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <h3 className="font-bold text-xs text-[var(--fg)]">Stok Sağlık & Eşik Dağılımı</h3>
          <div style={{ height: CHART_HEIGHT }} className="w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)]">Yükleniyor...</div>
            ) : statusPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)]">Veri yok.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* En Yüksek Stok Eksikleri */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <h3 className="font-bold text-xs text-[var(--fg)]">Kritik Stok Eksikleri (SKU Bazında)</h3>
          <div style={{ height: CHART_HEIGHT }} className="w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)]">Yükleniyor...</div>
            ) : topShortages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)]">Stok eksiği bulunmuyor.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topShortages} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="sku" tick={AXIS_TICK} stroke="var(--border-soft)" />
                  <YAxis tick={AXIS_TICK} stroke="var(--border-soft)" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Eksik Adet" fill="var(--fg)" />
                  <Bar dataKey="UK Stok" fill="var(--fg-muted)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
