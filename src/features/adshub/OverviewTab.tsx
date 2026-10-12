'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, LineChart, Line, Legend, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { AlertTriangle, TrendingUp, ArrowRight, Layers, CreditCard, Eye, MousePointer, DollarSign, Percent } from 'lucide-react';
import { adsHubApi, type AdPlatform } from '../../lib/api/adshub';
import type { ErpSourceCode } from '../../stores/store-selector';
import { PlatformBadge, formatTry, formatMoney, formatCount, formatPercent, formatRatio, ErrorState } from './shared';

interface Props {
  onOpenAccount: (accountId: number) => void;
  erpSources: ErpSourceCode[];
  platforms: AdPlatform[];
  from: string;
  to: string;
}

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: typeof DollarSign;
}) {
  return (
    <div className="flex-1 min-w-[150px] rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[var(--fg-muted)]">
        <span>{label}</span>
        {Icon && <Icon size={14} className="text-[var(--fg-muted)] opacity-70" />}
      </div>
      <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-[var(--fg)] tracking-tight">
        {value}
      </div>
      {sub && <div className="mt-1 text-[10.5px] text-[var(--fg-muted)] leading-tight">{sub}</div>}
    </div>
  );
}

function FunnelStep({ label, value, highlight }: { label: string; value: number | null | undefined; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[11px] text-[var(--fg-muted)] font-semibold">{label}</div>
      <div className={`text-base font-bold font-mono ${highlight ? 'text-[var(--fg)]' : 'text-[var(--fg)]'}`}>
        {formatCount(value)}
      </div>
    </div>
  );
}

