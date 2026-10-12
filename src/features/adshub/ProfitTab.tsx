'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Wallet, ShoppingCart, Activity, Percent } from 'lucide-react';
import { adsHubApi, type AdPlatform } from '../../lib/api/adshub';
import type { ErpSourceCode } from '../../stores/store-selector';
import { formatTry, formatMoney, formatRatio, formatPercent, formatCount, ErrorState } from './shared';

interface Props {
  erpSources: ErpSourceCode[];
  platforms: AdPlatform[];
  from: string;
  to: string;
}

function StatTile({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'positive' | 'negative';
  icon?: typeof DollarSign;
}) {
  const colorClass = tone === 'positive' ? 'text-emerald-500' : tone === 'negative' ? 'text-rose-500' : 'text-[var(--fg)]';

  return (
    <div className="flex-1 min-w-[150px] rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[var(--fg-muted)]">
        <span>{label}</span>
        {Icon && <Icon size={14} className="text-[var(--fg-muted)] opacity-70" />}
      </div>
      <div className={`mt-2 text-lg sm:text-xl font-bold font-mono tracking-tight ${colorClass}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[10.5px] text-[var(--fg-muted)] leading-tight">{sub}</div>}
    </div>
  );
}

export function ProfitTab({ erpSources, platforms, from, to }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['adshub', 'blended-profit', from, to, erpSources, platforms],
    queryFn: () => adsHubApi.getBlendedProfit(from, to, erpSources, platforms),
    staleTime: 60_000,
  });

  const trueNetPositive = (data?.totalTrueNetTry ?? 0) >= 0;

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      {isError && <ErrorState />}

      {!isError && (
        <>
          {/* Warning Fallbacks */}
          {data?.usedAllStoresFallback && (
            <div className="flex items-center gap-2 rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-500">
              <AlertTriangle size={14} className="shrink-0" />
              <span>Hiçbir reklam hesabına ERP kaynağı atanmamış — kâr TÜM kaynakların toplamıyla hesaplandı.</span>
            </div>
          )}

          {data && data.requestedStoreCount > 0 && data.matchedStoreCount === 0 && (
            <div className="flex items-center gap-2 rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-500">
              <AlertTriangle size={14} className="shrink-0" />
              <span>Seçilen ERP kaynağı sistemde bulunamadı — sonuç boş olabilir.</span>
            </div>
          )}

          {/* KPI Strip */}
          <div data-tour="adshub-profit-kpis" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatTile
              label="Reklam Harcaması"
              value={isLoading ? '…' : formatTry(data?.totalAdSpendTry)}
              sub={
                data?.nativeCurrencyCode && data.nativeCurrencyCode !== 'TRY'
                  ? formatMoney(data.totalAdSpendNative, data.nativeCurrencyCode)
                  : undefined
              }
              icon={DollarSign}
            />
            <StatTile
              label="ERP Ciro (Gerçek)"
              value={isLoading ? '…' : formatTry(data?.totalErpRevenueTry)}
              icon={Wallet}
            />
            <StatTile
              label="ERP Kâr (Gerçek)"
              value={isLoading ? '…' : formatTry(data?.totalErpNetProfitTry)}
              icon={Activity}
            />
            <StatTile
              label="Gerçek Net (Kâr − Reklam)"
              value={isLoading ? '…' : formatTry(data?.totalTrueNetTry)}
              tone={isLoading ? undefined : trueNetPositive ? 'positive' : 'negative'}
              sub="Net kârlılık göstergesi"
              icon={DollarSign}
            />
            <StatTile
              label="MER (Ciro / Harcama)"
              value={isLoading ? '…' : formatRatio(data?.mer)}
              sub="Gerçek satış çarpanı"
              icon={Activity}
            />
            <StatTile
              label="TACOS (Harcama / ERP Ciro)"
              value={isLoading ? '…' : formatPercent(data?.tacosPercent, 1)}
              sub="Cironun reklama giden yüzdesi"
              icon={Percent}
            />
            <StatTile
              label="Sipariş Sayısı (ERP)"
              value={isLoading ? '…' : formatCount(data?.totalErpOrderCount)}
              icon={ShoppingCart}
            />
          </div>

          {/* Composed Chart: Spend vs True Net */}
          <div data-tour="adshub-profit-chart" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--fg)]">Günlük: Harcama vs Gerçek Net Kârlılık</span>
              <span className="text-[11px] text-[var(--fg-muted)]">ERP Entegrasyonu ile Birleşik</span>
            </div>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data?.daily ?? []} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 10.5, fill: 'var(--fg-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}K` : String(v))}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatTry(Number(value)), name]}
                    labelStyle={{ color: 'var(--fg)', fontWeight: 700, fontSize: 11.5 }}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: 4,
                      fontSize: 12,
                      color: 'var(--fg)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11.5 }} />
                  <Bar dataKey="erpRevenueTry" name="ERP Ciro" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="adSpendTry" name="Reklam Harcaması" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="erpNetProfitTry" name="ERP Kâr" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="trueNetTry"
                    name="Gerçek Net"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Detail Table / List */}
          {(data?.daily.length ?? 0) > 0 && (
            <div data-tour="adshub-profit-daily" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
              <div className="text-xs font-bold text-[var(--fg)]">Günlük Kârlılık Dağılımı</div>
              <div className="flex flex-col divide-y divide-[var(--border-soft)] max-h-72 overflow-y-auto pr-1">
                {data?.daily.map((d) => {
                  const positive = d.trueNetTry >= 0;
                  return (
                    <div key={d.date} className="flex items-center justify-between py-2 text-xs">
                      <div className="flex items-center gap-2">
                        {positive ? (
                          <TrendingUp size={14} className="text-emerald-500 shrink-0" />
                        ) : (
                          <TrendingDown size={14} className="text-rose-500 shrink-0" />
                        )}
                        <span className="font-mono text-[var(--fg)] font-semibold w-24 shrink-0">{d.date}</span>
                        <span className="text-[var(--fg-muted)] hidden sm:inline">
                          Harcama: <span className="font-mono">{formatTry(d.adSpendTry)}</span> • Ciro:{' '}
                          <span className="font-mono">{formatTry(d.erpRevenueTry)}</span> • {d.erpOrderCount} sipariş •
                          {' '}TACOS: <span className="font-mono">{formatPercent(d.tacosPercent, 1)}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--fg-muted)] text-[11px] sm:hidden">{d.erpOrderCount} sipariş</span>
                        <span className={`font-mono font-bold ${positive ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {formatTry(d.trueNetTry)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
