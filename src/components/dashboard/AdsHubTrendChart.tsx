'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useTheme } from 'next-themes';
import type { AdsDailyPointDto } from '../../lib/api/adshub';

// recharts ham SVG prop'ları var() çözemiyor (bu oturumda defalarca karşılaşılan bug) —
// tema bazlı literal hex, globals.css'teki --accent ile birebir aynı.
const ACCENT_LIGHT = '#BF4A42';
const ACCENT_DARK = '#E08E85';
const GRID_LIGHT = 'rgba(0,0,0,0.04)';
const GRID_DARK = 'rgba(255,255,255,0.06)';
const TICK_LIGHT = '#71717a';
const TICK_DARK = '#a1a1aa';

export function AdsHubTrendChart({ data, formatSpend }: { data: AdsDailyPointDto[]; formatSpend: (n: number) => string }) {
  const { resolvedTheme, theme } = useTheme();
  const dark = (resolvedTheme ?? theme) === 'dark';
  const accent = dark ? ACCENT_DARK : ACCENT_LIGHT;
  const grid = dark ? GRID_DARK : GRID_LIGHT;
  const tick = dark ? TICK_DARK : TICK_LIGHT;

  const points = data.map((d) => ({ ...d, label: d.date.slice(5) }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="adshub-spend-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={accent} stopOpacity={0.28} />
            <stop offset="95%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} style={{ fontSize: 9.5, fill: tick }} interval="preserveStartEnd" />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
          formatter={((value: unknown) => [formatSpend(Number(value)), '']) as never}
          labelFormatter={(label) => String(label)}
        />
        <Area type="monotone" dataKey="spendTry" stroke={accent} strokeWidth={2} fill="url(#adshub-spend-gradient)" dot={false} activeDot={{ r: 3.5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
