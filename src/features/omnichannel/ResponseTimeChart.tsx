'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMinutes } from './overviewFormat';
import type { ResponsePoint } from './overviewRules';

const CHART_HEIGHT_PX = 220;
const AXIS_TICK = { fontSize: 11, fill: 'var(--fg-muted)' };
const TOOLTIP_STYLE = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--fg)',
};
const SERIES = {
  overall: { name: 'Bot dahil', color: 'var(--fg-muted)' },
  agent: { name: 'Yalnız temsilci', color: 'var(--info)' },
} as const;

// İlk cevap süresi trendi (dakika). Cevaplanan konuşma olmayan günde çizgi kopar; 0 diye çizilmez.
export function ResponseTimeChart({ points }: { points: ResponsePoint[] }) {
  if (points.length === 0) {
    return <p className="m-0 py-10 text-center text-ui-sm text-fg-muted">Bu dönemde cevaplanan konuşma yok.</p>;
  }

  return (
    <div role="img" aria-label="Günlük ortalama ilk cevap süresi: bot dahil ve yalnız temsilci" className="w-full">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="var(--border-soft)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v: number) => formatMinutes(v)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={52} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => (typeof value === 'number' ? formatMinutes(value) : '—')} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Line
            dataKey="overall" name={SERIES.overall.name} type="monotone" stroke={SERIES.overall.color} strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: SERIES.overall.color }}
          />
          <Line
            dataKey="agent" name={SERIES.agent.name} type="monotone" stroke={SERIES.agent.color} strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: SERIES.agent.color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
