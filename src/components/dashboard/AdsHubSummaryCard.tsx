'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '../../lib/i18n';
import { adsHubApi, type AdsDailyPointDto } from '../../lib/api/adshub';
import { useDashboardFilters } from '../../stores/dashboard-filters';
import type { ErpSourceCode } from '../../stores/store-selector';
import { useRouter } from 'next/navigation';
import { workspaceRoute } from '../../lib/workspace-routes';
import { ExportMenu } from '../ui/ExportMenu';

const AdsHubTrendChart = dynamic(
  () => import('./AdsHubTrendChart').then((module) => module.AdsHubTrendChart),
  { ssr: false, loading: () => <div className="h-full w-full rounded-md bg-bg-subtle" /> },
);

function abbrev(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}B`;
  return Math.round(n).toLocaleString('tr-TR');
}

function formatSpend(spendTry: number, spendNative?: number | null, nativeCode?: string | null): string {
  if (spendTry > 0) return `₺${abbrev(spendTry)}`;
  if (spendNative != null && spendNative > 0 && nativeCode) {
    const sym = nativeCode === 'GBP' ? '£' : nativeCode === 'USD' ? '$' : nativeCode === 'EUR' ? '€' : `${nativeCode} `;
    return `${sym}${abbrev(spendNative)}`;
  }
  return `₺${abbrev(spendTry)}`;
}

export function AdsHubSummaryCard({ selectedStores }: { selectedStores: ErpSourceCode[] }) {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const router = useRouter();
  // Kart artık modülü gerçek rotasında açar — önceden yalnızca durum değiştirip
  // adresi değiştirmiyordu (yenilemede kaybolan, paylaşılamayan bir panel).
  const openWorkspace = () => router.push(workspaceRoute('adshub'));
  const { getDateParams } = useDashboardFilters();
  const { from, to } = getDateParams();

  const { data, isLoading } = useQuery({
    queryKey: ['adshub-overview-dashboard', from, to, selectedStores.join(',')],
    queryFn: () => adsHubApi.getOverview(from, to, selectedStores),
    staleTime: 60_000,
  });

  const hasAnyAccount = (data?.activeAccountCount ?? 0) > 0;
  const hasData = !!data && data.byPlatform.length > 0;

  // Yalnızca GERÇEK günlük seri. Eskiden tek günlük aralıkta (bugün/dün) günün toplamı
  // sabit ağırlıklarla 12 saate bölünüp UYDURMA bir saatlik grafik çiziliyordu — platform
  // saatlik veri vermiyor. Tek günde grafik yok; kart bunu açıkça söyler.
  const chartData: AdsDailyPointDto[] = data?.daily ?? [];
  const isSingleDay = from === to;

  return (
    <div className="store-chart-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 380 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.2px' }}>
            {tr ? 'Reklam Performansı' : 'Ad Performance'}
          </span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--fg-muted)' }}>
            Meta · Google · TikTok
          </span>
        </div>
        {hasData && (
          <ExportMenu
            filename="reklam-performansi"
            getData={() => (data?.byPlatform ?? []).map(p => ({
              'Platform': p.platformName,
              'Harcama (TL)': p.spendTry,
              'Harcama Payı (%)': data?.totalSpendTry ? Math.round((p.spendTry / data.totalSpendTry) * 100) : 0,
              'Gösterim': p.impressions,
              'Tıklama': p.clicks,
            }))}
            label={tr ? 'Dışa Aktar' : 'Export'}
          />
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: 99, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : !hasAnyAccount ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: '24px 12px' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--fg)' }}>{tr ? 'Henüz reklam hesabı bağlı değil' : 'No ad account connected yet'}</p>
            <p style={{ margin: 0, maxWidth: 260, fontSize: 11.5, lineHeight: 1.5, color: 'var(--fg-muted)' }}>
              {tr ? 'Google, Meta veya TikTok hesabınızı bağlayınca harcama ve performans burada görünür.' : 'Connect your Google, Meta, or TikTok account to see spend and performance here.'}
            </p>
            <button
              type="button"
              onClick={() => openWorkspace()}
              style={{
                marginTop: 8,
                borderRadius: 5,
                border: 'none',
                background: 'var(--accent)',
                padding: '6px 14px',
                fontSize: 11.5,
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {tr ? 'Hesap Bağla' : 'Connect Account'}
            </button>
          </div>
        ) : !hasData ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: '24px 12px' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--fg)' }}>{tr ? 'Bu pencerede reklam verisi yok' : 'No ad data in this window'}</p>
            <p style={{ margin: 0, maxWidth: 260, fontSize: 11.5, lineHeight: 1.5, color: 'var(--fg-muted)' }}>{tr ? 'Bağlı hesap(lar) henüz senkronlanmamış olabilir.' : 'Connected account(s) may not be synced yet.'}</p>
            <button
              type="button"
              onClick={() => openWorkspace()}
              style={{
                marginTop: 8,
                borderRadius: 5,
                border: 'none',
                background: 'var(--accent)',
                padding: '6px 14px',
                fontSize: 11.5,
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {tr ? 'AdsHub\'ı Aç' : 'Open AdsHub'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            {/* Hero metrics bar */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: 'var(--fg)', letterSpacing: '-0.4px' }}>
                  {formatSpend(data.totalSpendTry, data.totalSpendNative, data.nativeCurrencyCode)}
                </span>
                <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-muted)', marginTop: 2 }}>
                  {tr ? 'Toplam Harcama' : 'Total Spend'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <MiniStat label={tr ? 'Gösterim' : 'Impressions'} value={abbrev(data.totalImpressions)} />
                <MiniStat label={tr ? 'Tıklama' : 'Clicks'} value={abbrev(data.totalClicks)} />
                <MiniStat label="CTR" value={data.ctr != null ? `%${data.ctr.toFixed(2)}` : '—'} />
              </div>
            </div>

            {/* Platform breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.byPlatform.map((p) => {
                const share = data.totalSpendTry > 0 ? (p.spendTry / data.totalSpendTry) * 100 : 100;
                return (
                  <div key={p.platform} style={{ borderRadius: 5, border: '1px solid var(--border-soft)', background: 'var(--card)', padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
                      <span style={{ fontWeight: 800, color: 'var(--fg)' }}>{p.platformName}</span>
                      <span style={{ fontWeight: 600, color: 'var(--fg-muted)', fontSize: 11 }}>
                        {formatSpend(p.spendTry, data.totalSpendNative, data.nativeCurrencyCode)} · {abbrev(p.impressions)} {tr ? 'gösterim' : 'impr.'}
                      </span>
                    </div>
                    <div style={{ marginTop: 6, height: 3, borderRadius: 99, background: 'var(--border-soft)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(5, share)}%`, height: '100%', borderRadius: 99, background: 'var(--accent)' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Günlük harcama trendi — yalnızca gerçek veri */}
            {chartData.length > 1 ? (
              <div style={{ flex: 1, minHeight: 90, marginTop: 4 }}>
                <AdsHubTrendChart data={chartData} formatSpend={(v) => `₺${abbrev(v)}`} />
              </div>
            ) : isSingleDay && (
              <p className="m-0 text-[10.5px] text-[var(--fg-muted)]">
                {tr ? 'Saatlik kırılım yok — trend için birden fazla gün seçin.' : 'No hourly breakdown — pick more than one day for a trend.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--fg)' }}>{value}</span>
      <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-subtle)' }}>{label}</span>
    </div>
  );
}
