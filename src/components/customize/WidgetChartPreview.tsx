'use client';

import { useId, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useI18n } from '../../lib/i18n';
import type { ChartDataPoint } from '../../types/api';
import { COLOR_FALLBACK, THEME_COLORS } from './widget-controls';

export function WidgetChartPreview({
  chartType, data, color, showGrid, showLegend, strokeWidth, useGradient, limit, valueFormat, aggregate, aggregate2, showDataLabels
}: {
  chartType: string; data: ChartDataPoint[] | undefined;
  color: string; showGrid: boolean; showLegend: boolean;
  strokeWidth: number; useGradient: boolean; limit: string; valueFormat: string;
  aggregate: string; aggregate2: string; showDataLabels: boolean;
}) {
  const { t } = useI18n();
  const gradId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data?.length) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <svg viewBox="0 0 64 44" width="72" style={{ opacity: 0.18 }}>
          <rect x="4"  y="20" width="10" height="20" rx="2" fill="currentColor" />
          <rect x="18" y="12" width="10" height="28" rx="2" fill="currentColor" />
          <rect x="32" y="6"  width="10" height="34" rx="2" fill="currentColor" />
          <rect x="46" y="16" width="10" height="24" rx="2" fill="currentColor" />
        </svg>
        <p style={{ fontSize: 12.5, color: 'var(--fg-subtle)', fontWeight: 500 }}>{t('customize_preview_empty_hint')}</p>
      </div>
    );
  }

  const limitVal = limit === 'all' ? null : Number(limit);
  const d = limitVal ? data.slice(0, limitVal) : data;

  const theme = THEME_COLORS.find(t => t.id === color);
  const pal = theme ? theme.palette : COLOR_FALLBACK;

  const hasVar2 = !!aggregate2 && aggregate2 !== 'none';

  const fmtVal = (raw: unknown) => {
    const v = Number(raw);
    if (valueFormat === 'currency') return '₺' + (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toLocaleString('tr-TR'));
    if (valueFormat === 'percent') return v.toFixed(1) + '%';
    return v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toLocaleString('tr-TR');
  };

  const labelStyle = { fontSize: 9.5, fill: 'var(--fg-muted)', fontWeight: 700 };
  const axis = { fill: 'var(--fg-muted)', fontSize: 10.5 };
  const tip = {
    contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)', fontSize: 12 },
    labelStyle: { color: 'var(--fg)', fontWeight: 600 },
    itemStyle: { color: 'var(--fg-muted)' },
  };
  const margin = { top: 12, right: 16, bottom: 52, left: 16 };
  const xProps = {
    dataKey: 'label' as const,
    tick: { ...axis, angle: -38, textAnchor: 'end' as const },
    height: 64,
    axisLine: false, tickLine: false,
  };
  const yProps = { tick: axis, axisLine: false, tickLine: false, width: 44 };
  const grid = showGrid ? <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} /> : null;
  const leg = showLegend ? <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--fg-muted)', paddingTop: 6 }} /> : null;

  if (chartType === 'pie' || chartType === 'donut') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={d} dataKey="value" nameKey="label" cx="50%" cy="44%"
            innerRadius={chartType === 'donut' ? '38%' : 0}
            outerRadius="62%" strokeWidth={1} stroke="var(--card)"
            onMouseEnter={(_, index) => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {d.map((_, i) => {
              const isHovered = hoveredIndex === i;
              const cellColor = isHovered ? pal[i % pal.length] : 'rgba(148, 163, 184, 0.35)';
              return <Cell key={i} fill={cellColor} style={{ transition: 'fill 0.2s ease', cursor: 'pointer' }} />;
            })}
          </Pie>
          <Tooltip {...tip} formatter={(v: unknown) => fmtVal(v)} />
          {showLegend && (
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--fg-muted)', paddingTop: 6 }} />
          )}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'horizontal-bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={d} layout="vertical" margin={{ top: 8, right: 20, bottom: 8, left: 8 }} barCategoryGap="25%">
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" horizontal={false} />}
          <XAxis type="number" tick={axis} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtVal(v)} />
          <YAxis type="category" dataKey="label" tick={axis} axisLine={false} tickLine={false} width={80}
            tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v} />
          <Tooltip {...tip} formatter={(v: unknown) => fmtVal(v)} />
          {leg}
          <Bar dataKey="value" name={aggregate} fill={pal[0 % pal.length]} radius={[0, 4, 4, 0]}>
            {!hasVar2 && d.map((_, i) => <Cell key={i} fill={pal[i % pal.length]} />)}
            {showDataLabels && <LabelList dataKey="value" position="right" formatter={fmtVal} style={labelStyle} />}
          </Bar>
          {hasVar2 && (
            <Bar dataKey="value2" name={aggregate2} fill={pal[3 % pal.length]} radius={[0, 4, 4, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'radial') {
    const radData = d.map((row, i) => ({ ...row, fill: pal[i % pal.length] }));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%"
          data={radData} startAngle={180} endAngle={-180}>
          <RadialBar dataKey="value" background={{ fill: 'var(--border)' }} cornerRadius={4}
            label={{ position: 'insideStart', fill: '#fff', fontSize: 9 }} />
          <Tooltip {...tip} formatter={(v: unknown) => fmtVal(v)} />
          {showLegend && <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: 'var(--fg-muted)' }} />}
        </RadialBarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={d} margin={margin}>
          {grid}
          <XAxis {...xProps} />
          <YAxis {...yProps} />
          <Tooltip {...tip} formatter={(v: unknown) => fmtVal(v)} />
          {leg}
          <Line type="monotone" dataKey="value" name={aggregate} stroke={color} strokeWidth={strokeWidth}
            dot={{ r: 3.5, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }}>
            {showDataLabels && <LabelList dataKey="value" position="top" formatter={fmtVal} style={labelStyle} />}
          </Line>
          {hasVar2 && (
            <Line type="monotone" dataKey="value2" name={aggregate2} stroke="#8b5cf6" strokeWidth={strokeWidth}
              dot={{ r: 3.5, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'stepped-line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={d} margin={margin}>
          {grid}
          <XAxis {...xProps} />
          <YAxis {...yProps} />
          <Tooltip {...tip} formatter={(v: unknown) => fmtVal(v)} />
          {leg}
          <Line type="stepAfter" dataKey="value" name={aggregate} stroke={color} strokeWidth={strokeWidth} dot={false} />
          {hasVar2 && (
            <Line type="stepAfter" dataKey="value2" name={aggregate2} stroke="#8b5cf6" strokeWidth={strokeWidth} dot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={d} margin={margin}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={useGradient ? 0.3 : 0} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${gradId}-2`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={useGradient ? 0.3 : 0} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          <XAxis {...xProps} />
          <YAxis {...yProps} />
          <Tooltip {...tip} formatter={(v: unknown) => fmtVal(v)} />
          {leg}
          <Area type="monotone" dataKey="value" name={aggregate} stroke={color} strokeWidth={strokeWidth} fill={`url(#${gradId})`}>
            {showDataLabels && <LabelList dataKey="value" position="top" formatter={fmtVal} style={labelStyle} />}
          </Area>
          {hasVar2 && (
            <Area type="monotone" dataKey="value2" name={aggregate2} stroke="#8b5cf6" strokeWidth={strokeWidth} fill={`url(#${gradId}-2)`} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'composed') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={d} margin={margin}>
          {grid}
          <XAxis {...xProps} />
          <YAxis {...yProps} />
          <Tooltip {...tip} formatter={(v: unknown) => fmtVal(v)} />
          {leg}
          <Bar dataKey="value" name={aggregate} fill={color} radius={[4, 4, 0, 0]} barSize={22}>
            {showDataLabels && <LabelList dataKey="value" position="top" formatter={fmtVal} style={labelStyle} />}
          </Bar>
          {hasVar2 && (
            <Line type="monotone" dataKey="value2" name={aggregate2} stroke="#8b5cf6" strokeWidth={strokeWidth} dot={{ r: 3, fill: '#8b5cf6' }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

function getMetricDescription(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('ciro') || lower.includes('revenue') || lower.includes('satış')) {
    return 'Ciro: Toplam kazanılan satış tutarı';
  }
  if (lower.includes('kâr') || lower.includes('profit')) {
    return 'Kâr: Satışlardan elde edilen net kazanç (Maliyetler hariç)';
  }
  if (lower.includes('sipariş') || lower.includes('order')) {
    return 'Sipariş: Toplam alınan sipariş adedi';
  }
  if (lower.includes('iade') || lower.includes('return')) {
    return 'İade Oranı: İptal/iade edilen siparişlerin toplam siparişlere oranı';
  }
  if (lower.includes('aov') || lower.includes('ortalama')) {
    return 'Ortalama Sipariş Tutarı: Siparişlerin ortalama sepet büyüklüğü';
  }
  return value;
}

  if (chartType === 'radar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="48%" outerRadius="66%" data={d}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="label"
            tick={(props) => {
              const { payload, x, y, textAnchor } = props;
              const desc = getMetricDescription(payload.value);
              return (
                <text
                  x={x}
                  y={y}
                  textAnchor={textAnchor}
                  style={{ fontSize: 10, fill: 'var(--fg-muted)', cursor: 'help' }}
                >
                  <title>{desc}</title>
                  {payload.value}
                </text>
              );
            }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 'auto']} style={{ fontSize: 9 }} />
          <Tooltip {...tip} formatter={(v: unknown) => fmtVal(v)} />
          {leg}
          <Radar name={aggregate} dataKey="value" stroke={color} fill={color} fillOpacity={0.45} />
          {hasVar2 && (
            <Radar name={aggregate2} dataKey="value2" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
          )}
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart data={d} margin={margin}>
          {grid}
          <XAxis dataKey="label" name={t('widget_category_column')} tick={axis} />
          <YAxis type="number" dataKey="value" name={aggregate} tick={axis} tickFormatter={(v: number) => fmtVal(v)} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: unknown) => fmtVal(v)} />
          {leg}
          <Scatter name={aggregate} dataKey="value" fill={color} />
          {hasVar2 && (
            <Scatter name={aggregate2} dataKey="value2" fill="#8b5cf6" />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // bar (default)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={d} margin={margin} barCategoryGap="30%">
        {grid}
        <XAxis {...xProps} />
        <YAxis {...yProps} />
        <Tooltip {...tip} cursor={{ fill: 'var(--bg-subtle)' }} formatter={(v: unknown) => fmtVal(v)} />
        {leg}
        <Bar dataKey="value" name={aggregate} radius={[4, 4, 0, 0]}>
          {!hasVar2 && d.map((_, i) => <Cell key={i} fill={pal[i % pal.length]} />)}
          {hasVar2 && d.map((_, i) => <Cell key={i} fill={pal[0 % pal.length]} />)}
          {showDataLabels && <LabelList dataKey="value" position="top" formatter={fmtVal} style={labelStyle} />}
        </Bar>
        {hasVar2 && (
          <Bar dataKey="value2" name={aggregate2} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Data summary bar ─────────────────────────────────────────────────────────
