'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { Sun, Moon, Globe, LogOut, ChevronDown, Bell, Download, Grid3x3, Lock, UserCog, Hash, PanelLeft, HelpCircle, MessagesSquare, Mail, Search } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useLayoutStore } from '../../stores/layout';

// Sabit ekip linkleri (Trello board + Slack workspace) — sadece yeni sekmede açar, başka işlevi yok.
import { useAuthStore } from '../../stores/auth';
import { useI18n } from '../../lib/i18n';
import { authApi, notificationApi, platformApi, erpSourcesApi } from '../../lib/api';
import { useAiPanel } from '../../stores/ai-panel';
import { useWorkspacePanel } from '../../stores/workspace-panel';
import { useAppsLauncher } from '../../stores/apps-launcher';
import { useAppCatalog } from '../../hooks/useAppCatalog';
import { useTenantLinks } from '../../hooks/useTenantLinks';
import { AppsDirectory } from './AppsDirectory';
import { workspaceRoute } from '../../lib/workspace-routes';
import { parseAdPlatformSlug } from '../../lib/api/adshub';
import { useNotificationPanel } from '../../stores/notification-panel';
import { useStoreSelector, ERP_SOURCE_OPTIONS, type ErpSourceCode } from '../../stores/store-selector';
import { useHelpModal } from '../../stores/help-modal';
import { useCommandPalette } from '../../stores/command-palette';
import { TopbarOverlays } from './TopbarOverlays';
import { mobileMenuRowStyle, isStoreSelectorHidden } from './topbar-config';
import { TopbarSearch } from './TopbarSearch';
import { text } from '../../features/shared/design';

