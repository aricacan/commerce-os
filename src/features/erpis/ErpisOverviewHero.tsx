'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useErpisOrdersSummary, useErpisOrdersTrend } from '@/hooks/erpis/useErpisQuery';
import type { ErpisQueryFilter } from '@/lib/api';
import { formatBucketLabel } from '../../components/dashboard/erpis/erpisBucket';
import { useErpisChartTheme } from '../../components/dashboard/erpis/useErpisChartTheme';
import { formatCompact, formatNumber } from './shared';

// Genel Bakış'ın giriş bandı.
//
// Önceki hâlde ekran doğrudan altı küçük KPI kutusuyla başlıyordu: hepsi aynı ağırlıkta,
// hiçbiri "önce şuna bak" demiyordu. Bir ekranın bir cümlesi olmalı — buradaki cümle
// "seçili dönemde şu kadar sipariş aldık, geçen döneme göre şu yönde".
//
// Karşılaştırma penceresi ÜSTTEKİ TARİHTEN türüyor: seçili aralık kaç günse, hemen
// öncesindeki eşit uzunluktaki aralık. Sabit "geçen ay" demek, kullanıcı üç aylık bir
// aralık seçtiğinde anlamsız bir kıyas üretirdi.

interface Props {
  filter: ErpisQueryFilter;
}

const STOREA_HEIGHT = 64;

export function ErpisOverviewHero({ filter }: Props) {
  const theme = useErpisChartTheme();

  const converted = { ...filter, convertTo: 'TL' };
  const summary = useErpisOrdersSummary(converted);
  const trend = useErpisOrdersTrend(converted);
  const previous = useErpisOrdersSummary({ ...converted, ...previousWindow(filter) });

  const data = summary.data;
  const total = data?.converted?.total ?? data?.totals[0]?.total ?? 0;
  const currency = data?.converted?.currency ?? data?.totals[0]?.currency ?? '';

  const previousTotal = previous.data?.converted?.total ?? previous.data?.totals[0]?.total ?? 0;
  const delta = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;

  const points = (trend.data ?? [])
    .slice()
    .sort((a, b) => a.bucket.localeCompare(b.bucket))
    .map((p) => ({ ...p, label: formatBucketLabel(p.bucket) }));

  return (
    <div className="flex flex-col gap-4 rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs md:flex-row md:items-center md:gap-6 md:p-5">
      <div className="flex shrink-0 flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--fg-muted)]">
          Seçili dönem sipariş tutarı
        </span>

        <div className="flex items-end gap-2.5">
          <span className="text-[34px] font-extrabold leading-none tracking-[-1px] text-[var(--fg)] md:text-[42px]">
            {formatCompact(total)}
          </span>
          <span className="pb-1 text-[13px] font-bold text-[var(--fg-muted)]">{currency}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
          {delta !== null && (
            <span
              className="inline-flex items-center gap-1 text-[12px] font-extrabold"
              style={{ color: delta >= 0 ? theme.amount : 'rgba(190,60,60,0.95)' }}
            >
              {delta >= 0 ? <TrendingUp size={12} strokeWidth={2.6} /> : <TrendingDown size={12} strokeWidth={2.6} />}
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              <span className="font-semibold text-[var(--fg-muted)]">önceki döneme göre</span>
            </span>
          )}

          <span className="text-[11.5px] text-[var(--fg-muted)]">
            {formatNumber(data?.orderCount)} sipariş · {formatNumber(data?.itemCount)} ürün
            {' · '}{formatNumber(data?.partyCount)} cari
          </span>
        </div>
      </div>

      {/* Kıvrım bir rakam değil, YÖN gösteriyor: eksen ve etiket yok, dönem içinde işin
          nasıl seyrettiği tek bakışta okunuyor. Ayrıntı zaten altındaki grafiklerde. */}
      {points.length > 1 && (
        <div className="min-w-0 flex-1">
          <ResponsiveContainer width="100%" height={STOREA_HEIGHT}>
            <AreaChart data={points} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="erpisHeroArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.amount} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={theme.amount} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                {...theme.tooltip}
                formatter={(value: unknown) => [
                  formatNumber(typeof value === 'number' ? value : null, 2),
                  currency ? `Tutar (${currency})` : 'Tutar',
                ]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={theme.amount}
                strokeWidth={2}
                fill="url(#erpisHeroArea)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// Seçili aralığın hemen öncesindeki EŞİT UZUNLUKTA pencere.
//
// Yerel tarih bileşenleriyle kuruluyor: toISOString() UTC'ye çevirip ayın ilk gününü bir
// önceki aya kaydırabiliyor.
function previousWindow(filter: ErpisQueryFilter): Pick<ErpisQueryFilter, 'from' | 'to'> {
  if (!filter.from || !filter.to) return {};

  const start = new Date(filter.from);
  const end = new Date(filter.to);
  const dayMs = 86_400_000;
  const lengthDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);

  const previousEnd = new Date(start.getTime() - dayMs);
  const previousStart = new Date(previousEnd.getTime() - (lengthDays - 1) * dayMs);

  return { from: iso(previousStart), to: iso(previousEnd) };
}

function iso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
