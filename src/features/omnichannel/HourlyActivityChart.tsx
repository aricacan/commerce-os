'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HourPoint } from './overviewRules';

const CHART_HEIGHT_PX = 200;
const AXIS_TICK = { fontSize: 11, fill: 'var(--fg-muted)' };
// 24 saatin hepsini yazmak dar ekranda birbirine biner: her 3 saatte bir etiket.
const HOUR_LABEL_EVERY = 3;
const TOOLTIP_STYLE = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--fg)',
};

// Gün içi yoğunluk: müşteri mesajları saate göre (Türkiye saati). Vardiya planı için "ne zaman yazıyorlar?" cevabı.
export function HourlyActivityChart({ points }: { points: HourPoint[] }) {
  return (
    <div role="img" aria-label="Müşteri mesajlarının saate göre dağılımı" className="w-full">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
        <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="var(--border-soft)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={HOUR_LABEL_EVERY - 1} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--bg-subtle)' }}
            labelFormatter={(hour) => `${hour}:00`} formatter={(v) => [v, 'Mesaj']}
          />
          <Bar dataKey="count" fill="var(--info)" radius={[3, 3, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
