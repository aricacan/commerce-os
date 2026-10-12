'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid, RadialBarChart, RadialBar, Cell,
} from 'recharts';
import {
  dashboardApi, orderApi, anomalyApi,
  cannibalizationApi, cohortApi,
} from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useDashboardFilters } from '../../stores/dashboard-filters';
import type { DynamicChartRequest, ChartDataPoint } from '../../types/api';
import { useRef, useState, useEffect, useMemo } from 'react';
import { RefreshCw, Maximize2, X, type LucideIcon } from 'lucide-react';
import { resolveWidgetIcon } from '../../lib/widget-icons';

// Builtin widget'ların ikonu grafik tipinden türetilir (her def'e ayrı ayrı ikon yazmak yerine) —
// böylece tüm builtin'ler de StaticWidgets tarzı ikon rozetini kazanır.
function builtinIconName(chartType: string): string {
  if (chartType.includes('pie') || chartType.includes('donut') || chartType.includes('platform') || chartType.includes('radial')) return 'PieChart';
  if (chartType.includes('line') || chartType.includes('area')) return 'LineChart';
  if (chartType === 'stat') return 'Gauge';
  if (chartType === 'radar') return 'Target';
  if (chartType === 'scatter' || chartType === 'composed') return 'Activity';
  return 'BarChart3';
}
import { ExportMenu } from '../ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import { platformColorOrNull } from '../../lib/platform-colors';
import { orderStatusLabel } from '../../utils/orderStatusLabel';

// Jenerik grafik export'u: Kategori + Değer. Değer'in birimi (adet/para) widget'a göre
// değiştiğinden statik bilinemez; genel sayısal biçim (decimal) uygulanır.
const GENERIC_CHART_COLS: ExportColumn[] = [
  { key: 'Kategori', header: 'Kategori', type: 'text' },
  { key: 'Değer', header: 'Değer', type: 'decimal' },
];

const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];


const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  'Teslim Edildi': { bg: 'rgba(16,185,129,0.12)',  text: '#10b981' },
  'Kargoda':       { bg: 'rgba(59,130,246,0.12)',  text: '#3b82f6' },
  'İptal':         { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444' },
  'İade':          { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b' },
  'Beklemede':     { bg: 'rgba(139,92,246,0.12)', text: '#8b5cf6' },
  'Hazırlanıyor':  { bg: 'rgba(20,184,166,0.12)', text: '#14b8a6' },
};

const THEME_COLORS = [
  { id: '#ef4444', palette: ['#ef4444','#f87171','#fca5a5','#fee2e2','#b91c1c','#991b1b'] },
  { id: '#3b82f6', palette: ['#3b82f6','#60a5fa','#93c5fd','#dbeafe','#1d4ed8','#1e40af'] },
  { id: '#10b981', palette: ['#10b981','#34d399','#6ee7b7','#d1fae5','#047857','#065f46'] },
  { id: '#f59e0b', palette: ['#f59e0b','#fbbf24','#fde68a','#fef3c7','#b45309','#92400e'] },
  { id: '#8b5cf6', palette: ['#8b5cf6','#a78bfa','#c4b5fd','#ede9fe','#6d28d9','#5b21b6'] },
  { id: '#64748b', palette: ['#64748b','#94a3b8','#cbd5e1','#f1f5f9','#475569','#334155'] },
];

interface BuiltinWidgetConfig { type: 'builtin'; id: string }
interface CustomWidgetConfig  { type: 'custom';  chartType: string; configJson: string; title?: string }
export type WidgetConfig = BuiltinWidgetConfig | CustomWidgetConfig;

interface Props { config: WidgetConfig; editMode: boolean; onRemove: () => void }

// Özel widget'ın configJson'ı hem sorgu hem stil ayarlarını taşır. Kullanıcı tarafından
// üretilip veritabanında metin olarak saklandığı için şekli garanti DEĞİL.
interface CustomWidgetSettings {
  groupBy?: string;
  aggregate?: string;
  description?: string;
  icon?: string;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  strokeWidth?: number;
  useGradient?: boolean;
  limit?: number;
  valueFormat?: string;
}

// Bozuk JSON tüm panoyu çökertmesin: eskiden JSON.parse doğrudan render sırasında
// çağrılıyordu ve tek bir hatalı kayıt tüm dashboard'u beyaz ekrana düşürüyordu.
// Bozuk config'te widget "veri yok" durumunda kalır (groupBy/aggregate boş → sorgu kapalı).
function parseWidgetConfigJson(raw: string): CustomWidgetSettings {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as CustomWidgetSettings) : {};
  } catch {
    return {};
  }
}

const axisStyle = { fill: 'var(--fg-muted)', fontSize: 10 };
const tooltipProps = {
  contentStyle: {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--fg)', fontSize: 12,
    boxShadow: 'var(--shadow-md)',
  },
  labelStyle: { color: 'var(--fg)', fontWeight: 600, marginBottom: 2 },
  itemStyle:  { color: 'var(--fg-muted)' },
};

