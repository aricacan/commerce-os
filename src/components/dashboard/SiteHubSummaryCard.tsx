'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { siteHubApi } from '../../lib/api/sitehub';
import { useDashboardFilters } from '../../stores/dashboard-filters';
import { useRouter } from 'next/navigation';
import { workspaceRoute } from '../../lib/workspace-routes';
import { describeError } from '../../lib/errors';
import { useAuthStore } from '../../stores/auth';
import { SITEHUB_DASHBOARD_ROLES } from '../../lib/sitehub/roles';

const SiteHubTrendChart = dynamic(
  () => import('./SiteHubTrendChart').then((module) => module.SiteHubTrendChart),
  { ssr: false, loading: () => <div className="h-full w-full rounded-md bg-bg-subtle" /> },
);

function abbrev(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}B`;
  return Math.round(n).toLocaleString('tr-TR');
}

// AdsHubSummaryCard ile BİREBİR AYNI teknik/görsel desen — web sitesi
// bağlantıları/talepleri modülünün ana dashboard özeti.
export function SiteHubSummaryCard() {
  // En az yetki kuralı: backend ucu (SiteHubDashboardController) yalnızca
  // SuperAdmin/Admin/Moderator'a açık. Backend'i genişletmek yerine kartı
  // çağıramayan rollerde HİÇ göstermiyoruz — böylece 403 render edilmiş bir
  // karttan artık ulaşılamaz; aşağıdaki hata dalı yalnızca gerçek/beklenmedik
  // arızalar (500, ağ, modül kapalı) için kalır.
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const canViewSiteHub = SITEHUB_DASHBOARD_ROLES.some((r) => roles.includes(r));

  const router = useRouter();
  // Kart artık modülü gerçek rotasında açar — önceden yalnızca durum değiştirip
  // adresi değiştirmiyordu (yenilemede kaybolan, paylaşılamayan bir panel).
  const openWorkspace = () => router.push(workspaceRoute('sitehub'));
  const { getDateParams } = useDashboardFilters();
  const { from, to } = getDateParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sitehub-widget-summary-dashboard', from, to],
    queryFn: () => siteHubApi.getWidgetSummary(from, to),
    staleTime: 60_000,
    enabled: canViewSiteHub,
  });

  // Hook'lar koşulsuz çağrıldıktan SONRA çıkılır (hook kuralları).
  if (!canViewSiteHub) return null;

  const hasAnySite = (data?.connectedSiteCount ?? 0) > 0;
  // Site KAYITLI ama hiçbiri sayılmıyor: hepsi duraklatılmış ya da pasif.
  // (SiteSyncService, site API anahtarı reddedilince siteyi otomatik duraklatıyor.)
  const hasOnlyDisabledSites = !hasAnySite && (data?.totalSiteCount ?? 0) > 0;
  const hasData = !!data && data.requestCount > 0;
  const respondedRatePercent = data && data.requestCount > 0
    ? Math.round((data.respondedRequestCount / data.requestCount) * 100)
    : null;

  return (
    <div className="store-chart-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 380 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.2px' }}>
            SiteHub
          </span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--fg-muted)' }}>
            Site Bağlantıları · Teklif/Mesaj Talepleri
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: 99, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : isError ? (
          // KÖK NEDEN (canlıda bulundu): burada hata dalı YOKTU. İstek 401/403/500
          // dönse bile `data` undefined kalıyor ve kart "Henüz site bağlı değil"
          // diyordu — gerçek sebep kullanıcıdan TAMAMEN gizleniyordu.
          // Rol kaynaklı 403 artık yukarıdaki kapıda eleniyor; bu dal beklenmedik
          // arızalar (modül kapalı, 500, ağ hatası) için dürüst mesaj verir.
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: '24px 12px' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--fg)' }}>Özet yüklenemedi</p>
            <p style={{ margin: 0, maxWidth: 260, fontSize: 11.5, lineHeight: 1.5, color: 'var(--fg-muted)' }}>
              {describeError(error)}
            </p>
          </div>
        ) : hasOnlyDisabledSites ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: '24px 12px' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--fg)' }}>
              {(data?.pausedSiteCount ?? 0) > 0 ? 'Siteler duraklatılmış' : 'Siteler pasif'}
            </p>
            <p style={{ margin: 0, maxWidth: 260, fontSize: 11.5, lineHeight: 1.5, color: 'var(--fg-muted)' }}>
              {data?.totalSiteCount} site kayıtlı ama hiçbiri şu anda aktif değil. Site API
              anahtarı reddedilen bağlantılar otomatik duraklatılır — SiteHub&apos;ta durumu kontrol edin.
            </p>
            <button
              type="button"
              onClick={() => openWorkspace()}
              style={{ marginTop: 8, borderRadius: 5, border: 'none', background: 'var(--accent)', padding: '6px 14px', fontSize: 11.5, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
              SiteHub&apos;ı Aç
            </button>
          </div>
        ) : !hasAnySite ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: '24px 12px' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--fg)' }}>Henüz site bağlı değil</p>
            <p style={{ margin: 0, maxWidth: 260, fontSize: 11.5, lineHeight: 1.5, color: 'var(--fg-muted)' }}>
              Web sitenizi bağlayınca gelen teklif/mesaj talepleri burada görünür.
            </p>
            <button
              type="button"
              onClick={() => openWorkspace()}
              style={{ marginTop: 8, borderRadius: 5, border: 'none', background: 'var(--accent)', padding: '6px 14px', fontSize: 11.5, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
              Site Bağla
            </button>
          </div>
        ) : !hasData ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: '24px 12px' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--fg)' }}>Bu pencerede talep yok</p>
            <p style={{ margin: 0, maxWidth: 260, fontSize: 11.5, lineHeight: 1.5, color: 'var(--fg-muted)' }}>Bağlı site(ler)e henüz talep gelmemiş olabilir.</p>
            <button
              type="button"
              onClick={() => openWorkspace()}
              style={{ marginTop: 8, borderRadius: 5, border: 'none', background: 'var(--accent)', padding: '6px 14px', fontSize: 11.5, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
              SiteHub&apos;ı Aç
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: 'var(--fg)', letterSpacing: '-0.4px' }}>
                  {abbrev(data.requestCount)}
                </span>
                <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-muted)', marginTop: 2 }}>
                  Gelen Talep
                </span>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <MiniStat label="Bağlı Site" value={String(data.connectedSiteCount)} />
                <MiniStat label="Yanıtlanan" value={respondedRatePercent != null ? `%${respondedRatePercent}` : '—'} />
                <MiniStat label="Blog Yayını" value={abbrev(data.blogPostCount)} />
              </div>
            </div>

            {data.dailyTrend.length > 1 && (
              <div style={{ flex: 1, minHeight: 90, marginTop: 4 }}>
                <SiteHubTrendChart data={data.dailyTrend} />
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
