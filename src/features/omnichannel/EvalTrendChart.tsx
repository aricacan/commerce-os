'use client';

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { QualityTrendPointDto } from '../../lib/api/omnichannel-quality';
import { scorePercent } from './evalRules';
import { trendRows } from './qualityCenterRules';

const CHART_HEIGHT_PX = 220;
const PERCENT_DOMAIN: [number, number] = [0, 100];
const AXIS_TICK = { fontSize: 11, fill: 'var(--fg-muted)' };
const TOOLTIP_STYLE = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--fg)',
};

// Koşular boyunca tur başarısı (%). Kesikli çizgi hedef (%95); puanı olmayan koşuda çizgi kopmadan sürer.
export function EvalTrendChart({ points, target }: { points: readonly QualityTrendPointDto[]; target: number }) {
  const rows = trendRows(points);
  if (rows.length === 0) {
    return <p className="m-0 py-8 text-center text-ui-xs text-fg-muted">Trend için puanlanmış koşu yok.</p>;
  }

  return (
    <div role="img" aria-label="Koşular boyunca tur başarısı" className="w-full">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid stroke="var(--border-soft)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis domain={PERCENT_DOMAIN} allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} unit="%" />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [typeof value === 'number' ? `%${value}` : '—', 'Tur başarısı']}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.name ? `${label} · ${payload[0].payload.name}` : String(label)}
          />
          <ReferenceLine
            y={scorePercent(target) ?? undefined} stroke="var(--success)" strokeDasharray="4 4"
            label={{ value: 'Hedef', position: 'insideTopRight', fontSize: 11, fill: 'var(--fg-muted)' }}
          />
          <Line
            dataKey="turnSuccess" name="Tur başarısı" type="monotone" stroke="var(--info)" strokeWidth={2} connectNulls
            dot={{ r: 3, strokeWidth: 0, fill: 'var(--info)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
