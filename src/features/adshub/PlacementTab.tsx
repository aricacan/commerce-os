'use client';

import { useQuery } from '@tanstack/react-query';
import { Smartphone, Monitor, LayoutGrid } from 'lucide-react';
import { adsHubApi, type AdPlatform } from '../../lib/api/adshub';
import type { ErpSourceCode } from '../../stores/store-selector';
import { formatTry, formatCount, formatPercent, ErrorState } from './shared';

interface Props {
  erpSources: ErpSourceCode[];
  platforms: AdPlatform[];
  from: string;
  to: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  messenger: 'Messenger',
  audience_network: 'Audience Network',
};

const POSITION_LABELS: Record<string, string> = {
  feed: 'Akış (Feed)',
  story: 'Hikaye (Story)',
  reels: 'Reels',
  video_feeds: 'Video Akışı',
  marketplace: 'Marketplace',
  search: 'Arama Sonuçları',
  instream_video: 'Video İçi',
  right_hand_column: 'Sağ Sütun',
};

const DEVICE_LABELS: Record<string, string> = {
  mobile_app: 'Mobil Uygulama',
  mobile_web: 'Mobil Web',
  desktop: 'Masaüstü',
};

const DEVICE_ICON: Record<string, typeof Smartphone> = {
  mobile_app: Smartphone,
  mobile_web: Smartphone,
  desktop: Monitor,
};

function label(map: Record<string, string>, raw: string): string {
  return map[raw] ?? raw;
}

export function PlacementTab({ erpSources, platforms, from, to }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['adshub', 'breakdown', from, to, erpSources, platforms],
    queryFn: () => adsHubApi.getBreakdown(from, to, erpSources, platforms),
    staleTime: 60_000,
  });

  const maxPlacementSpend = Math.max(1, ...(data?.byPlacement.map((p) => p.spendTry) ?? [0]));
  const maxDeviceSpend = Math.max(1, ...(data?.byDevice.map((d) => d.spendTry) ?? [0]));

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      {isError && <ErrorState />}

      {!isError && (data?.unconvertedRowCount ?? 0) > 0 && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-3 py-2 text-[var(--warning)]">
          {data?.unconvertedRowCount} kırılım satırı kur bulunamadığı için TL harcamalara dahil değil — tutarlar eksik olabilir.
        </div>
      )}

      {!isError && (
        <>
          {/* Placement Table Card */}
          <div data-tour="adshub-placement-formats" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <LayoutGrid size={15} className="text-[var(--fg-muted)]" />
              <span className="text-xs font-bold text-[var(--fg)]">Yerleşim Formatı ve Platform Dağılımı</span>
            </div>

            {isLoading && <div className="text-xs text-[var(--fg-muted)] py-4">Yükleniyor…</div>}
            {!isLoading && (data?.byPlacement.length ?? 0) === 0 && (
              <div className="text-xs text-[var(--fg-muted)] py-4">Bu aralıkta yerleşim verisi bulunamadı.</div>
            )}

            {!isLoading && (data?.byPlacement.length ?? 0) > 0 && (
              <div className="overflow-x-auto rounded-[4px] border border-[var(--border-soft)]">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                    <tr>
                      <th className="px-3.5 py-2.5">Platform</th>
                      <th className="px-3.5 py-2.5">Yerleşim</th>
                      <th className="px-3.5 py-2.5 text-right">Harcama</th>
                      <th className="px-3.5 py-2.5 text-right">Gösterim</th>
                      <th className="px-3.5 py-2.5 text-right">Tıklama</th>
                      <th className="px-3.5 py-2.5 text-right">TO</th>
                      <th className="px-3.5 py-2.5 text-right">TBM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {data?.byPlacement.map((row, i) => (
                      <tr key={i} className="hover:bg-[var(--bg-subtle)]/30">
                        <td className="px-3.5 py-2.5 font-semibold text-[var(--fg)]">
                          {label(PLATFORM_LABELS, row.publisherPlatform)}
                        </td>
                        <td className="px-3.5 py-2.5 text-[var(--fg)]">
                          {label(POSITION_LABELS, row.platformPosition)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[var(--fg)]">
                          <div className="flex items-center justify-end gap-2">
                            <span
                              style={{ width: Math.max(4, (row.spendTry / maxPlacementSpend) * 50) }}
                              className="h-1.5 rounded-full bg-[var(--fg)] shrink-0 opacity-40"
                            />
                            {formatTry(row.spendTry)}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-[var(--fg-muted)]">
                          {formatCount(row.impressions)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-[var(--fg-muted)]">
                          {formatCount(row.clicks)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-[var(--fg-muted)]">
                          {formatPercent(row.ctr)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-[var(--fg-muted)]">
                          {formatTry(row.cpcTry)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Device Breakdown Card */}
          <div data-tour="adshub-placement-devices" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Smartphone size={15} className="text-[var(--fg-muted)]" />
              <span className="text-xs font-bold text-[var(--fg)]">Cihaz Kırılımı (Mobil vs Masaüstü)</span>
            </div>

            {isLoading && <div className="text-xs text-[var(--fg-muted)] py-4">Yükleniyor…</div>}
            {!isLoading && (data?.byDevice.length ?? 0) === 0 && (
              <div className="text-xs text-[var(--fg-muted)] py-4">Bu aralıkta cihaz verisi bulunamadı.</div>
            )}

            {!isLoading && (data?.byDevice.length ?? 0) > 0 && (
              <div className="flex flex-col gap-3">
                {data?.byDevice.map((row, i) => {
                  const Icon = DEVICE_ICON[row.impressionDevice] ?? Monitor;
                  const ratio = Math.max(2, (row.spendTry / maxDeviceSpend) * 100);

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg)]"
                    >
                      <Icon size={16} className="text-[var(--fg-muted)] shrink-0" />
                      <span className="font-semibold text-xs text-[var(--fg)] w-32 shrink-0">
                        {label(DEVICE_LABELS, row.impressionDevice)}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                        <div
                          style={{ width: `${ratio}%` }}
                          className="h-full bg-[var(--fg)] rounded-full transition-all duration-300 opacity-80"
                        />
                      </div>
                      <span className="font-mono font-bold text-xs text-[var(--fg)] w-28 text-right shrink-0">
                        {formatTry(row.spendTry)}
                      </span>
                      <span className="font-mono text-xs text-[var(--fg-muted)] w-20 text-right shrink-0">
                        {formatPercent(row.ctr)} TO
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
