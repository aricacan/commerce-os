'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTheme } from 'next-themes';

// recharts SVG prop'ları var() çözemiyor (bu oturumda tekrar eden bug) — tema bazlı
// literal hex. Maliyet kırılımı 5 ayrı kategori taşıdığı için kategorik renk şart;
// kâr/zarar barları ise semantic success/danger.
const GRID_LIGHT = '#e4e4e7';
const GRID_DARK = '#3f3f46';
const TICK_LIGHT = '#71717a';
const TICK_DARK = '#a1a1aa';
const SUCCESS = { light: '#16a34a', dark: '#22c55e' };
const DANGER  = { light: '#dc2626', dark: '#ef4444' };
const COST_PALETTE_LIGHT = ['#BF4A42', '#A23B34', '#d97706', '#71717a', '#3f3f46'];
const COST_PALETTE_DARK  = ['#E08E85', '#EBA9A1', '#f59e0b', '#a1a1aa', '#71717a'];

interface ProfitPoint {
  name: string;
  netProfit: number;
}

interface CostPoint {
  name: string;
  buying: number;
  boxCost: number;
  shipping: number;
  commission: number;
  kdv: number;
}

interface CampaignChartLabels {
  netProfit: string;
  costBreakdown: string;
  buyingPrice: string;
  boxCost: string;
  shipping: string;
  commission: string;
  kdv: string;
}

interface CampaignAnalysisChartsProps {
  profitData: ProfitPoint[];
  costData: CostPoint[];
  labels: CampaignChartLabels;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-4">
      <h3 className="mb-4 text-[13px] font-semibold text-fg">{title}</h3>
      {children}
    </div>
  );
}

export function CampaignAnalysisCharts({ profitData, costData, labels }: CampaignAnalysisChartsProps) {
  const { resolvedTheme, theme } = useTheme();
  const dark = (resolvedTheme ?? theme) === 'dark';
  const grid = dark ? GRID_DARK : GRID_LIGHT;
  const tick = dark ? TICK_DARK : TICK_LIGHT;
  const success = dark ? SUCCESS.dark : SUCCESS.light;
  const danger = dark ? DANGER.dark : DANGER.light;
  const costPalette = dark ? COST_PALETTE_DARK : COST_PALETTE_LIGHT;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title={labels.netProfit}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={profitData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: tick }} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10, fill: tick }} tickFormatter={(value) => `₺${value}`} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              formatter={(value) => [`₺${Number(value ?? 0).toFixed(2)}`, labels.netProfit]}
            />
            <Bar dataKey="netProfit" radius={[4, 4, 0, 0]}>
              {profitData.map((entry) => (
                <Cell key={entry.name} fill={entry.netProfit >= 0 ? success : danger} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={labels.costBreakdown}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={costData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: tick }} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10, fill: tick }} tickFormatter={(value) => `₺${value}`} />
            <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="buying" stackId="cost" fill={costPalette[0]} name={labels.buyingPrice} />
            <Bar dataKey="boxCost" stackId="cost" fill={costPalette[1]} name={labels.boxCost} />
            <Bar dataKey="shipping" stackId="cost" fill={costPalette[2]} name={labels.shipping} />
            <Bar dataKey="commission" stackId="cost" fill={costPalette[3]} name={labels.commission} />
            <Bar dataKey="kdv" stackId="cost" fill={costPalette[4]} name={labels.kdv} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
