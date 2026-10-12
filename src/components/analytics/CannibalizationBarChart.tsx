'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface CannibalizationBarPoint {
  name: string;
  score: number;
}

export function CannibalizationBarChart({ data }: { data: CannibalizationBarPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis type="number" domain={[-1, 0]} tick={{ fill: 'var(--fg-muted)', fontSize: 10 }} />
        <YAxis dataKey="name" type="category" width={110} tick={{ fill: 'var(--fg)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border-soft)', borderRadius: 10, color: 'var(--fg)', fontSize: 11.5 }}
          labelStyle={{ fontWeight: 700 }}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.score <= -0.6 ? '#ef4444' : entry.score <= -0.3 ? '#f97316' : '#eab308'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