export function OverviewTab({ onOpenAccount, erpSources, platforms, from, to }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['adshub', 'overview', from, to, erpSources, platforms],
    queryFn: () => adsHubApi.getOverview(from, to, erpSources, platforms),
    staleTime: 60_000,
  });

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      {isError && <ErrorState />}

      {!isError && (
        <>
          {/* KPI Strip */}
          <div data-tour="adshub-overview-kpis" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatTile
              label="Toplam Harcama (TL)"
              value={isLoading ? '…' : formatTry(data?.totalSpendTry)}
              sub={
                data && data.unconvertedRowCount > 0
                  ? `${data.unconvertedRowCount} satır kur bulunamadı`
                  : `${data?.activeAccountCount ?? 0} aktif hesap`
              }
              icon={DollarSign}
            />
            {data?.nativeCurrencyCode && data.nativeCurrencyCode !== 'TRY' && (
              <StatTile
                label={`Harcama (${data.nativeCurrencyCode})`}
                value={formatMoney(data.totalSpendNative, data.nativeCurrencyCode)}
                sub="Kur çevrimine bağımsız"
                icon={CreditCard}
              />
            )}
            <StatTile
              label="Gösterim"
              value={isLoading ? '…' : formatCount(data?.totalImpressions)}
              icon={Eye}
            />
            <StatTile
              label="Tıklama"
              value={isLoading ? '…' : formatCount(data?.totalClicks)}
              sub={data?.ctr != null ? `TO ${formatPercent(data.ctr)}` : undefined}
              icon={MousePointer}
            />
            <StatTile
              label="TBM (Ortalama CPC)"
              value={isLoading ? '…' : formatTry(data?.cpcTry)}
              icon={DollarSign}
            />
            <StatTile
              label="Platform ROAS"
              value={isLoading ? '…' : formatRatio(data?.platformRoas)}
              sub="Platform kendi raporu"
              icon={Layers}
            />
            {/* ACOS ve TACOS bilerek YAN YANA: ikisi aynı harcamayı farklı paydaya
                böler ve tek başlarına yanıltıcı okunurlar. ACOS platformun kendine
                mal ettiği ciroya, TACOS bütün ciroya oranlar. */}
            <StatTile
              label="Platform ACOS"
              value={isLoading ? '…' : formatPercent(data?.platformAcosPercent, 1)}
              sub="Reklam cirosuna oran"
              icon={Percent}
            />
            <StatTile
              label="TACOS"
              value={isLoading ? '…' : formatPercent(data?.tacosPercent, 1)}
              sub={
                data?.tacosPercent == null
                  ? 'ERP cirosu yok'
                  : data.tacosScopeIsAllSources
                    ? 'Tüm ERP kaynakları'
                    : 'Toplam ciroya oran'
              }
              icon={Percent}
            />
            <StatTile
              label="Aktif Kampanya"
              value={isLoading ? '…' : formatCount(data?.activeCampaignCount)}
              icon={Layers}
            />
          </div>

          {data && data.unconvertedRowCount > 0 && (
            <div className="flex items-center gap-2 rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-500">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{data.unconvertedRowCount} harcama satırı TL&apos;ye çevrilemedi (kur bulunamadı) — toplam eksik olabilir.</span>
            </div>
          )}

          {/* Daily Spend Chart */}
          <div data-tour="adshub-overview-trend" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--fg)]">Günlük Harcama Trendi</span>
              <span className="text-[11px] text-[var(--fg-muted)]">TL Bazında Günlük Dağılım</span>
            </div>
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.daily ?? []} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="adsSpendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--fg)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--fg)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 10.5, fill: 'var(--fg-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))}
                  />
                  <Tooltip
                    formatter={(value) => [formatTry(Number(value)), 'Harcama']}
                    labelStyle={{ color: 'var(--fg)', fontWeight: 700, fontSize: 11.5 }}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: 4,
                      fontSize: 12,
                      color: 'var(--fg)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="spendTry"
                    stroke="var(--fg)"
                    strokeWidth={2}
                    fill="url(#adsSpendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Günlük ACOS / TACOS — tek bir aralık rakamı, içindeki kötü günleri
              gizler. Hesaplanamayan gün (dönüşüm değeri/ciro yok) null gelir ve
              connectNulls={false} sayesinde çizgide BOŞLUK olarak görünür —
              iki iyi gün arasına sahte bir çizgi çizilmez. */}
          {(data?.daily.some((d) => d.platformAcosPercent != null || d.tacosPercent != null) ?? false) && (
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--fg)]">Günlük ACOS / TACOS</span>
                <span className="text-[11px] text-[var(--fg-muted)]">
                  {data?.tacosScopeIsAllSources ? 'TACOS: tüm ERP kaynakları' : 'ACOS: platform cirosu • TACOS: toplam ciro'}
                </span>
              </div>
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.daily ?? []} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
                    <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 10.5, fill: 'var(--fg-muted)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `%${Math.round(v)}`}
                    />
                    <Tooltip
                      formatter={(value, name) => [formatPercent(Number(value), 1), name]}
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
                    <Line
                      type="monotone"
                      dataKey="platformAcosPercent"
                      name="ACOS"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="tacosPercent"
                      name="TACOS"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Funnel Strip */}
          {(data?.addToCartCount != null || data?.initiateCheckoutCount != null) && (
            <div data-tour="adshub-overview-funnel" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-2.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs font-bold text-[var(--fg)]">Huni / Dönüşüm Adımları (Platform Raporu)</span>
                {/* Kapsam açıkça yazılıyor: huni adımlarını yalnızca Meta raporluyor. Satın
                    alma adımı da AYNI kaynaktan alınır (funnelPurchaseCount), yoksa Google'ın
                    satın almaları eklenip "ödeme başlatma < satın alma" gibi imkânsız bir
                    huni çıkıyordu. */}
                <span className="text-[10.5px] text-[var(--fg-muted)]">
                  yalnızca {(data?.funnelPlatformNames ?? []).join(', ') || 'Meta'} — diğer platformlar bu adımları raporlamıyor
                </span>
              </div>
              <div className="flex items-center gap-4 sm:gap-8 flex-wrap">
                <FunnelStep label="Sepete Ekleme" value={data?.addToCartCount} />
                <ArrowRight size={14} className="text-[var(--fg-muted)]" />
                <FunnelStep label="Ödeme Başlatma" value={data?.initiateCheckoutCount} />
                <ArrowRight size={14} className="text-[var(--fg-muted)]" />
                <FunnelStep label="Satın Alma" value={data?.funnelPurchaseCount} highlight />
              </div>
            </div>
          )}

          {/* Breakdown Grids */}
          <div data-tour="adshub-overview-breakdown" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Platform Breakdown */}
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
              <div className="text-xs font-bold text-[var(--fg)]">Platform Bazında Dağılım</div>
              {(data?.byPlatform ?? []).length === 0 && !isLoading && (
                <div className="text-xs text-[var(--fg-muted)] py-4">Bu aralıkta harcama verisi bulunamadı.</div>
              )}
              <div className="flex flex-col divide-y divide-[var(--border-soft)]">
                {data?.byPlatform.map((p) => (
                  <div key={p.platform} className="flex items-center justify-between py-2.5">
                    <PlatformBadge platform={p.platform} />
                    <span className="font-mono font-bold text-xs text-[var(--fg)]">{formatTry(p.spendTry)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Breakdown */}
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
              <div className="text-xs font-bold text-[var(--fg)]">Hesap Bazında Harcama</div>
              {(data?.byAccount ?? []).length === 0 && !isLoading && (
                <div className="text-xs text-[var(--fg-muted)] py-4">Bağlı reklam hesabı yok.</div>
              )}
              <div className="flex flex-col divide-y divide-[var(--border-soft)]">
                {data?.byAccount.map((a) => (
                  <button
                    key={a.adAccountId}
                    type="button"
                    onClick={() => onOpenAccount(a.adAccountId)}
                    className="flex items-center justify-between py-2.5 text-left hover:bg-[var(--bg-subtle)]/40 px-2 rounded-[3px] transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <TrendingUp size={13} className="text-[var(--fg-muted)] shrink-0" />
                      <span className="font-semibold text-xs text-[var(--fg)] truncate">{a.accountName}</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-[var(--fg)] shrink-0 ml-2">{formatTry(a.spendTry)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
