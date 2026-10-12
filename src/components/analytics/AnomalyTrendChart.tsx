'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from 'next-themes';
import type { AnomalyGroup } from '../../types/api';

interface AnomalyTrendChartProps {
  group: AnomalyGroup;
  color: string;
  orderLabel: string;
}

export function AnomalyTrendChart({ group, color, orderLabel }: AnomalyTrendChartProps) {
  const { resolvedTheme, theme } = useTheme();
  const dark = (resolvedTheme ?? theme) === 'dark';
  const axisColor = dark ? '#94a3b8' : '#64748b';
  const gridColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const meanColor = dark ? '#94a3b8' : '#64748b';
  const warningColor = dark ? '#f59e0b' : '#d97706';
  const dangerColor = dark ? '#ef4444' : '#dc2626';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={group.hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="anomaly-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: axisColor }} interval={3} />
        <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: axisColor }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow-md)' }}
          formatter={(value: number | string | readonly (number | string)[] | undefined) => [value ?? '', orderLabel]}
        />
        <ReferenceLine
          y={group.mean}
          stroke={meanColor}
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{ value: `μ=${group.mean}`, position: 'insideTopRight', fill: meanColor, fontSize: 10 }}
        />
        {group.stdDev > 0 && (
          <>
            <ReferenceLine
              y={group.mean + 2 * group.stdDev}
              stroke={warningColor}
              strokeDasharray="2 4"
              strokeWidth={1}
              label={{ value: '+2σ', position: 'insideTopRight', fill: warningColor, fontSize: 9 }}
            />
            <ReferenceLine
              y={group.mean + 3 * group.stdDev}
              stroke={dangerColor}
              strokeDasharray="2 4"
              strokeWidth={1}
              label={{ value: '+3σ', position: 'insideTopRight', fill: dangerColor, fontSize: 9 }}
            />
          </>
        )}
        <Area
          type="monotone"
          dataKey="count"
          stroke={color}
          strokeWidth={2.5}
          fill="url(#anomaly-area-gradient)"
          dot={{ r: 2.5, fill: color }}
          activeDot={{ r: 5, strokeWidth: 2 }}
          animationDuration={800}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
