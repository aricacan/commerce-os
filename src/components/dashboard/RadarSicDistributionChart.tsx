'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { RadarSicCodeSliceDto } from '../../lib/api/radar';

// StaticWidgets.tsx'teki platform dağılımı donut'uyla aynı desen (PieChart/Pie/Cell).
const SLICE_COLORS = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#7C3AED', '#DDD6FE', '#6D28D9', '#5B21B6', '#EDE9FE', '#94A3B8'];

export function RadarSicDistributionChart({ data }: { data: RadarSicCodeSliceDto[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="45%"
          outerRadius="80%"
          paddingAngle={2}
          dataKey="count"
          nameKey="sicCode"
        >
          {data.map((entry, index) => (
            <Cell key={entry.sicCode} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
          formatter={((value: unknown, _name: unknown, item: { payload?: RadarSicCodeSliceDto }) =>
            [String(value), item?.payload?.sicCode ?? '']) as never}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
