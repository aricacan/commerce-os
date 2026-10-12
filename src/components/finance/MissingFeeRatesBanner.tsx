'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { channelFeesApi } from '../../lib/api/channel-fees';
import { isRateMissing } from './ChannelFeesCard';

// Kâr ekranlarının üstünde: oranı girilmemiş (ve gerçek kesinti de bildirmeyen) kanallar varsa
// o kanalların komisyonu kâra hiç yansımıyor — kullanıcı rakamın neden yüksek olduğunu görsün.
export function MissingFeeRatesBanner() {
  const channels = useQuery({ queryKey: ['channel-fees'], queryFn: channelFeesApi.list, staleTime: 60_000 });
  const missing = (channels.data ?? []).filter(isRateMissing);
  if (missing.length === 0) return null;

  const orderCount = missing.reduce((sum, row) => sum + row.orderCount, 0);
  const names = Array.from(new Set(missing.map((row) => row.platformName))).join(', ');

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs text-[var(--fg)]">
      <span className="flex items-start gap-2">
        <AlertTriangle size={14} className="mt-px shrink-0 text-amber-500" />
        <span>
          <b>{names}</b> için komisyon oranı girilmemiş — bu kanallardaki {orderCount.toLocaleString('tr-TR')} siparişin
          komisyonu kâra yansımıyor, kâr olduğundan yüksek görünür.
        </span>
      </span>
      <Link href="/finance/platforms" className="shrink-0 font-semibold text-[var(--fg)] underline-offset-2 hover:underline">
        Oranları gir →
      </Link>
    </div>
  );
}