// ─── Animated platform bars (replaces pie) ───────────────────────────────────

function PlatformAnimatedBars({ data }: { data: ChartDataPoint[] }) {
  const { t } = useI18n();
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(timer); }, [data]);

  const total = data.reduce((s, d) => s + d.value, 0);
  const max   = Math.max(...data.map(d => d.value), 1);

  if (!data.length) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('no_data')}</span></div>;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, padding: '4px 0' }}>
      {data.map((d, i) => {
        const color    = platformColorOrNull(d.label) ?? PALETTE[i % PALETTE.length];
        const barPct   = (d.value / max) * 100;
        const sharePct = total > 0 ? (d.value / total) * 100 : 0;
        return (
          <div key={d.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, boxShadow: `0 0 6px ${color}88` }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{d.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color }}>{sharePct.toFixed(1)}%</span>
                <span style={{ fontSize: 10, color: 'var(--fg-muted)', minWidth: 28, textAlign: 'right' }}>{d.value}</span>
              </div>
            </div>
            <div style={{ height: 9, background: 'var(--border-soft)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: animated ? `${barPct}%` : '0%',
                background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                borderRadius: 99,
                transition: `width 0.75s cubic-bezier(0.4,0,0.2,1) ${i * 110}ms`,
                boxShadow: `0 0 10px ${color}44`,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Animated status cards (replaces donut) ──────────────────────────────────

function StatusAnimatedCards({ data }: { data: ChartDataPoint[] }) {
  const { t } = useI18n();
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(timer); }, [data]);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (!data.length) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('no_data')}</span></div>;

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, alignContent: 'start' }}>
      {data.map((d, i) => {
        const style  = STATUS_STYLE[d.label] || { bg: `${PALETTE[i % PALETTE.length]}18`, text: PALETTE[i % PALETTE.length] };
        const sharePct = total > 0 ? (d.value / total) * 100 : 0;
        return (
          <div key={d.label} style={{
            background: style.bg,
            borderRadius: 10,
            padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 3,
            transform: animated ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(8px)',
            opacity: animated ? 1 : 0,
            transition: `all 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 75}ms`,
            border: `1px solid ${style.text}22`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: 99, background: style.text, boxShadow: `0 0 5px ${style.text}` }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', lineHeight: 1 }}>{orderStatusLabel(d.label)}</span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: style.text, lineHeight: 1 }}>{d.value.toLocaleString('tr-TR')}</span>
            <span style={{ fontSize: 9, color: 'var(--fg-muted)' }}>%{sharePct.toFixed(1)} {t('widget_share_suffix')}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Anomaly mini widget ──────────────────────────────────────────────────────

function AnomalyMiniWidget({ editMode, onRemove }: { editMode: boolean; onRemove: () => void }) {
  const { t } = useI18n();
  const [animated, setAnimated] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['anomaly-overview'],
    queryFn: anomalyApi.overview,
    staleTime: 120_000,
  });
  useEffect(() => { if (data) { const timer = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(timer); } }, [data]);

  const score = data?.healthScore ?? 0;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <CardShell
      title={t('widget_system_health')} description={t('widget_system_health_desc')}
      Icon={resolveWidgetIcon('Activity')}
      color="var(--accent)" editMode={editMode} onRemove={onRemove}
      isLoading={isLoading} isError={isError} onRetry={refetch}
      customRender
    >
      {data && (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Health ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
              <svg viewBox="0 0 72 72" width={72} height={72}>
                <circle cx={36} cy={36} r={28} fill="none" stroke="var(--border-soft)" strokeWidth={8} />
                <circle cx={36} cy={36} r={28} fill="none" stroke={scoreColor}
                  strokeWidth={8} strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={animated ? `${2 * Math.PI * 28 * (1 - score / 100)}` : `${2 * Math.PI * 28}`}
                  transform="rotate(-90 36 36)"
                  style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)', boxShadow: `0 0 12px ${scoreColor}` }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score}</span>
                <span style={{ fontSize: 8, color: 'var(--fg-muted)', fontWeight: 700 }}>{t('widget_health_label')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {[
                { label: t('widget_health_critical'), val: data.criticalCount, color: '#ef4444' },
                { label: t('widget_health_warning'), val: data.warningCount,  color: '#f59e0b' },
                { label: t('widget_health_unread'), val: data.unreadCount, color: '#3b82f6' },
              ].map((item, i) => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  transform: animated ? 'translateX(0)' : 'translateX(-12px)',
                  opacity: animated ? 1 : 0,
                  transition: `all 0.4s ease ${i * 80 + 200}ms`,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, boxShadow: `0 0 6px ${item.color}88` }} />
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)', flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: item.color }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--fg-muted)', marginTop: 'auto' }}>
            {t('widget_total_label')} <strong style={{ color: 'var(--fg)' }}>{data.totalAnomalies}</strong> {t('widget_anomaly_detected_suffix')}
          </div>
        </div>
      )}
    </CardShell>
  );
}

