'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useTheme } from 'next-themes';
import type { OmnichannelDailyPointDto } from '../../lib/api/omnichannel';

// recharts ham SVG prop'ları var() çözemiyor (AdsHubTrendChart'ta karşılaşılan AYNI bug) —
// tema bazlı literal hex.
const BOT_LIGHT = '#3B82F6';
const BOT_DARK = '#60A5FA';
const HUMAN_LIGHT = '#F59E0B';
const HUMAN_DARK = '#FBBF24';
const GRID_LIGHT = 'rgba(0,0,0,0.04)';
const GRID_DARK = 'rgba(255,255,255,0.06)';
const TICK_LIGHT = '#71717a';
const TICK_DARK = '#a1a1aa';

export function OmnichannelTrendChart({ data }: { data: OmnichannelDailyPointDto[] }) {
  const { resolvedTheme, theme } = useTheme();
  const dark = (resolvedTheme ?? theme) === 'dark';
  const botColor = dark ? BOT_DARK : BOT_LIGHT;
  const humanColor = dark ? HUMAN_DARK : HUMAN_LIGHT;
  const grid = dark ? GRID_DARK : GRID_LIGHT;
  const tick = dark ? TICK_DARK : TICK_LIGHT;

  const points = data.map((d) => ({ ...d, label: d.date.slice(5) }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="omnichannel-bot-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={botColor} stopOpacity={0.32} />
            <stop offset="95%" stopColor={botColor} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="omnichannel-human-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={humanColor} stopOpacity={0.32} />
            <stop offset="95%" stopColor={humanColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} style={{ fontSize: 9.5, fill: tick }} interval="preserveStartEnd" />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
          labelFormatter={(label) => String(label)}
        />
        <Area type="monotone" dataKey="botMessageCount" stackId="1" name="Bot" stroke={botColor} strokeWidth={2} fill="url(#omnichannel-bot-gradient)" dot={false} />
        <Area type="monotone" dataKey="humanMessageCount" stackId="1" name="Temsilci" stroke={humanColor} strokeWidth={2} fill="url(#omnichannel-human-gradient)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
