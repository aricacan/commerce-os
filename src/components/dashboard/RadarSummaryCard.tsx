'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { radarApi } from '../../lib/api/radar';
import { useDashboardFilters } from '../../stores/dashboard-filters';
import { useRouter } from 'next/navigation';
import { workspaceRoute } from '../../lib/workspace-routes';

const RadarSicDistributionChart = dynamic(
  () => import('./RadarSicDistributionChart').then((module) => module.RadarSicDistributionChart),
  { ssr: false, loading: () => <div className="h-full w-full rounded-md bg-bg-subtle" /> },
);

function abbrev(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}B`;
  return Math.round(n).toLocaleString('tr-TR');
}

// AdsHubSummaryCard ile BİREBİR AYNI teknik/görsel desen — B2B lead generation
// (Companies House scraping + email) modülünün ana dashboard özeti.
export function RadarSummaryCard() {
  const router = useRouter();
  // Kart artık modülü gerçek rotasında açar — önceden yalnızca durum değiştirip
  // adresi değiştirmiyordu (yenilemede kaybolan, paylaşılamayan bir panel).
  const openWorkspace = () => router.push(workspaceRoute('b2b-outreach'));
  const { getDateParams } = useDashboardFilters();
  const { from, to } = getDateParams();

  const { data, isLoading } = useQuery({
    queryKey: ['radar-widget-summary-dashboard', from, to],
    queryFn: () => radarApi.dashboardOverview(from, to),
    staleTime: 60_000,
  });

  const hasAnyData = !!data && (data.scrapedCompanyCount > 0 || data.sicCodeDistribution.length > 0 || data.activeScrapeRunCount > 0);
  const hasChart = !!data && data.sicCodeDistribution.length > 0;

  return (
    <div className="store-chart-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 380 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.2px' }}>
            Radar
          </span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--fg-muted)' }}>
            B2B Lead Generation
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: 99, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : !hasAnyData ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: '24px 12px' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--fg)' }}>Henüz taranan şirket yok</p>
            <p style={{ margin: 0, maxWidth: 260, fontSize: 11.5, lineHeight: 1.5, color: 'var(--fg-muted)' }}>
              İlk tarama çalıştığında şirket ve e-posta özetleri burada görünür.
            </p>
            <button
              type="button"
              onClick={() => openWorkspace()}
              style={{ marginTop: 8, borderRadius: 5, border: 'none', background: 'var(--accent)', padding: '6px 14px', fontSize: 11.5, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
              Radar&apos;ı Aç
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: 'var(--fg)', letterSpacing: '-0.4px' }}>
                  {abbrev(data.scrapedCompanyCount)}
                </span>
                <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-muted)', marginTop: 2 }}>
                  Taranan Şirket
                </span>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <MiniStat label="Gönderilen E-posta" value={abbrev(data.emailsSentCount)} />
                <MiniStat label="Lead Oranı" value={`%${data.leadRatePercent.toFixed(1)}`} />
                <MiniStat label="Aktif Tarama" value={String(data.activeScrapeRunCount)} />
              </div>
            </div>

            {hasChart && (
              <div style={{ flex: 1, minHeight: 90, marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 110, height: 110, flexShrink: 0 }}>
                  <RadarSicDistributionChart data={data.sicCodeDistribution} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1, overflow: 'auto' }}>
                  {data.sicCodeDistribution.map((slice) => (
                    <div key={slice.sicCode} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                      <span style={{ color: 'var(--fg-muted)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slice.sicCode}</span>
                      <span style={{ color: 'var(--fg)', fontWeight: 800, marginLeft: 8 }}>{slice.count}</span>
                    </div>
                  ))}
                </div>
              </div>
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
