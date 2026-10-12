'use client';

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailyPoint } from './overviewRules';

const CHART_HEIGHT_PX = 240;
const SERIES = {
  inbound: { name: 'Müşteriden gelen', color: 'var(--fg-muted)' },
  botReplies: { name: 'Bot cevabı', color: 'var(--info)' },
  agentReplies: { name: 'Temsilci cevabı', color: 'var(--fg)' },
} as const;

const AXIS_TICK = { fontSize: 11, fill: 'var(--fg-muted)' };
const TOOLTIP_STYLE = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--fg)',
};

// Günlük mesaj trendi: çubuklar bizim cevaplarımız (bot + temsilci, üst üste), çizgi müşteriden gelenler.
// Tek eksen: hepsi "mesaj sayısı". Renkler tema jetonlarından (koyu temada kendiliğinden değişir).
export function DailyMessagesChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return <p className="m-0 py-10 text-center text-ui-sm text-fg-muted">Bu dönemde mesaj yok.</p>;
  }

  return (
    <div role="img" aria-label="Günlük mesaj sayıları: müşteriden gelen, bot ve temsilci cevapları" className="w-full">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--border-soft)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--bg-subtle)' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="botReplies" name={SERIES.botReplies.name} stackId="out" fill={SERIES.botReplies.color} maxBarSize={28} />
          <Bar
            dataKey="agentReplies" name={SERIES.agentReplies.name} stackId="out" fill={SERIES.agentReplies.color}
            radius={[4, 4, 0, 0]} maxBarSize={28}
          />
          <Line
            dataKey="inbound" name={SERIES.inbound.name} type="monotone" stroke={SERIES.inbound.color} strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: SERIES.inbound.color }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
