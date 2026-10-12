'use client';

import { useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface KpiTrendPoint {
  name: string;
  Ciro: number;
  'Brüt Kâr': number;
  Siparis: number;
}

export function KpiTrendChart({
  data,
  orderOnly,
  formatValue,
}: {
  data: KpiTrendPoint[];
  orderOnly: boolean;
  formatValue: (value: number) => string;
}) {
  const [showCiro, setShowCiro] = useState(true);
  const [showGrossProfit, setShowGrossProfit] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Interactive Legend Toggle Pills - Minimal text-only */}
      {!orderOnly && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 4 }}>
          <button
            type="button"
            onClick={() => setShowCiro((prev) => !prev)}
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid',
              borderColor: showCiro ? 'var(--border)' : 'transparent',
              background: showCiro ? 'var(--bg-subtle)' : 'transparent',
              color: showCiro ? 'var(--fg)' : 'var(--fg-subtle)',
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: showCiro ? 1 : 0.35,
              transition: 'all 0.15s ease',
            }}
          >
            Ciro
          </button>

          <button
            type="button"
            onClick={() => setShowGrossProfit((prev) => !prev)}
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid',
              borderColor: showGrossProfit ? 'var(--border)' : 'transparent',
              background: showGrossProfit ? 'var(--bg-subtle)' : 'transparent',
              color: showGrossProfit ? 'var(--fg)' : 'var(--fg-subtle)',
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: showGrossProfit ? 1 : 0.35,
              transition: 'all 0.15s ease',
            }}
          >
            Brüt Kâr
          </button>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              style={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={(value) => (orderOnly ? Number(value).toLocaleString() : formatValue(Number(value)))}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                fontSize: 11,
                boxShadow: 'var(--shadow-md)',
              }}
              formatter={
                ((value: unknown, name: unknown) => [
                  orderOnly ? Number(value).toLocaleString() : formatValue(Number(value)),
                  String(name ?? ''),
                ]) as never
              }
            />
            {orderOnly ? (
              <Bar dataKey="Siparis" barSize={20} fill="#94a3b8" radius={[2, 2, 0, 0]} />
            ) : (
              <>
                {showCiro && (
                  <Bar dataKey="Ciro" barSize={18} fill="#cbd5e1" radius={[2, 2, 0, 0]}>
                    <LabelList dataKey="Siparis" position="top" style={{ fill: '#64748b', fontSize: 8.5, fontWeight: 700 }} />
                  </Bar>
                )}
                {showGrossProfit && (
                  <Line
                    type="monotone"
                    dataKey="Brüt Kâr"
                    stroke="#059669"
                    strokeWidth={1.5}
                    dot={{ r: 2, fill: '#059669' }}
                    activeDot={{ r: 3.5 }}
                  />
                )}
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
