'use client';

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RankedBar } from './overviewRules';

const ROW_HEIGHT_PX = 30;
const CHART_PADDING_PX = 16;
const LABEL_AXIS_WIDTH_PX = 128;
const TOOLTIP_STYLE = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--fg)',
};

interface Props {
  bars: RankedBar[];
  // Ekran okuyucu adı ve boş durum metni: grafiğin ne gösterdiğini söyler.
  ariaLabel: string;
  emptyText: string;
  // İpucu penceresinde sayının adı ("Konuşma", "Devir").
  unit: string;
}

// Sıralı yatay çubuklar (aşama, kanal, devir sebebi, konu dağılımı). Tek ölçü (adet) olduğundan tek renk;
// değer her çubuğun ucunda yazılı, ayrıca ipucu penceresi var. Yükseklik satır sayısıyla büyür.
export function RankedBarsChart({ bars, ariaLabel, emptyText, unit }: Props) {
  if (bars.length === 0) return <p className="m-0 py-8 text-center text-ui-sm text-fg-muted">{emptyText}</p>;

  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={bars.length * ROW_HEIGHT_PX + CHART_PADDING_PX}>
        <BarChart data={bars} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category" dataKey="label" width={LABEL_AXIS_WIDTH_PX} tickLine={false} axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--fg-muted)' }}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--bg-subtle)' }} formatter={(v) => [v, unit]} />
          <Bar dataKey="count" fill="var(--info)" radius={[0, 4, 4, 0]} maxBarSize={16}>
            <LabelList dataKey="count" position="right" style={{ fontSize: 12, fill: 'var(--fg)' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