export function Topbar({
  isMobile = false,
  onMobileMenuOpen,
}: {
  isMobile?: boolean;
  onMobileMenuOpen?: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const { lang, t, setLang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [slackModalOpen, setSlackModalOpen] = useState(false);
  const [slackMenuOpen, setSlackMenuOpen] = useState(false);
  const [mailModalOpen, setMailModalOpen] = useState(false);
  const [pwaModalOpen, setPwaModalOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('install') === 'true' || window.location.hash === '#install';
  });
  const pwaInstall = usePwaInstall();
  const slackRef = useRef<HTMLDivElement>(null);
  const [avatarOverride, setAvatarOverride] = useState<string | null | undefined>(undefined);
  const avatarUrl = avatarOverride === undefined ? user?.profilePhotoUrl ?? null : avatarOverride;

  const handleSaveAvatar = async (url: string | null) => {
    await authApi.updateProfilePhoto(url);
    setAvatarOverride(url);
  };

  // Bildirim listesi + rozet sayısı artık NotificationPanel.tsx ile aynı React Query
  // queryKey'ini paylaşıyor — iki bileşen de aynı önbelleği okur, ayrı polling gerekmez.
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationApi.list,
    refetchInterval: 60_000,
  });
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const { open: notificationOpen, openPanel: openNotificationPanel } = useNotificationPanel();
  // Menünün açık/kapalı durumu paylaşılan store'da: panodaki "Uygulamalar" KPI kartı da
  // aynı menüyü açar (uygulama listesini kopyalamadan — bkz. stores/apps-launcher.ts).
  const appsMenuOpen = useAppsLauncher((s) => s.menuOpen);
  const toggleAppsMenu = useAppsLauncher((s) => s.toggleMenu);
  const closeAppsMenu = useAppsLauncher((s) => s.closeMenu);
  // setPendingAdsHubOAuthSession — AdsHub OAuth dönüş akışı için (bkz. aşağıdaki
  // useEffect). Panel-tabanlı modül açma yolu (activeWorkspace/open/close)
  // KALDIRILDI: son açık kalan çağrı yeri de rotaya taşındı (bkz. workspace-routes.ts),
  // artık her modülün gerçek, paylaşılabilir bir adresi var.
  const { setPendingAdsHubOAuthSession } = useWorkspacePanel();

  // AdsHub'ın "Connect with X" dönüş yolu (bkz. AdsHubOAuthController.Callback)
  // panelin ROTASI değil, tam sayfa yönlendirmeyle buraya (?oauthSession=...&
  // platform=...) döner. Dönüş herhangi bir sayfaya düşebildiği için bu tespiti
  // global olan Topbar yapıyor: oturumu store'a yazar, AdsHub'ın Hesaplar
  // sekmesine YÖNLENDİRİR (modülün artık kendi rotası var — bkz. workspace-routes.ts)
  // ve query'yi TEMİZLER (sayfa yenilemesi akışı tekrar tetiklemesin).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('oauthSession');
    const platformSlug = params.get('platform');
    if (!sessionId || !platformSlug) return;

    const platform = parseAdPlatformSlug(platformSlug);
    if (platform === null) return;

    setPendingAdsHubOAuthSession({ sessionId, platform });

    params.delete('oauthSession');
    params.delete('platform');
    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
    router.push(`${workspaceRoute('adshub')}/accounts`);
    // Yalnızca İLK MOUNT'ta çalışsın — sonraki her render'da params okunup
    // tekrar tetiklenmesin diye bilerek boş bağımlılık dizisi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Uygulama listesi + modül bayrağı/yetki kuralları ortak katalogda (bkz.
  // hooks/useAppCatalog.ts) — Topbar menüsü, mobil menü ve panodaki büyük
  // Uygulamalar paneli aynı kaynaktan besleniyor.
  const APPS = useAppCatalog();
  // Şirketin kendi Slack/Trello adresleri (Slack › Şirket Bağlantıları); tanımsızsa kısayol gizli.
  const { slackWorkspaceUrl, trelloBoardUrl } = useTenantLinks();
  const { selectedStores, toggleStore, selectAll, setSelectedStores, selectedPlatformIds, togglePlatform, clearPlatforms, selectedMp } = useStoreSelector();
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [platformMenuOpen, setPlatformMenuOpen] = useState(false);
  // Kaskad dropdown'ında kullanıcının girdiği seviye: önce ülke, sonra (varsa) ERP.
  const [menuCountry, setMenuCountry] = useState<string | null>(null);
  const [menuErp, setMenuErp] = useState<string | null>(null);
  const isAllStores = selectedStores.length === 0 && !selectedMp;

  // Kaskad seçicinin dinamik kataloğu (Ülke → ERP → Firma) — DataSources tablosundan gelir
  // (DisplayName Ayarlar'dan düzenlenebilir, yeni ülke/ERP satır eklenince kendiliğinden
  // belirir). Endpoint yüklenene kadar sabit ERP_SOURCE_OPTIONS'a düşülür ki seçici asla
  // boş kalmasın. selectorCode'lar X-Store protokolünün MEVCUT kodları — tel değişmez.
  const { data: erpSources } = useQuery({
    queryKey: ['erp-sources'],
    queryFn: erpSourcesApi.list,
    staleTime: 5 * 60_000,
  });

  const rawSourceCatalog: { code: ErpSourceCode; label: string; color: string; country: string; erp: string }[] =
    erpSources && erpSources.length > 0
      ? erpSources.map((s) => ({
          code: s.selectorCode as ErpSourceCode,
          label: s.displayName,
          color: ERP_SOURCE_OPTIONS.find((o) => o.code === s.selectorCode)?.color ?? s.storeColor ?? 'var(--accent)',
          country: s.country || '—',
          erp: s.erp,
        }))
      : ERP_SOURCE_OPTIONS.map((o) => ({
          ...o,
          country: o.code.startsWith('base-') ? 'UK' : 'TR',
          erp: o.code.startsWith('base-') ? 'Base' : 'Sentos',
        }));
  const sourceCatalog = [...rawSourceCatalog].sort((a, b) => {
    const aIsBase = a.erp.toLowerCase() === 'base' || a.code.startsWith('base-');
    const bIsBase = b.erp.toLowerCase() === 'base' || b.code.startsWith('base-');
    if (aIsBase !== bIsBase) return aIsBase ? 1 : -1;
    return a.label.localeCompare(b.label, lang === 'tr' ? 'tr' : 'en');
  });

  const countries = [...new Set(sourceCatalog.map((s) => s.country))];

  // Ürünler ve ayar sayfalarında mağaza/ERP seçicisi pasif: bu ekranlar global yönetim ekranı gibi
  // çalışır.
  const isProductsPage = pathname.startsWith('/products');
  const isSettingsStoreSelectorPassive =
    pathname.startsWith('/system') || pathname.startsWith('/customize') || pathname === '/finance/shipping';
  const isStoreSelectorPassive = isProductsPage || isSettingsStoreSelectorPassive;

  // Bir ülkenin TÜM firmaları (ve yalnızca onlar) seçiliyse buton etiketi "UK · Tümü" olur.
  const fullySelectedCountry = countries.find((c) => {
    const codes = sourceCatalog.filter((s) => s.country === c).map((s) => s.code);
    return codes.length > 0 && codes.length === selectedStores.length && codes.every((cd) => selectedStores.includes(cd));
  });

  const selectedStoreOptions = sourceCatalog.filter((o) => selectedStores.includes(o.code));
  const storeButtonLabel = selectedMp
    ? selectedMp.platformName + '-' + selectedMp.storeCode
    : isAllStores
      ? t('topbar_store_all')
      : fullySelectedCountry
        ? `${fullySelectedCountry} · ${t('topbar_store_all')}`
        : selectedStoreOptions.length === 1
          ? selectedStoreOptions[0].label
          : `${selectedStoreOptions.length} ${t('topbar_stores_label')}`;

  // Platform alt-seçici (ör. eBay/Trendyol) — ERP boyutunda en az bir seçim varken anlamlı,
  // seçenekleri o mağaza kapsamında GERÇEKTEN sipariş bulunan platformlarla sınırlı (bkz.
  // PlatformController.GetPlatformsForSelection — zaten WhereStore kullanıyor).
  const { data: platformOptions } = useQuery({
    queryKey: ['platforms-for-selection', selectedStores],
    queryFn: platformApi.listForSelection,
    enabled: selectedStores.length > 0,
  });

  // MP (doğrudan pazaryeri entegrasyonu) — Settings > Entegrasyon'da API anahtarı kayıtlı
  // her (Store, Platform) çifti. Seçilince ERP + Platform alt-seçici devre dışı kalır.
  // Mağaza seçici dropdown'ı kapanınca kaskadı köke sıfırla — tekrar açılınca ülke
  // seviyesinden başlasın (yarım kalmış bir alt seviyede açılmasın).
  const closeStoreMenu = () => {
    setStoreMenuOpen(false);
    setMenuCountry(null);
    setMenuErp(null);
  };

  const { togglePanel } = useAiPanel();
  const isDark = resolvedTheme === 'dark';

  const [scanOpen, setScanOpen] = useState(false);
  const [scannedSku, setScannedSku] = useState<string | null>(null);

  async function handleLogout() {
    // Backend refresh token'ı sunucuda iptal eder ve HttpOnly cookie'yi siler (JS silemez).
    await authApi.logout().catch(() => {});
    logout();
    router.replace('/login');
  }

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '';
  const initials = user
    ? (fullName || user.email).split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);

  return (
    <>
    <header
      style={{
        height: '56px',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '0 12px' : '0 20px',
        gap: 10,
        flexShrink: 0,
        position: 'relative',
        // Header kendi stacking context'ini oluşturur. Apps ve profil dropdown'larının
        // dashboard widget'larının altında kalmaması için içerik katmanlarının üstündedir;
        // mobil drawer (60/70) yine header'ın üzerinde kalır.
        zIndex: 50,
      }}
    >
      {/* Sidebar Toggle Button — Base ERP Style */}
      {isMobile ? (
        <button
          onClick={onMobileMenuOpen}
          aria-label="Menüyü aç"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, flexShrink: 0,
            background: 'var(--card)', border: '1px solid var(--border-soft)',
            borderRadius: 6, color: 'var(--fg-muted)', cursor: 'pointer',
          }}
        >
          <PanelLeft size={16} />
        </button>
      ) : (
        <button
          onClick={toggleSidebar}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32,
            background: 'var(--card)', border: '1px solid var(--border-soft)',
            borderRadius: '6px', cursor: 'pointer', color: 'var(--fg-muted)',
            transition: 'all 0.12s', flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
          title="Sol Paneli Aç / Kapat"
        >
          <PanelLeft size={16} />
        </button>
      )}

      {/* Quick Access / Mağaza Seçici — Base ERP Style */}
      {!isStoreSelectorHidden(pathname) && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            disabled={isStoreSelectorPassive}
            onClick={() => { if (!isStoreSelectorPassive) setStoreMenuOpen((o) => !o); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 32, padding: isMobile ? '0 8px' : '0 10px',
              background: 'var(--card)',
              border: '1px solid var(--border-soft)',
              borderRadius: '6px',
              cursor: isStoreSelectorPassive ? 'not-allowed' : 'pointer',
              opacity: isStoreSelectorPassive ? 0.45 : 1,
              fontSize: text.sm, fontWeight: 600,
              transition: 'all 0.12s',
              boxShadow: 'var(--shadow-xs)',
              color: 'var(--fg)',
            }}
            onMouseEnter={(e) => { if (!isStoreSelectorPassive) e.currentTarget.style.background = 'var(--card-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; }}
            title={isStoreSelectorPassive ? 'Bu sayfada mağaza/ERP seçimi kullanılmaz.' : t('topbar_store_filter')}
          >
            <span className="max-w-[100px] sm:max-w-[140px] truncate">{storeButtonLabel ? `ERP: ${storeButtonLabel}` : 'ERP'}</span>
            <ChevronDown size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
          </button>

          {storeMenuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={closeStoreMenu} />
              <div
                className="animate-fade-in"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 'calc(100% + 6px)',
                  width: 190,
                  background: 'var(--card)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 20,
                  overflow: 'hidden',
                  padding: 4,
                }}
              >
                {(menuCountry || menuErp) && (
                  <button
                    onClick={() => { if (menuErp) setMenuErp(null); else setMenuCountry(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 10px', background: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', fontSize: text.sm, fontWeight: 600, color: 'var(--fg-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <ChevronDown size={13} style={{ transform: 'rotate(90deg)' }} />
                    {menuErp ?? menuCountry}
                  </button>
                )}

                {!menuCountry && (
                  <>
                    <button
                      onClick={() => { selectAll(); closeStoreMenu(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px',
                        background: isAllStores ? 'var(--bg-subtle)' : 'transparent',
                        border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left',
                        fontSize: text.sm, fontWeight: isAllStores ? 700 : 500, color: 'var(--fg)',
                      }}
                      onMouseEnter={(e) => { if (!isAllStores) e.currentTarget.style.background = 'var(--card-hover)'; }}
                      onMouseLeave={(e) => { if (!isAllStores) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fg-muted)', flexShrink: 0 }} />
                      {t('topbar_store_all')}
                    </button>
                    <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 2px' }} />
                    {countries.map((c) => {
                      const erps = [...new Set(sourceCatalog.filter((s) => s.country === c).map((s) => s.erp))];
                      const active = selectedStoreOptions.some((s) => s.country === c);
                      return (
                        <button
                          key={c}
                          onClick={() => { if (erps.length === 1) { setMenuCountry(c); setMenuErp(erps[0]); } else setMenuCountry(c); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', fontSize: text.sm, fontWeight: active ? 700 : 500, color: 'var(--fg)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ flex: 1 }}>{c}</span>
                          <ChevronDown size={12} style={{ transform: 'rotate(-90deg)', opacity: 0.5, flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </>
                )}

                {menuCountry && !menuErp && (
                  <>
                    <button
                      onClick={() => { setSelectedStores(sourceCatalog.filter((s) => s.country === menuCountry).map((s) => s.code)); closeStoreMenu(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', fontSize: text.sm, fontWeight: 500, color: 'var(--fg)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fg-muted)', flexShrink: 0 }} />
                      {menuCountry} · {t('topbar_store_all')}
                    </button>
                    <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 2px' }} />
                    {[...new Set(sourceCatalog.filter((s) => s.country === menuCountry).map((s) => s.erp))].map((erp) => (
                      <button
                        key={erp}
                        onClick={() => setMenuErp(erp)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', fontSize: text.sm, fontWeight: 500, color: 'var(--fg)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ flex: 1 }}>{erp}</span>
                        <ChevronDown size={12} style={{ transform: 'rotate(-90deg)', opacity: 0.5, flexShrink: 0 }} />
                      </button>
                    ))}
                  </>
                )}

                {menuCountry && menuErp && (
                  <>
                    <button
                      onClick={() => { setSelectedStores(sourceCatalog.filter((s) => s.country === menuCountry && s.erp === menuErp).map((s) => s.code)); closeStoreMenu(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', fontSize: text.sm, fontWeight: 500, color: 'var(--fg)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fg-muted)', flexShrink: 0 }} />
                      {menuErp} · {t('topbar_store_all')}
                    </button>
                    <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 2px' }} />
                    {sourceCatalog.filter((s) => s.country === menuCountry && s.erp === menuErp).map((opt) => {
                      const checked = selectedStores.includes(opt.code);
                      return (
                        <button
                          key={opt.code}
                          onClick={() => toggleStore(opt.code)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px',
                            background: checked ? 'var(--bg-subtle)' : 'transparent',
                            border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left',
                            fontSize: text.sm, fontWeight: checked ? 700 : 500, color: 'var(--fg)',
                          }}
                          onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = 'var(--card-hover)'; }}
                          onMouseLeave={(e) => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{
                            width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                            border: `1.5px solid ${checked ? 'var(--fg)' : 'var(--border-soft)'}`,
                            background: checked ? 'var(--fg)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {checked && <span style={{ width: 4, height: 7, borderRight: '2px solid var(--card)', borderBottom: '2px solid var(--card)', transform: 'rotate(45deg) translate(-1px,-1px)' }} />}
                          </span>
                          {opt.label}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Platform (Pazaryeri) alt-seçici — ERP butonunun hemen yanında */}
      {!isStoreSelectorHidden(pathname) && platformOptions && platformOptions.length > 0 && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setPlatformMenuOpen((o) => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 32, padding: isMobile ? '0 8px' : '0 10px',
              background: 'var(--card)',
              border: '1px solid var(--border-soft)',
              borderRadius: '6px',
              cursor: 'pointer', fontSize: text.sm, fontWeight: 600,
              transition: 'all 0.12s',
              boxShadow: 'var(--shadow-xs)',
              color: 'var(--fg)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; }}
            title={t('topbar_platform_filter')}
          >
            <span className="max-w-[90px] sm:max-w-[130px] truncate">
              {selectedPlatformIds.length === 0
                ? (lang === 'tr' ? 'Platform: Tümü' : 'Platform: All')
                : selectedPlatformIds.length === 1
                  ? `Platform: ${platformOptions.find((p) => p.id === selectedPlatformIds[0])?.name ?? ''}`
                  : `Platform (${selectedPlatformIds.length})`}
            </span>
            <ChevronDown size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
          </button>

          {platformMenuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setPlatformMenuOpen(false)} />
              <div
                className="animate-fade-in"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 'calc(100% + 6px)',
                  width: 190,
                  background: 'var(--card)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 20,
                  overflow: 'hidden',
                  padding: 4,
                }}
              >
                <button
                  onClick={() => { clearPlatforms(); setPlatformMenuOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '7px 10px',
                    background: selectedPlatformIds.length === 0 ? 'var(--bg-subtle)' : 'transparent',
                    border: 'none', borderRadius: '4px',
                    cursor: 'pointer', textAlign: 'left',
                    fontSize: text.sm, fontWeight: selectedPlatformIds.length === 0 ? 700 : 500,
                    color: 'var(--fg)',
                  }}
                  onMouseEnter={(e) => { if (selectedPlatformIds.length !== 0) e.currentTarget.style.background = 'var(--card-hover)'; }}
                  onMouseLeave={(e) => { if (selectedPlatformIds.length !== 0) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fg-muted)', flexShrink: 0 }} />
                  {t('filter_all_platforms')}
                </button>

                <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 2px' }} />

                {platformOptions.map((p) => {
                  const checked = selectedPlatformIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '7px 10px',
                        background: checked ? 'var(--bg-subtle)' : 'transparent',
                        border: 'none', borderRadius: '4px',
                        cursor: 'pointer', textAlign: 'left',
                        fontSize: text.sm, fontWeight: checked ? 700 : 500,
                        color: 'var(--fg)',
                      }}
                      onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = 'var(--card-hover)'; }}
                      onMouseLeave={(e) => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{
                        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                        border: `1.5px solid ${checked ? 'var(--fg)' : 'var(--border-soft)'}`,
                        background: checked ? 'var(--fg)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {checked && <span style={{ width: 4, height: 7, borderRight: '2px solid var(--card)', borderBottom: '2px solid var(--card)', transform: 'rotate(45deg) translate(-1px,-1px)' }} />}
                      </span>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Search Input — Center/Left */}
      {!isMobile && <TopbarSearch isMobile={false} onScan={() => setScanOpen(true)} />}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right controls — Base ERP Style */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ display: isMobile ? 'none' : 'contents' }}>
        {/* Help button */}
        <button
          onClick={() => useHelpModal.getState().toggle()}
          className="hidden xl:flex items-center justify-center cursor-pointer transition-colors"
          style={{
            width: 30, height: 30,
            background: 'var(--card)', border: '1px solid var(--border-soft)',
            borderRadius: '50%', color: 'var(--fg-muted)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
          title="Yardım & Kısayollar (?)"
        >
          <HelpCircle size={15} />
        </button>

        {/* AI butonu KALDIRILDI: artık her sayfada sağ-altta yüzen Aivar
            widget'ı var (bkz. components/ai/AiFloatingWidget.tsx) — Topbar'da
            ayrıca bir giriş noktası tutmak aynı şeyi iki yerde göstermekti.
            Tam-yükseklik dock paneli hâlâ var, widget'ın "Tam paneli aç"
            ikonundan açılıyor; mobilde (widget gizli) kullanıcı menüsündeki
            "Aivar" satırı (bkz. aşağıda, togglePanel) tek erişim yolu. */}

        {/* Notifications button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={openNotificationPanel}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30,
              background: 'var(--card)', border: '1px solid var(--border-soft)',
              borderRadius: '50%', cursor: 'pointer', color: 'var(--fg-muted)',
              transition: 'all 0.12s', position: 'relative',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
            title={t('topbar_notifications')}
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 5, right: 5,
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--fg)',
              }} />
            )}
          </button>
        </div>

        {/* Apps launcher */}
        <div style={{ position: 'relative' }}>
          <button
            id="topbar-apps-btn"
            onClick={() => toggleAppsMenu()}
            title={t('topbar_apps')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30,
              background: appsMenuOpen ? 'var(--card-hover)' : 'var(--card)',
              border: `1px solid ${appsMenuOpen ? 'var(--border-strong)' : 'var(--border-soft)'}`,
              borderRadius: '50%', cursor: 'pointer',
              color: appsMenuOpen ? 'var(--fg)' : 'var(--fg-muted)',
              boxShadow: appsMenuOpen ? 'var(--shadow-xs)' : 'none',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = appsMenuOpen ? 'var(--card-hover)' : 'var(--card)';
              e.currentTarget.style.color = appsMenuOpen ? 'var(--fg)' : 'var(--fg-muted)';
            }}
          >
            <Grid3x3 size={14} />
          </button>

          {appsMenuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => closeAppsMenu()} />
              {/* İKİ SÜTUN: liste 15 uygulamaya çıkınca tek sütun ekranın altını
                  taşıyordu, alttaki uygulamalar hiç görünmüyordu. İki sütun +
                  yükseklik sınırı menüyü her ekran boyunda ekran içinde tutar. */}
              <div
                style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                  width: 460, maxWidth: 'calc(100vw - 24px)',
                  maxHeight: 'calc(100vh - 88px)', overflowY: 'auto',
                  background: 'var(--card)', border: '1px solid var(--border-soft)',
                  borderRadius: '6px', boxShadow: 'var(--shadow-lg)', zIndex: 70,
                  padding: 6,
                }}
              >
                <span style={{ display: 'block', fontSize: text['2xs'], fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 8px 6px' }}>
                  {t('topbar_apps')}
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 3 }}>
                  {APPS.map(({ key, name, description, allowed, iconBg, iconColor, Icon, workspaceKey }) => (
                    <button
                      key={key}
                      onClick={() => {
                        if (!allowed) return;
                        closeAppsMenu();
                        // Modüller kendi rotalarında açılır (bkz. workspace-routes.ts):
                        // adres çubuğunda görünür, link paylaşılabilir, yenileme hayatta kalır.
                        router.push(workspaceRoute(workspaceKey));
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        width: '100%', padding: '6px 8px', border: 'none', background: 'transparent',
                        borderRadius: 6, cursor: allowed ? 'pointer' : 'not-allowed',
                        textAlign: 'left', opacity: allowed ? 1 : 0.5,
                      }}
                      onMouseEnter={(e) => { if (allowed) e.currentTarget.style.background = 'var(--card-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, color: iconColor, flexShrink: 0 }}>
                        <Icon size={15} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: text.sm, fontWeight: 600, color: 'var(--fg)' }}>{name}</span>
                        <span style={{ fontSize: text['2xs'], color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</span>
                      </div>
                      {!allowed && <Lock size={11} style={{ color: 'var(--fg-muted)', opacity: 0.8, marginLeft: 'auto', flexShrink: 0 }} />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Trello Link */}
        {trelloBoardUrl && (
          <a
            href={trelloBoardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xl:flex items-center justify-center cursor-pointer transition-colors"
            style={{
              width: 30, height: 30,
              background: 'var(--card)', border: '1px solid var(--border-soft)',
              borderRadius: '50%', color: 'var(--fg-muted)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.color = '#0079BF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
            title="Trello"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M19.025 0H4.975A4.98 4.98 0 0 0 0 4.975v14.05A4.98 4.98 0 0 0 4.975 24h14.05A4.98 4.98 0 0 0 24 19.025V4.975A4.98 4.98 0 0 0 19.025 0zM10.13 17.5a1.5 1.5 0 0 1-1.5 1.5H5.87a1.5 1.5 0 0 1-1.5-1.5V5.5a1.5 1.5 0 0 1 1.5-1.5H8.63a1.5 1.5 0 0 1 1.5 1.5zm9.5-6.5a1.5 1.5 0 0 1-1.5 1.5h-2.76a1.5 1.5 0 0 1-1.5-1.5V5.5A1.5 1.5 0 0 1 15.37 4h2.76A1.5 1.5 0 0 1 19.63 5.5z"/>
            </svg>
          </a>
        )}

        {/* Slack Button & Menu */}
        <div ref={slackRef} className="hidden xl:block" style={{ position: 'relative' }}>
          <button
            onClick={() => setSlackMenuOpen((o) => !o)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30,
              background: 'var(--card)', border: '1px solid var(--border-soft)',
              borderRadius: '50%', cursor: 'pointer',
              color: slackMenuOpen ? '#E01E5A' : 'var(--fg-muted)',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.color = '#E01E5A'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = slackMenuOpen ? '#E01E5A' : 'var(--fg-muted)'; }}
            title="Slack"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.823 5.043a2.528 2.528 0 0 1-2.52-2.52A2.528 2.528 0 0 1 8.823 0a2.528 2.528 0 0 1 2.52 2.522v2.52h-2.52zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.522H3.78a2.528 2.528 0 0 1-2.522-2.522V8.824a2.528 2.528 0 0 1 2.522-2.52h5.043zm10.135 3.761a2.528 2.528 0 0 1 2.52-2.52 2.528 2.528 0 0 1 2.522 2.52 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.262 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043zm-3.76 10.135a2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52-2.522 2.528 2.528 0 0 1-2.522-2.522v-2.52h2.522zm0-1.262a2.528 2.528 0 0 1-2.52-2.52v-5.043a2.528 2.528 0 0 1 2.52-2.522h5.043a2.528 2.528 0 0 1 2.522 2.522v5.043a2.528 2.528 0 0 1-2.522 2.52h-5.043z"/>
            </svg>
          </button>

          {slackMenuOpen && (
            <div
              className="animate-fade-in"
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                width: 180, background: 'var(--card)', border: '1px solid var(--border-soft)',
                borderRadius: '8px', boxShadow: 'var(--shadow-md)', zIndex: 20, overflow: 'hidden', padding: 4,
              }}
            >
              {slackWorkspaceUrl && (
                <a
                  href={slackWorkspaceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setSlackMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px',
                    background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer',
                    textAlign: 'left', fontSize: text.sm, fontWeight: 600, color: 'var(--fg)', textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="#E01E5A" style={{ flexShrink: 0 }}>
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.823 5.043a2.528 2.528 0 0 1-2.52-2.52A2.528 2.528 0 0 1 8.823 0a2.528 2.528 0 0 1 2.52 2.522v2.52h-2.52zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.522H3.78a2.528 2.528 0 0 1-2.522-2.522V8.824a2.528 2.528 0 0 1 2.522-2.52h5.043zm10.135 3.761a2.528 2.528 0 0 1 2.52-2.52 2.528 2.528 0 0 1 2.522 2.52 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.262 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043zm-3.76 10.135a2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52-2.522 2.528 2.528 0 0 1-2.522-2.522v-2.52h2.522zm0-1.262a2.528 2.528 0 0 1-2.52-2.52v-5.043a2.528 2.528 0 0 1 2.52-2.522h5.043a2.528 2.528 0 0 1 2.522 2.522v5.043a2.528 2.528 0 0 1-2.522 2.52h-5.043z"/>
                  </svg>
                  <span>{lang === 'tr' ? 'Çalışma Alanı' : 'Workspace'}</span>
                </a>
              )}
              <button
                onClick={() => { setSlackMenuOpen(false); setSlackModalOpen(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px',
                  background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer',
                  textAlign: 'left', fontSize: text.sm, fontWeight: 600, color: 'var(--fg)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Hash size={13} style={{ color: '#E01E5A' }} />
                <span>{lang === 'tr' ? 'Bildirim Ayarları' : 'Settings'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Mail Automation Button */}
        <button
          onClick={() => setMailModalOpen(true)}
          className="hidden 2xl:flex items-center justify-center cursor-pointer transition-colors"
          style={{
            width: 30, height: 30,
            background: 'var(--card)', border: '1px solid var(--border-soft)',
            borderRadius: '50%',
            color: mailModalOpen ? '#0284c7' : 'var(--fg-muted)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.color = '#0284c7'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = mailModalOpen ? '#0284c7' : 'var(--fg-muted)'; }}
          title={lang === 'tr' ? 'Kişisel E-Posta & Rapor Otomasyonu' : 'Email Automation'}
        >
          <Mail size={13} />
        </button>

        {/* PWA Download Button */}
        <button
          onClick={async () => {
            if (pwaInstall.canPrompt) {
              const accepted = await pwaInstall.promptInstall();
              if (!accepted) setPwaModalOpen(true);
            } else {
              setPwaModalOpen(true);
            }
          }}
          className="hidden xl:flex items-center justify-center cursor-pointer transition-colors"
          style={{
            width: 30, height: 30,
            background: 'var(--card)', border: '1px solid var(--border-soft)',
            borderRadius: '50%', color: 'var(--fg-muted)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
          title="Uygulamayı İndir (PWA)"
        >
          <Download size={13} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30,
            background: 'var(--card)', border: '1px solid var(--border-soft)',
            borderRadius: '50%', cursor: 'pointer', color: 'var(--fg-muted)',
            transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
          title={isDark ? t('topbar_light_theme') : t('topbar_dark_theme')}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Language Toggle */}
        <button
          onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30,
            background: 'var(--card)', border: '1px solid var(--border-soft)',
            borderRadius: '50%', cursor: 'pointer', color: 'var(--fg)',
            fontSize: text.xs, fontWeight: 800,
            transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; }}
          title={lang === 'tr' ? 'Switch to English' : 'Türkçe\'ye geç'}
        >
          {lang === 'tr' ? 'TR' : 'EN'}
        </button>

        {/* Vertical Separator */}
        <div className="hidden xl:block" style={{ width: 1, height: 16, background: 'var(--border-soft)', margin: '0 2px' }} />
        </div>

        {/* Mobil Arama Butonu */}
        {isMobile && (
          <button
            type="button"
            onClick={() => useCommandPalette.getState().setOpen(true)}
            aria-label="Ara"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32,
              background: 'var(--card)', border: '1px solid var(--border-soft)',
              borderRadius: 6, cursor: 'pointer', color: 'var(--fg-muted)',
              flexShrink: 0,
            }}
            title="Arama yap (Ctrl+K)"
          >
            <Search size={15} />
          </button>
        )}

        {/* Hesap menüsü — SADECE mobil.
            Masaüstünde hesap bölümü kenar çubuğunun altına taşındı (bkz.
            SidebarAccountMenu). Mobilde kalıyor çünkü bu menü aynı zamanda
            uygulamalar / bildirimler / tema / dil satırlarını da taşıyor. */}
        {isMobile && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 32, padding: '0 4px 0 6px',
              background: 'transparent', border: 'none',
              borderRadius: '99px', cursor: 'pointer',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Avatar Circle */}
            {avatarUrl && (avatarUrl.startsWith('data:image') || avatarUrl.startsWith('http') || avatarUrl.startsWith('/')) ? (
              // next/image BU VAKAYI karsilamiyor: avatar ya data: URI ya da ONCEDEN
              // BILINMEYEN bir dis alan adi olabiliyor. next/image yapilandirilmamis
              // uzak alan adinda HATA FIRLATIR, yani avatarlar tamamen kirilirdi.
              // 26x26'lik bir gorsel icin optimizasyon kazanci da yok.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={initials}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  objectFit: 'cover', flexShrink: 0,
                  boxShadow: 'var(--shadow-xs)',
                }}
              />
            ) : avatarUrl ? (
              <div
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: avatarUrl,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: text.xs, fontWeight: 700, color: '#fff',
                  flexShrink: 0,
                }}
              >
                {initials[0] || 'E'}
              </div>
            ) : (
              <div
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#2563eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: text.xs, fontWeight: 700, color: '#fff',
                  flexShrink: 0,
                }}
              >
                {initials[0] || 'E'}
              </div>
            )}

            {!isMobile && user && (
              <span style={{ fontSize: text.sm, fontWeight: 600, color: 'var(--fg)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fullName || user.email.split('@')[0]}
              </span>
            )}
            <ChevronDown size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                onClick={() => setUserMenuOpen(false)}
              />
              <div
                className="animate-fade-in"
                style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                  width: isMobile ? 270 : 200,
                  maxHeight: isMobile ? 'calc(100vh - 140px)' : undefined,
                  overflowY: isMobile ? 'auto' : undefined,
                  background: 'var(--card)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 20,
                  overflow: isMobile ? 'auto' : 'hidden',
                  padding: '4px',
                }}
              >
                {/* User Info */}
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-soft)', marginBottom: 4 }}>
                  <p style={{ fontSize: text.md, fontWeight: 600, color: 'var(--fg)' }}>
                    {fullName || user?.email.split('@')[0]}
                  </p>
                  <p style={{ fontSize: text.xs, color: 'var(--fg-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.email ?? ''}
                  </p>
                  <span
                    style={{
                      display: 'inline-block', marginTop: 6,
                      padding: '2px 8px',
                      background: 'var(--accent-soft)', color: 'var(--accent)',
                      borderRadius: 99, fontSize: text['2xs'], fontWeight: 600,
                    }}
                  >
                    {user?.roles?.[0] || t('topbar_user_role')}
                  </span>
                </div>

                {/* Mobilde: Uygulamalar / Bildirimler / Tema / Dil buraya taşınıyor —
                    masaüstünde bunlar ayrı topbar butonları olarak zaten var (yukarıda). */}
                {isMobile && (
                  <>
                    <div style={{ padding: '2px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: text.xs, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 8px 2px' }}>
                        {t('topbar_apps')}
                      </span>
                      {APPS.map(({ key, name, allowed, iconBg, iconColor, Icon, workspaceKey }) => (
                        <button
                          key={key}
                          onClick={() => {
                            if (!allowed) return;
                            setUserMenuOpen(false);
                            router.push(workspaceRoute(workspaceKey));
                          }}
                          style={{
                            ...mobileMenuRowStyle,
                            opacity: allowed ? 1 : 0.5,
                            cursor: allowed ? 'pointer' : 'not-allowed',
                          }}
                          title={!allowed ? t('nav_locked_hint') : undefined}
                        >
                          <span style={{ width: 26, height: 26, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={14} color={iconColor} />
                          </span>
                          <span style={{ flex: 1 }}>{name}</span>
                          {!allowed && <Lock size={11} style={{ opacity: 0.6, marginLeft: 'auto' }} />}
                        </button>
                      ))}
                    </div>

                    <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 2px' }} />

                    {/* Aivar — mobilde de (FAB kaldırıldığı için) buradan açılır */}
                    <button
                      onClick={() => { setUserMenuOpen(false); togglePanel(); }}
                      style={mobileMenuRowStyle}
                    >
                      <span style={{ width: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 17C4 10 7 5 11 5C14 5 15 8 13.5 11C12 14 9 15 7.5 13.5C6.3 12.2 6.5 10 8 8.5C9.5 7 12.5 6.5 15 7.5C17.5 8.5 19 12 20 16" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span style={{ flex: 1, textAlign: 'left' }}>Aivar</span>
                    </button>

                    <button
                      onClick={() => { setUserMenuOpen(false); openNotificationPanel(); }}
                      style={mobileMenuRowStyle}
                    >
                      <Bell size={15} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, textAlign: 'left' }}>{t('topbar_notifications')}</span>
                      {unreadCount > 0 && (
                        <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, fontSize: text['2xs'], fontWeight: 700, padding: '1px 7px' }}>
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        useHelpModal.getState().setOpen(true);
                      }}
                      style={mobileMenuRowStyle}
                    >
                      <HelpCircle size={15} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, textAlign: 'left' }}>Yardım & Kısayollar</span>
                    </button>

                    {trelloBoardUrl && (
                      <a
                        href={trelloBoardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setUserMenuOpen(false)}
                        style={{ ...mobileMenuRowStyle, textDecoration: 'none' }}
                      >
                        <Grid3x3 size={15} style={{ flexShrink: 0, color: '#0079BF' }} />
                        <span style={{ flex: 1, textAlign: 'left' }}>Trello</span>
                      </a>
                    )}

                    {slackWorkspaceUrl && (
                      <a
                        href={slackWorkspaceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setUserMenuOpen(false)}
                        style={{ ...mobileMenuRowStyle, textDecoration: 'none' }}
                      >
                        <MessagesSquare size={15} style={{ flexShrink: 0, color: '#E01E5A' }} />
                        <span style={{ flex: 1, textAlign: 'left' }}>Slack Çalışma Alanı</span>
                      </a>
                    )}

                    <button
                      onClick={() => { setUserMenuOpen(false); setSlackModalOpen(true); }}
                      style={mobileMenuRowStyle}
                    >
                      <Hash size={15} style={{ flexShrink: 0, color: '#E01E5A' }} />
                      <span style={{ flex: 1, textAlign: 'left' }}>Slack Bildirim Ayarları</span>
                    </button>

                    <button
                      onClick={() => { setUserMenuOpen(false); setMailModalOpen(true); }}
                      style={mobileMenuRowStyle}
                    >
                      <Mail size={15} style={{ flexShrink: 0, color: '#0284c7' }} />
                      <span style={{ flex: 1, textAlign: 'left' }}>E-Posta Otomasyonu (SMTP)</span>
                    </button>

                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        if (pwaInstall.canPrompt) {
                          const accepted = await pwaInstall.promptInstall();
                          if (!accepted) setPwaModalOpen(true);
                        } else {
                          setPwaModalOpen(true);
                        }
                      }}
                      style={mobileMenuRowStyle}
                    >
                      <Download size={15} style={{ flexShrink: 0, color: 'var(--accent)' }} />
                      <span style={{ flex: 1, textAlign: 'left' }}>Uygulamayı İndir / Yükle (PWA)</span>
                    </button>

                    <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 2px' }} />

                    <button onClick={() => setTheme(isDark ? 'light' : 'dark')} style={mobileMenuRowStyle}>
                      {isDark ? <Sun size={15} style={{ flexShrink: 0 }} /> : <Moon size={15} style={{ flexShrink: 0 }} />}
                      <span style={{ flex: 1, textAlign: 'left' }}>{isDark ? t('topbar_light_theme') : t('topbar_dark_theme')}</span>
                    </button>

                    <button onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')} style={mobileMenuRowStyle}>
                      <Globe size={14} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, textAlign: 'left' }}>{lang === 'tr' ? t('topbar_switch_en') : t('topbar_switch_tr')}</span>
                    </button>

                    <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 2px' }} />
                  </>
                )}

                {/* Hesabım — self-servis şifre değişimi (kullanıcı talebi: profil menüsünden açılsın) */}
                <button
                  onClick={() => { setUserMenuOpen(false); setAccountModalOpen(true); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px',
                    background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', color: 'var(--fg)', fontSize: text.md, transition: 'background 0.12s', fontWeight: 500,
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  <UserCog size={15} />
                  {t('nav_system_account')}
                </button>

                <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 2px' }} />

                {/* Logout Action */}
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '10px 12px',
                    background: 'transparent', border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', color: 'var(--accent)', fontSize: text.md,
                    transition: 'background 0.12s',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  <LogOut size={15} />
                  {t('logout')}
                </button>
              </div>
            </>
          )}
        </div>
        )}
      </div>
    </header>

    {/* Bildirim yan paneli — masaüstü + mobil ortak, her yerden aynı bileşen açılır */}
    <TopbarOverlays
      notificationOpen={notificationOpen}
      accountModalOpen={accountModalOpen}
      closeAccountModal={() => setAccountModalOpen(false)}
      avatarUrl={avatarUrl}
      saveAvatar={handleSaveAvatar}
      slackModalOpen={slackModalOpen}
      closeSlackModal={() => setSlackModalOpen(false)}
      mailModalOpen={mailModalOpen}
      closeMailModal={() => setMailModalOpen(false)}
      pwaModalOpen={pwaModalOpen}
      closePwaModal={() => setPwaModalOpen(false)}
      pwaInstall={pwaInstall}
      scanOpen={scanOpen}
      closeScanner={() => setScanOpen(false)}
      handleScan={(sku) => { setScanOpen(false); setScannedSku(sku); }}
      scannedSku={scannedSku}
      closeProductDetail={() => setScannedSku(null)}
    />

    {/* Pano'daki "Uygulamalar" kartının açtığı büyük keşif paneli. Topbar her
        sayfada mount olduğu için burada duruyor ve aynı katalogtan besleniyor. */}
    <AppsDirectory />
    </>
  );
}
