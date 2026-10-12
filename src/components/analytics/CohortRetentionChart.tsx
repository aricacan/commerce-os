'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CURVE_COLORS = [
  '#6366f1', '#2563eb', '#db2777', '#d97706', '#059669',
  '#7c3aed', '#0891b2', '#ea580c', '#0d9488', '#e11d48',
];

interface CohortRetentionChartProps {
  data: Array<Record<string, number | string>>;
  cohortMonths: string[];
  compact: boolean;
}

export function CohortRetentionChart({ data, cohortMonths, compact }: CohortRetentionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={compact ? 260 : 400}>
      <LineChart data={data} margin={{ top: 15, right: 30, bottom: 15, left: 0 }}>
        <CartesianGrid stroke="var(--border-soft)" strokeDasharray="4 4" />
        <XAxis dataKey="offset" tick={{ fill: 'var(--fg-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
        <YAxis domain={[0, 100]} tickFormatter={(value) => `%${value}`} tick={{ fill: 'var(--fg-muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--fg)', boxShadow: 'var(--shadow-md)' }}
          formatter={(value: unknown, name: unknown) => [`%${Number(value).toFixed(1)}`, String(name ?? '')]}
          labelStyle={{ color: '#6366f1', fontWeight: 700, marginBottom: 6 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--fg-muted)', paddingTop: 16 }} />
        {cohortMonths.map((cohortMonth, index) => (
          <Line
            key={cohortMonth}
            type="monotone"
            dataKey={cohortMonth}
            stroke={CURVE_COLORS[index % CURVE_COLORS.length]}
            strokeWidth={2.5}
            dot={{ r: 3.5, strokeWidth: 0, fill: CURVE_COLORS[index % CURVE_COLORS.length] }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
