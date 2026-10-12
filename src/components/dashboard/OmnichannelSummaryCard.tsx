'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { omnichannelApi } from '../../lib/api/omnichannel';
import { useDashboardFilters } from '../../stores/dashboard-filters';
import { useRouter } from 'next/navigation';
import { workspaceRoute } from '../../lib/workspace-routes';

const OmnichannelTrendChart = dynamic(
  () => import('./OmnichannelTrendChart').then((module) => module.OmnichannelTrendChart),
  { ssr: false, loading: () => <div className="h-full w-full rounded-md bg-bg-subtle" /> },
);

function abbrev(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}B`;
  return Math.round(n).toLocaleString('tr-TR');
}

function formatSeconds(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}sn`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}dk`;
  return `${(seconds / 3600).toFixed(1)}sa`;
}

// AdsHubSummaryCard ile BİREBİR AYNI teknik/görsel desen (KPI bar + trend grafiği,
// dinamik import edilmiş grafik, hasData/hasAnyChannel boş-durum kontrolü) — çok
// kanallı mesajlaşma modülünün ana dashboard özeti.
export function OmnichannelSummaryCard() {
  const router = useRouter();
  // Kart artık modülü gerçek rotasında açar — önceden yalnızca durum değiştirip
  // adresi değiştirmiyordu (yenilemede kaybolan, paylaşılamayan bir panel).
  const openWorkspace = () => router.push(workspaceRoute('omnichannel'));
  const { getDateParams } = useDashboardFilters();
  const { from, to } = getDateParams();

  const { data, isLoading } = useQuery({
    queryKey: ['omnichannel-overview-dashboard', from, to],
    queryFn: () => omnichannelApi.getOverview(from, to),
    staleTime: 60_000,
  });

  const hasAnyChannel = (data?.connectedChannelCount ?? 0) > 0;
  const hasData = !!data && data.totalMessageCount > 0;

  return (
    <div className="store-chart-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 380 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.2px' }}>
            Çok Kanallı Mesajlaşma
          </span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--fg-muted)' }}>
            WhatsApp · Instagram · Facebook
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: 99, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : !hasAnyChannel ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: '24px 12px' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--fg)' }}>Henüz kanal bağlı değil</p>
            <p style={{ margin: 0, maxWidth: 260, fontSize: 11.5, lineHeight: 1.5, color: 'var(--fg-muted)' }}>
              WhatsApp, Instagram veya Facebook hesabınızı bağlayınca mesaj trafiği burada görünür.
            </p>
            <button
              type="button"
              onClick={() => openWorkspace()}
              style={{ marginTop: 8, borderRadius: 5, border: 'none', background: 'var(--accent)', padding: '6px 14px', fontSize: 11.5, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
              Kanal Bağla
            </button>
          </div>
        ) : !hasData ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: '24px 12px' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--fg)' }}>Bu pencerede mesaj yok</p>
            <p style={{ margin: 0, maxWidth: 260, fontSize: 11.5, lineHeight: 1.5, color: 'var(--fg-muted)' }}>Bağlı kanal(lar)a henüz mesaj gelmemiş olabilir.</p>
            <button
              type="button"
              onClick={() => openWorkspace()}
              style={{ marginTop: 8, borderRadius: 5, border: 'none', background: 'var(--accent)', padding: '6px 14px', fontSize: 11.5, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
              Omnichannel&apos;ı Aç
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: 'var(--fg)', letterSpacing: '-0.4px' }}>
                  {abbrev(data.totalMessageCount)}
                </span>
                <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-muted)', marginTop: 2 }}>
                  Toplam Mesaj
                </span>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <MiniStat label="Bağlı Kanal" value={String(data.connectedChannelCount)} />
                <MiniStat label="Bot Oranı" value={data.botHandledRatePercent != null ? `%${data.botHandledRatePercent.toFixed(0)}` : '—'} />
                <MiniStat label="Ort. Yanıt" value={formatSeconds(data.avgResponseTimeSeconds)} />
                <MiniStat label="Açık Konuşma" value={String(data.openConversationCount)} />
              </div>
            </div>

            {data.dailyTrend.length > 1 && (
              <div style={{ flex: 1, minHeight: 90, marginTop: 4 }}>
                <OmnichannelTrendChart data={data.dailyTrend} />
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