// ─── Cannibalization mini widget ─────────────────────────────────────────────

function CannibalizationMiniWidget({ editMode, onRemove }: { editMode: boolean; onRemove: () => void }) {
  const { t } = useI18n();
  const [animated, setAnimated] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cannibalization-matrix'],
    queryFn: cannibalizationApi.matrix,
    staleTime: 300_000,
  });
  useEffect(() => { if (data) { const timer = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(timer); } }, [data]);

  const top5 = [...(data?.matrix ?? [])].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <CardShell
      title={t('widget_cannibalization')} description={t('widget_cannibalization_desc')}
      Icon={resolveWidgetIcon('Layers')}
      color="var(--accent)" editMode={editMode} onRemove={onRemove}
      isLoading={isLoading} isError={isError} onRetry={refetch}
      customRender
    >
      {data && (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 9, justifyContent: 'center' }}>
          {top5.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--fg-muted)', paddingTop: 20 }}>{t('widget_cannibalization_empty')}</div>
          ) : top5.map((pair, i) => (
            <div key={`${pair.brand1}-${pair.brand2}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--fg)' }}>
                  {pair.brand1} <span style={{ color: 'var(--fg-muted)' }}>↔</span> {pair.brand2}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)' }}>{(pair.score * 100).toFixed(0)}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--border-soft)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: animated ? `${pair.score * 100}%` : '0%',
                  background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, transparent))',
                  borderRadius: 99,
                  transition: `width 0.75s cubic-bezier(0.4,0,0.2,1) ${i * 100}ms`,
                  boxShadow: '0 0 8px color-mix(in srgb, var(--accent) 33%, transparent)',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

// ─── Cohort mini widget ───────────────────────────────────────────────────────

function CohortMiniWidget({ editMode, onRemove }: { editMode: boolean; onRemove: () => void }) {
  const { t } = useI18n();
  const [animated, setAnimated] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cohort-mini'],
    queryFn: () => cohortApi.get(),
    staleTime: 300_000,
  });
  useEffect(() => { if (data) { const timer = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(timer); } }, [data]);

  const rows = (data?.matrix ?? []).slice(0, 4);
  const maxOffset = Math.min(data?.maxMonthOffset ?? 0, 4);

  function retentionColor(rate: number): string {
    if (rate >= 0.7) return '#10b981';
    if (rate >= 0.4) return '#f59e0b';
    if (rate >= 0.1) return '#f97316';
    return '#ef4444';
  }

  return (
    <CardShell
      title={t('widget_cohort_analysis')} description={t('widget_cohort_analysis_desc')}
      Icon={resolveWidgetIcon('Users')}
      color="var(--accent)" editMode={editMode} onRemove={onRemove}
      isLoading={isLoading} isError={isError} onRetry={refetch}
      customRender
    >
      {data && (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10 }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: `90px repeat(${maxOffset + 1}, 1fr)`, gap: 3 }}>
            <span style={{ color: 'var(--fg-muted)', fontWeight: 700 }}>{t('widget_cohort_column')}</span>
            {Array.from({ length: maxOffset + 1 }, (_, m) => (
              <span key={m} style={{ color: 'var(--fg-muted)', fontWeight: 700, textAlign: 'center' }}>A{m}</span>
            ))}
          </div>
          {rows.map((row, ri) => (
            <div key={row.cohortMonth} style={{ display: 'grid', gridTemplateColumns: `90px repeat(${maxOffset + 1}, 1fr)`, gap: 3 }}>
              <span style={{ color: 'var(--fg)', fontWeight: 600, fontSize: 9, alignSelf: 'center' }}>
                {row.cohortMonth.slice(0, 7)}
              </span>
              {Array.from({ length: maxOffset + 1 }, (_, m) => {
                const cell = row.cells.find(c => c.monthOffset === m);
                const rate = cell?.retentionRate ?? 0;
                const pct  = m === 0 ? 100 : Math.round(rate * 100);
                // Baseline (A0, her zaman %100) retention gradient'inden ayrı, tek
                // accent tonuyla nötr gösteriliyor — "başarı" gibi okunmasın diye.
                const isBaseline = m === 0;
                const bg = isBaseline ? 'var(--accent-soft)' : `${retentionColor(rate)}${Math.round(Math.max(rate, 0.05) * 255).toString(16).padStart(2, '0')}`;
                return (
                  <div key={m} title={`${row.cohortMonth.slice(0, 7)} A${m}: %${pct}`} style={{
                    background: bg,
                    borderRadius: 5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '4px 2px',
                    transform: animated ? 'scale(1)' : 'scale(0)',
                    transition: `transform 0.3s ease ${(ri * (maxOffset + 1) + m) * 30}ms`,
                  }}>
                    <span style={{ fontSize: 8.5, fontWeight: 800, color: isBaseline ? 'var(--accent)' : '#fff' }}>{cell ? `%${pct}` : '—'}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

// ─── Generic ChartRenderer ────────────────────────────────────────────────────

function ChartRenderer({
  data, chartType, styleConfig = {},
}: {
  data: ChartDataPoint[];
  chartType: string;
  styleConfig?: {
    color?: string; showGrid?: boolean; showLegend?: boolean;
    strokeWidth?: number; useGradient?: boolean;
    limit?: string | number | null; valueFormat?: string;
  };
}) {
  const { t } = useI18n();

  if (!data?.length) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>{t('dashboard_no_data')}</p>
    </div>
  );

  const limitVal      = styleConfig.limit === 'all' || !styleConfig.limit ? null : Number(styleConfig.limit);
  const processedData = limitVal && limitVal > 0 ? data.slice(0, limitVal) : data;
  const mainColor     = styleConfig.color || 'var(--accent)';
  const strokeWidth   = styleConfig.strokeWidth ?? 2;
  const showGrid      = styleConfig.showGrid ?? false;
  const showLegend    = styleConfig.showLegend ?? false;
  const useGradient   = styleConfig.useGradient ?? true;
  const valueFormat   = styleConfig.valueFormat ?? 'number';
  const gradId        = `chartGrad-${mainColor.replace(/[^a-z0-9]/gi, '')}`;

  const fmtVal = (raw: unknown) => {
    const v = Number(raw);
    if (valueFormat === 'currency') return '₺' + (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toLocaleString('tr-TR'));
    if (valueFormat === 'percent') return v.toFixed(1) + '%';
    return v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toLocaleString('tr-TR');
  };

  const matchedTheme  = THEME_COLORS.find(t => t.id === mainColor);
  const activePalette = matchedTheme ? matchedTheme.palette : PALETTE;

  // ── platform-animated: used by platform-dist widget ──
  if (chartType === 'platform-animated') return <PlatformAnimatedBars data={processedData} />;

  // ── status-animated: used by order-status widget ──
  if (chartType === 'status-animated') return <StatusAnimatedCards data={processedData} />;

  if (chartType === 'stat') {
    const pct = processedData[0].value;
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <p style={{ fontSize: 42, fontWeight: 800, color: mainColor, lineHeight: 1, letterSpacing: -1 }}>
          {typeof pct === 'number' ? pct.toFixed(1) + '%' : pct}
        </p>
        <p style={{ fontSize: 11, color: 'var(--fg-muted)', textAlign: 'center' }}>{t('widget_ai_success_caption')}</p>
      </div>
    );
  }

  if (chartType === 'donut') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="25%" outerRadius="90%"
          data={processedData.map((d, i) => ({ ...d, fill: activePalette[i % activePalette.length] }))}
          startAngle={90} endAngle={-270}>
          <RadialBar dataKey="value" background={{ fill: 'var(--border-soft)' }} cornerRadius={4} isAnimationActive />
          <Tooltip {...tooltipProps} formatter={(v: unknown) => fmtVal(v)} />
          {showLegend && <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--fg-muted)' }} />}
        </RadialBarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'horizontal-bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={processedData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" horizontal={false} />}
          <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} width={80}
            tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + '…' : v} />
          <Tooltip {...tooltipProps} formatter={(v: unknown) => fmtVal(v)} />
          {showLegend && <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--fg-muted)' }} />}
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive>
            {processedData.map((_, i) => <Cell key={i} fill={activePalette[i % activePalette.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'radial') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%"
          data={processedData.map((d, i) => ({ ...d, fill: activePalette[i % activePalette.length] }))}
          startAngle={180} endAngle={-180}>
          <RadialBar dataKey="value" background={{ fill: 'var(--border)' }} cornerRadius={4} isAnimationActive />
          <Tooltip {...tooltipProps} formatter={(v: unknown) => fmtVal(v)} />
          {showLegend && <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: 'var(--fg-muted)' }} />}
        </RadialBarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={processedData} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />}
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={38} />
          <Tooltip {...tooltipProps} formatter={(v: unknown) => fmtVal(v)} />
          {showLegend && <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--fg-muted)', paddingTop: 4 }} />}
          <Line type="monotone" dataKey="value" stroke={mainColor} strokeWidth={strokeWidth}
            dot={{ r: 2, strokeWidth: 0, fill: mainColor }} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={processedData} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={mainColor} stopOpacity={useGradient ? 0.35 : 0} />
              <stop offset="95%" stopColor={mainColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />}
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={38} />
          <Tooltip {...tooltipProps} formatter={(v: unknown) => fmtVal(v)} />
          {showLegend && <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--fg-muted)', paddingTop: 4 }} />}
          <Area type="monotone" dataKey="value" stroke={mainColor} strokeWidth={strokeWidth}
            fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // default: Bar
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={processedData} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />}
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={38} />
        <Tooltip {...tooltipProps} formatter={(v: unknown) => fmtVal(v)} />
        {showLegend && <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--fg-muted)', paddingTop: 4 }} />}
        <Bar dataKey="value" fill={mainColor} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive>
          {useGradient && processedData.map((_, i) => <Cell key={i} fill={activePalette[i % activePalette.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Builtin definitions ──────────────────────────────────────────────────────

interface BuiltinDef {
  titleKey: string;
  chartType: string;
  // from/to = üstteki global tarih aralığı filtresi (useDashboardFilters). Her widget bu
  // aralığa göre şekillenir; tarihe bağlı olmayan widget'lar (AI başarısı) argümanları yok sayar.
  query: (from: string, to: string) => Promise<ChartDataPoint[]>;
  color: string;
  descriptionKey: string;
}

const BUILTIN: Record<string, BuiltinDef> = {
  'platform-dist': {
    titleKey: 'widget_platform_dist', chartType: 'platform-animated',
    color: 'var(--accent)',
    descriptionKey: 'widget_platform_dist_desc',
    query: (from, to) => dashboardApi.dynamicChart({ groupBy: 'Platform', aggregate: 'Count', from, to }),
  },
  'revenue-trend': {
    titleKey: 'widget_revenue_trend', chartType: 'area',
    color: 'var(--accent)',
    descriptionKey: 'widget_revenue_trend_desc',
    query: async (from, to) => {
      const s = await orderApi.statsSimple(from, to);
      return s.dailyOrderCounts.map((d) => ({ label: d.date.slice(5), value: d.revenue }));
    },
  },
  'top-categories': {
    titleKey: 'widget_top_categories', chartType: 'bar',
    color: 'var(--accent)',
    descriptionKey: 'widget_top_categories_desc',
    query: (from, to) => dashboardApi.dynamicChart({ groupBy: 'Category', aggregate: 'Count', from, to }),
  },
  'category-price': {
    titleKey: 'widget_category_price', chartType: 'bar',
    color: 'var(--accent)',
    descriptionKey: 'widget_category_price_desc',
    query: (from, to) => dashboardApi.dynamicChart({ groupBy: 'Category', aggregate: 'AvgPrice', from, to }),
  },
  'ai-success': {
    titleKey: 'widget_ai_success', chartType: 'stat',
    color: 'var(--accent)',
    descriptionKey: 'widget_ai_success_desc',
    query: async () => {
      const s = await dashboardApi.summary();
      const total = s.aiCategorizedCount + s.ruleCategorizedCount + s.pendingModerationCount;
      return [{ label: 'AI Başarısı', value: total > 0 ? (s.aiCategorizedCount / total) * 100 : 0 }];
    },
  },
  'recent-orders': {
    titleKey: 'widget_recent_orders', chartType: 'bar',
    color: 'var(--accent)',
    descriptionKey: 'widget_recent_orders_desc',
    query: async (from, to) => {
      const s = await orderApi.statsSimple(from, to);
      return s.dailyOrderCounts.slice(-14).map((d) => ({ label: d.date.slice(5), value: d.count }));
    },
  },
  'top-products': {
    titleKey: 'widget_top_products', chartType: 'horizontal-bar',
    color: 'var(--accent)',
    descriptionKey: 'widget_top_products_desc',
    query: (from, to) => dashboardApi.dynamicChart({ groupBy: 'Product', aggregate: 'Count', from, to }),
  },
  'moderation-load': {
    titleKey: 'widget_moderation_load', chartType: 'line',
    color: 'var(--accent)',
    descriptionKey: 'widget_moderation_load_desc',
    query: async (from, to) => {
      const s = await orderApi.statsSimple(from, to);
      return s.dailyOrderCounts.map((d) => ({ label: d.date.slice(5), value: d.count }));
    },
  },
  'brand-sales': {
    titleKey: 'widget_brand_sales', chartType: 'horizontal-bar',
    color: 'var(--accent)',
    descriptionKey: 'widget_brand_sales_desc',
    query: (from, to) => dashboardApi.dynamicChart({ groupBy: 'Brand', aggregate: 'TotalRevenue', from, to }),
  },
  'order-status': {
    titleKey: 'widget_order_status', chartType: 'status-animated',
    color: 'var(--accent)',
    descriptionKey: 'widget_order_status_desc',
    query: (from, to) => dashboardApi.dynamicChart({ groupBy: 'OrderStatus', aggregate: 'Count', from, to }),
  },
  'stock-low': {
    titleKey: 'widget_stock_low', chartType: 'horizontal-bar',
    color: 'var(--accent)',
    descriptionKey: 'widget_stock_low_desc',
    query: (from, to) => dashboardApi.dynamicChart({ groupBy: 'Category', aggregate: 'TotalStock', from, to }),
  },
  'profit-trend': {
    titleKey: 'widget_profit_trend', chartType: 'area',
    color: 'var(--accent)',
    descriptionKey: 'widget_profit_trend_desc',
    query: async (from, to) => {
      const d = await orderApi.profitSummary(from, to);
      return d.daily.map((x) => ({ label: x.date.slice(5), value: Math.round(x.netProfit) }));
    },
  },
  'daily-orders': {
    titleKey: 'widget_daily_orders', chartType: 'line',
    color: 'var(--accent)',
    descriptionKey: 'widget_daily_orders_desc',
    query: async (from, to) => {
      const s = await orderApi.statsSimple(from, to);
      return s.dailyOrderCounts.slice(-30).map((d) => ({ label: d.date.slice(5), value: d.count }));
    },
  },
  'platform-compare': {
    titleKey: 'widget_platform_compare', chartType: 'bar',
    color: 'var(--accent)',
    descriptionKey: 'widget_platform_compare_desc',
    query: (from, to) => dashboardApi.dynamicChart({ groupBy: 'Platform', aggregate: 'TotalRevenue', from, to }),
  },
  'category-revenue': {
    titleKey: 'widget_category_revenue', chartType: 'horizontal-bar',
    color: 'var(--accent)',
    descriptionKey: 'widget_category_revenue_desc',
    query: (from, to) => dashboardApi.dynamicChart({ groupBy: 'Category', aggregate: 'TotalRevenue', from, to }),
  },
};

// ─── Expanded overlay ─────────────────────────────────────────────────────────

function ExpandedOverlay({
  title, data, color, children, onClose,
}: {
  title: string; data: ChartDataPoint[]; chartType: string; color: string;
  children: React.ReactNode; onClose: () => void;
}) {
  const { t } = useI18n();
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);

  const values = data.map(d => d.value);
  const total  = values.reduce((s, v) => s + v, 0);
  const avg    = values.length ? total / values.length : 0;
  const max    = Math.max(...values);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const trend  = values.length >= 2 ? values[values.length - 1] - values[0] : 0;
  const fmtN   = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990 }}>
      <style>{`
        @keyframes eo-fade  { from{opacity:0} to{opacity:1} }
        @keyframes eo-scale { from{opacity:0;transform:translate(-50%,-50%) scale(.85)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
      `}</style>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px) saturate(140%)', animation: 'eo-fade .2s ease both' }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 'min(94vw, 880px)', maxHeight: '90vh',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'eo-scale .22s cubic-bezier(.22,1.2,.36,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: color }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{title}</span>
            <span style={{ fontSize: 10, color: 'var(--fg-muted)', background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>{data.length} {t('widget_data_points_label')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExportMenu filename={title.replace(/\s+/g, '-').toLowerCase()} columns={GENERIC_CHART_COLS} getData={() => sorted.map(d => ({ Kategori: d.label, Değer: d.value }))} containerRef={chartRef} />
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg-muted)', transition: 'all .12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-soft)'; e.currentTarget.style.color = 'var(--danger)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[
            { label: t('widget_total_label'),   val: fmtN(total), sub: t('widget_all_values_label') },
            { label: t('widget_average_label'), val: fmtN(avg),   sub: t('widget_per_data_point') },
            { label: t('widget_maximum_label'), val: fmtN(max),   sub: sorted[0]?.label ?? '' },
            { label: t('widget_trend_label'),   val: trend > 0 ? `+${fmtN(trend)}` : fmtN(trend),
              sub: trend > 0 ? t('widget_trend_increase') : trend < 0 ? t('widget_trend_decrease') : t('widget_trend_no_change'),
              valColor: trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : 'var(--fg)' },
          ].map(s => (
            <div key={s.label} style={{ padding: '10px 16px', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.valColor ?? 'var(--fg)', lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 9, color: 'var(--fg-muted)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div ref={chartRef} style={{ height: 320, flexShrink: 0, padding: '16px 20px' }}>{children}</div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 16px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '12px 0 8px' }}>{t('widget_all_data_label')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {sorted.map((d, i) => {
              const pct = max > 0 ? (d.value / max) * 100 : 0;
              return (
                <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 70px', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--fg-muted)', textAlign: 'right' }}>#{i + 1}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)' }}>{d.label}</span>
                    <div style={{ height: 4, background: 'var(--bg-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: PALETTE[i % PALETTE.length], borderRadius: 99 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)', textAlign: 'right' }}>{fmtN(d.value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CardShell ────────────────────────────────────────────────────────────────

function CardShell({
  // onRemove BURADA kullanılmaz: widget silme butonu DashboardGrid'de, kartın üstüne
  // mutlak konumlu ayrı bir katman olarak basılıyor. Prop tipte kalıyor çünkü çağıranlar
  // hâlâ gönderiyor.
  title, description, editMode, isLoading, isError, onRetry,
  children, data, chartType, color, customRender, Icon,
}: {
  title: string; description?: string; editMode: boolean; onRemove: () => void;
  isLoading: boolean; isError: boolean; onRetry: () => void;
  children: React.ReactNode; data?: ChartDataPoint[];
  chartType?: string; color?: string; customRender?: boolean;
  Icon?: LucideIcon;
}) {
  const { t } = useI18n();
  const chartRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const canExpand = !editMode && !isLoading && !isError && !customRender && !!data?.length;
  // `color` ya gerçek hex (özel widget'ta kullanıcı seçimi) ya da 'var(--accent)' olabilir.
  // İkisinde de çalışsın diye alfa/karışım her yerde color-mix() ile üretiliyor —
  // eskiden `${color}40` gibi hex-alpha string birleştirme vardı, bu CSS var() ile
  // geçersiz değer üretip sessizce kırılıyordu.
  const resolvedColor = color ?? 'var(--accent)';

  return (
    <>
      {expanded && data && (
        <ExpandedOverlay title={title} data={data} chartType={chartType ?? 'bar'} color={color ?? 'var(--accent)'} onClose={() => setExpanded(false)}>
          {children}
        </ExpandedOverlay>
      )}

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`widget-glass-card ${hovered && canExpand ? 'widget-glass-card-hovered' : ''}`}
        style={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: canExpand ? 'pointer' : 'default', animation: 'widget-mount .4s ease both', position: 'relative', overflow: 'hidden' }}
        onClick={() => canExpand && setExpanded(true)}
      >
        {/* Accent stripe */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: resolvedColor, opacity: hovered ? 1 : 0.65, transition: 'opacity .2s' }} />

        <div
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: `linear-gradient(135deg, color-mix(in srgb, ${resolvedColor} 8%, transparent) 0%, transparent 60%)` }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: description ? 4 : 0 }}>
              {/* İkon rozeti (StaticWidgets ile aynı desen) — ikon yoksa eski küçük renkli nokta. */}
              {Icon ? (
                <span style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `linear-gradient(135deg, ${resolvedColor}, color-mix(in srgb, ${resolvedColor} 80%, transparent))`,
                  boxShadow: `0 2px 8px color-mix(in srgb, ${resolvedColor} 25%, transparent)`,
                }}>
                  <Icon size={15} color="#fff" />
                </span>
              ) : (
                <span style={{ width: 8, height: 8, borderRadius: 3, flexShrink: 0, background: resolvedColor, boxShadow: `0 0 6px color-mix(in srgb, ${resolvedColor} 38%, transparent)` }} />
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.2px', lineHeight: 1.2 }}>{title}</span>
            </div>
            {description && <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0, paddingLeft: Icon ? 37 : 15, lineHeight: 1.45 }}>{description}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {canExpand && (
              <button onClick={e => { e.stopPropagation(); setExpanded(true); }} title={t('widget_expand_tooltip')}
                style={{ display: 'flex', alignItems: 'center', padding: '4px 6px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', opacity: hovered ? 1 : 0, transition: 'opacity .15s, color .12s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-muted)')}
              >
                <Maximize2 size={12} />
              </button>
            )}
            {!editMode && !customRender && (
              <div onClick={e => e.stopPropagation()}>
                <ExportMenu filename={title.replace(/\s+/g, '-').toLowerCase()} columns={GENERIC_CHART_COLS} getData={() => (data ?? []).map(d => ({ Kategori: d.label, Değer: d.value }))} containerRef={chartRef} label="" />
              </div>
            )}
          </div>
        </div>

        <div ref={chartRef} style={{ flex: 1, padding: '14px 16px 16px', minHeight: 0, position: 'relative' }}>
          {isLoading && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 22, height: 22, borderRadius: 99, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
            </div>
          )}
          {isError && !isLoading && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t('dashboard_error')}</p>
              <button onClick={e => { e.stopPropagation(); onRetry(); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-soft)', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 11, fontWeight: 500 }}>
                <RefreshCw size={11} />{t('try_again')}
              </button>
            </div>
          )}
          {!isLoading && !isError && children}
        </div>

        <style>{`
          @keyframes widget-mount { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
          @keyframes spin { to{transform:rotate(360deg)} }
          .widget-glass-card { background: var(--card) !important; border: 1px solid var(--border) !important; border-radius: 6px !important; box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 2px 12px rgba(0,0,0,0.03) !important; transition: box-shadow 0.22s, transform 0.22s, border-color 0.22s !important; overflow: hidden; }
          .dark .widget-glass-card { box-shadow: 0 1px 4px rgba(0,0,0,0.2), 0 2px 12px rgba(0,0,0,0.15) !important; }
          .widget-glass-card-hovered { transform: translateY(-2px) !important; box-shadow: 0 6px 24px rgba(0,0,0,0.08) !important; border-color: var(--accent-dim) !important; }
          .dark .widget-glass-card-hovered { box-shadow: 0 6px 24px rgba(0,0,0,0.35) !important; }
        `}</style>
      </div>
    </>
  );
}

// ─── WidgetCard ───────────────────────────────────────────────────────────────

// SADECE YÖNLENDİRME YAPAR — burada veri çeken bir hook OLMAMALI.
//
// Önceden useQuery bu gövdenin içinde, erken return'lerden SONRA çağrılıyordu. Aynı
// konumdaki bir widget tip değiştirdiğinde (ör. builtin -> custom, veya BUILTIN'de
// karşılığı olmayan bir id) React'in gördüğü hook sayısı render'lar arasında değişip
// "Rendered more hooks than during the previous render" ile çökertiyordu. Her dal artık
// kendi bileşeninde; hook'lar koşulsuz çalışıyor ve dal değişimi remount'a dönüşüyor.
export function WidgetCard({ config, editMode, onRemove }: Props) {
  // Üstteki global tarih aralığı — tüm widget'lar bu from/to'ya göre şekillenir ve
  // aralık değişince yeniden yüklenir (queryKey'e dahil). NOT: selector ile
  // getDateParams()'ı ÇAĞIRMA — her render yeni {from,to} objesi döndürüp sonsuz döngü
  // ("getSnapshot should be cached") yaratır. Store'u selector'sız al, sonra çağır
  // (StaticWidgets/KpiBar ile aynı desen).
  const { getDateParams } = useDashboardFilters();
  const { from, to } = getDateParams();

  if (config.type === 'builtin') {
    // Special-render widgets that have custom data types / non-ChartDataPoint queries
    if (config.id === 'anomaly-mini')        return <AnomalyMiniWidget editMode={editMode} onRemove={onRemove} />;
    if (config.id === 'cannibalization-mini') return <CannibalizationMiniWidget editMode={editMode} onRemove={onRemove} />;
    if (config.id === 'cohort-mini')          return <CohortMiniWidget editMode={editMode} onRemove={onRemove} />;

    const def = BUILTIN[config.id];
    if (!def) return null;

    return (
      <BuiltinWidget
        id={config.id} def={def} from={from} to={to}
        editMode={editMode} onRemove={onRemove}
      />
    );
  }

  return (
    <CustomWidget
      config={config} from={from} to={to}
      editMode={editMode} onRemove={onRemove}
    />
  );
}

function BuiltinWidget({
  id, def, from, to, editMode, onRemove,
}: {
  id: string; def: BuiltinDef; from: string; to: string;
  editMode: boolean; onRemove: () => void;
}) {
  const { t } = useI18n();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['widget', id, from, to],
    queryFn: () => def.query(from, to),
    staleTime: 120_000,
  });

  return (
    <CardShell
      title={t(def.titleKey as Parameters<typeof t>[0])}
      description={t(def.descriptionKey as Parameters<typeof t>[0])}
      Icon={resolveWidgetIcon(builtinIconName(def.chartType))}
      color={def.color}
      editMode={editMode} onRemove={onRemove}
      isLoading={isLoading} isError={isError} onRetry={refetch}
      data={data} chartType={def.chartType}
    >
      {data && <ChartRenderer data={data} chartType={def.chartType} styleConfig={{ color: def.color }} />}
    </CardShell>
  );
}

// Custom widget — configJson hem grafik sorgusu hem stil ayarlarını taşır (untyped).
// Kayıtlı config'in kendi tarihi yoksa global from/to uygulanır (özel grafikler de
// üstteki aralığa göre şekillensin diye).
function CustomWidget({
  config, from, to, editMode, onRemove,
}: {
  config: CustomWidgetConfig; from: string; to: string;
  editMode: boolean; onRemove: () => void;
}) {
  const { t } = useI18n();
  const cfg = useMemo(() => parseWidgetConfigJson(config.configJson), [config.configJson]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['widget-custom', config.configJson, from, to],
    queryFn: () => dashboardApi.dynamicChart({ from, to, ...cfg } as DynamicChartRequest),
    enabled: !!(cfg.groupBy && cfg.aggregate),
    staleTime: 120_000,
  });

  return (
    <CardShell
      title={config.title || t('dashboard_custom_widget_title')}
      description={cfg.description}
      Icon={resolveWidgetIcon(cfg.icon)}
      editMode={editMode} onRemove={onRemove}
      isLoading={isLoading} isError={isError} onRetry={refetch}
      data={data} chartType={config.chartType} color={cfg.color}
    >
      {data && (
        <ChartRenderer
          data={data}
          chartType={config.chartType}
          styleConfig={{
            color: cfg.color, showGrid: cfg.showGrid, showLegend: cfg.showLegend,
            strokeWidth: cfg.strokeWidth, useGradient: cfg.useGradient,
            limit: cfg.limit, valueFormat: cfg.valueFormat,
          }}
        />
      )}
    </CardShell>
  );
}
