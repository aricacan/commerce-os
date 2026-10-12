'use client';

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatScore, QUALITY_REVIEW_THRESHOLD, type QualityPoint } from './qualityRules';

const CHART_HEIGHT_PX = 200;
const SCORE_DOMAIN: [number, number] = [0, 10];
const AXIS_TICK = { fontSize: 11, fill: 'var(--fg-muted)' };
const TOOLTIP_STYLE = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--fg)',
};

// Günlük ortalama kalite puanı (0-10). Kesikli çizgi "incele" eşiği; denetimsiz günde çizgi kopmadan sürer.
export function QualityTrendChart({ points }: { points: QualityPoint[] }) {
  return (
    <div role="img" aria-label="Günlük ortalama kalite puanı" className="w-full">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid stroke="var(--border-soft)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis domain={SCORE_DOMAIN} allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [typeof value === 'number' ? formatScore(value) : '—', 'Ortalama puan']}
          />
          <ReferenceLine y={QUALITY_REVIEW_THRESHOLD} stroke="var(--border)" strokeDasharray="4 4" />
          <Line
            dataKey="average" name="Ortalama puan" type="monotone" stroke="var(--info)" strokeWidth={2} connectNulls
            dot={{ r: 3, strokeWidth: 0, fill: 'var(--info)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
