'use client';

import Link from 'next/link';
import { IS_DEMO } from '../../lib/demo/config';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
// Menü ikonları artık nav-groups.ts'ten geliyor (tek kaynak) — burada yalnızca sol panelin
// KENDİ kabuğuna ait ikonlar kalır: aç/kapa okları, kilit, kullanıcı, ERP/pazaryeri bölümleri.
import {
  ChevronDown, Lock, UserCircle2, Plus, Store, X,
} from 'lucide-react';
import { useLayoutStore } from '../../stores/layout';
import { useI18n } from '../../lib/i18n';
import { NAV, isGroup } from '../../lib/nav-groups';
import { useModuleCatalog } from '../../hooks/useModuleCatalog';
import { useStoreSelector } from '../../stores/store-selector';
import { usePagePermissions } from '../../hooks/usePagePermissions';
import { Tooltip } from '../ui/Tooltip';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { integrationConnectionsApi } from '../../lib/api';
import type { IntegrationConnection } from '../../lib/api';
import { integrationConnectionPath } from '../../lib/integration-routing';
import {
  SentosIcon, BaseErpIcon, EbayIcon, AmazonIcon, ShopifyIcon,
  TrendyolIcon, HepsiburadaIcon, N11Icon, PazaramaIcon, CiceksepetiIcon
} from '../ui/BrandIcons';
import { NewIntegrationCatalogModal } from '../../features/system/NewIntegrationCatalogModal';
import { TopbarSearch } from './TopbarSearch';

const Customer360Modal = dynamic(() => import('./Customer360Modal').then((m) => m.Customer360Modal), { ssr: false });
import { SidebarAccountMenu } from './SidebarAccountMenu';
import { SidebarHelpIcon } from '../../features/tour/SidebarHelpIcon';
import { text } from '../../features/shared/design';

const SIDEBAR_STORAGE_KEY = 'sidebar_expanded_groups';

interface SubItem {
  title: string;
  href: string;
  pageKey: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

interface MenuGroup {
  key: string;
  title: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; className?: string }>;
  href?: string;
  pageKey?: string;
  children?: SubItem[];
}

function isSubActive(subHref: string, allChildren: SubItem[] | undefined, pathname: string): boolean {
  const cleanPath = pathname.split('?')[0];
  const cleanHref = subHref.split('?')[0];

  if (cleanPath === cleanHref) return true;

  if (cleanPath.startsWith(cleanHref + '/')) {
    const hasMoreSpecific = allChildren?.some(
      (c) => c.href !== subHref && cleanPath.startsWith(c.href.split('?')[0]) && c.href.length > subHref.length
    );
    return !hasMoreSpecific;
  }

  return false;
}

export function Sidebar({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { sidebarOpen: desktopSidebarOpen, setSidebarOpen } = useLayoutStore();
  const sidebarOpen = mobile || desktopSidebarOpen;
  const { t, lang } = useI18n();
  const selectAllStores = useStoreSelector((s) => s.selectAll);
  const { isAllowed } = usePagePermissions();
  const queryClient = useQueryClient();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [c360Open, setC360Open] = useState(false);
  const [addCatalogModalOpen, setAddCatalogModalOpen] = useState(false);
  const [catalogInitialCategory, setCatalogInitialCategory] = useState<'erp' | 'marketplace'>('erp');

  // Restore expanded groups from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTimeout(() => setExpandedGroups(new Set(parsed)), 0);
        }
      }
    } catch {
      /* noop */
    }
  }, []);

  const toggleGroup = (key: string) => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      const next = new Set([key]);
      setExpandedGroups(next);
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        /* noop */
      }
      return;
    }
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        /* noop */
      }
      return next;
    });
  };

  const isEn = lang === 'en';

  // SOL PANEL, SEKME ÇUBUKLARIYLA AYNI KAYNAKTAN TÜRER (nav-groups.ts).
  //
  // Önceden burada tr/en metinleri elle yazılıydı ve nav-groups.ts'teki çeviri
  // anahtarlarından bağımsız yaşıyordu: aynı sayfa solda "Kârlılık (PnL)", üstteki sekme
  // çubuğunda "P&L Tablosu" görünüyordu. Tek kaynağa bağlanınca ikisi ARTIK AYRIŞAMAZ —
  // yeni bir sayfa eklendiğinde de iki yere yazmak gerekmez.
  // KAPALI MODÜLÜN SAYFASI SOL PANELDE DE GİZLENİR.
  //
  // "fitment" (Uyumluluk) bir modül anahtarı ama sol panelde normal bir sayfa. Kapatıldığında
  // API'si 403 dönüyordu ama sayfa panelde DURMAYA devam ediyordu: kullanıcı tıklıyor, boş
  // ya da hatalı ekran görüyordu. Katalog artık her modülün UI rotasını taşıyor
  // (ModuleKind.NavPage), o yüzden gizleme tek yerden yapılabiliyor.
  const { all: moduleEntries } = useModuleCatalog();
  const disabledRoutes = new Set(
    moduleEntries.filter((m) => !m.enabled && m.uiRoute).map((m) => m.uiRoute as string),
  );
  const isRouteVisible = (href: string) => !disabledRoutes.has(href);

  const MENU_GROUPS: MenuGroup[] = NAV.map((entry) => {
    if (!isGroup(entry)) {
      return {
        key: entry.key,
        title: t(entry.key),
        icon: entry.Icon,
        href: entry.href,
        pageKey: entry.pageKey,
      };
    }

    return {
      key: entry.key,
      title: t(entry.key),
      icon: entry.Icon,
      children: entry.children
        .filter((child) => isRouteVisible(child.href))
        .map((child) => ({
          title: t(child.key),
          href: child.href,
          pageKey: child.pageKey,
          icon: child.Icon,
        })),
    };
  });

  // ERP kökleri ve doğrudan bağlanan pazaryerleri aynı bağlantı kataloğundan gelir.
  const { data: integrationConnections = [] } = useQuery<IntegrationConnection[]>({
    queryKey: ['integration-connections'],
    queryFn: () => integrationConnectionsApi.list(),
    staleTime: 60_000,
  });

  // 1. AKTİF ERP SİSTEMLERİ
  const activeErpSystems = useMemo(() => {
    const list: { name: string; icon: React.ComponentType<{ size?: number }>; href: string }[] = [];
    integrationConnections.forEach((connection) => {
      if (connection.kind === 0 && connection.isActive) {
        list.push({
          name: connection.displayName,
          icon: connection.providerKey === 'sentos' ? SentosIcon : BaseErpIcon,
          href: integrationConnectionPath(connection),
        });
      }
    });
    return list;
  }, [integrationConnections]);

  // Yalnızca doğrudan eklenen pazaryerleri; ERP'den keşfedilen kanallar burada yer almaz.
  const activeMarketplaces = useMemo(() => {
    const list: { name: string; icon: React.ComponentType<{ size?: number }>; href: string }[] = [];
    integrationConnections.forEach((connection) => {
      if (connection.kind === 1 && connection.isActive) {
        const lower = connection.providerKey;
        let icon: React.ComponentType<{ size?: number; className?: string }> = Store;
        if (lower.includes('ebay')) icon = EbayIcon;
        else if (lower.includes('amazon')) icon = AmazonIcon;
        else if (lower.includes('trendyol')) icon = TrendyolIcon;
        else if (lower.includes('hepsiburada')) icon = HepsiburadaIcon;
        else if (lower.includes('shopify')) icon = ShopifyIcon;
        else if (lower.includes('n11')) icon = N11Icon;
        else if (lower.includes('pazarama')) icon = PazaramaIcon;
        else if (lower.includes('ciceksepeti')) icon = CiceksepetiIcon;

        list.push({
          name: connection.displayName,
          icon,
          href: integrationConnectionPath(connection),
        });
      }
    });
    return list;
  }, [integrationConnections]);

  const w = mobile ? 'min(86vw, 320px)' : sidebarOpen ? '230px' : '64px';

  const openAddModal = (category: 'erp' | 'marketplace') => {
    setCatalogInitialCategory(category);
    setAddCatalogModalOpen(true);
  };

  return (
    <aside
      onClickCapture={(event) => {
        if (mobile && (event.target as HTMLElement).closest('a')) onClose?.();
      }}
      style={{
        width: w,
        minWidth: w,
        height: mobile ? '100dvh' : '100%',
        position: mobile ? 'fixed' : 'relative',
        inset: mobile ? '0 auto 0 0' : undefined,
        zIndex: mobile ? 70 : 40,
        boxShadow: mobile ? 'var(--shadow-lg)' : 'none',
        transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: w,
          height: '100%',
          background: 'var(--sidebar)',
          borderRight: '1px solid var(--border-soft)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Brand Logo Header — Base ERP Style */}
        <div
          style={{
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            padding: sidebarOpen ? '0 18px' : '0',
            justifyContent: sidebarOpen ? 'space-between' : 'center',
            flexShrink: 0,
            borderBottom: '1px solid var(--border-soft)',
          }}
        >
          <Link
            href="/dashboard"
            onClick={() => selectAllStores()}
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
            title="storeb."
          >
            {IS_DEMO ? (
              <span className="whitespace-nowrap text-base font-extrabold tracking-[0.15em] text-[var(--fg)]">{sidebarOpen ? 'ERP - DEMO' : 'ERP'}</span>
            ) : (
              <Image
                src="/storeb-siyah-logo.png"
                alt="StoreB"
                width={sidebarOpen ? 128 : 30}
                height={26}
                style={{ width: sidebarOpen ? 128 : 30, height: 'auto', maxHeight: 26, objectFit: 'contain' }}
                priority
              />
            )}
          </Link>
          {mobile && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Menüyü kapat"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--card)] text-[var(--fg-muted)]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {mobile && (
          <div className="border-b border-[var(--border-soft)] px-2 py-3">
            <TopbarSearch isMobile onNavigate={onClose} />
          </div>
        )}

        {/* Navigation List */}
        <nav
          style={{
            flex: 1,
            padding: sidebarOpen ? '12px 10px' : '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {MENU_GROUPS
            // Tüm alt kalemleri gizlenmiş bir grup, tıklayınca boş açılan bir başlık olurdu.
            .filter((group) => group.href !== undefined || (group.children?.length ?? 0) > 0)
            .map((group) => {
            const groupTitle = group.title;
            if (group.href) {
              const active = pathname === group.href;
              return (
                <Tooltip key={group.key} label={groupTitle} disabled={sidebarOpen}>
                  <Link
                    href={group.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      height: 36,
                      padding: sidebarOpen ? '0 12px' : '0',
                      justifyContent: sidebarOpen ? 'flex-start' : 'center',
                      borderRadius: 6,
                      textDecoration: 'none',
                      fontSize: text.md,
                      fontWeight: active ? 600 : 500,
                      color: active ? 'var(--fg)' : 'var(--sidebar-fg-muted)',
                      background: active ? 'var(--card-hover)' : 'transparent',
                      border: active ? '1px solid var(--border-soft)' : '1px solid transparent',
                      boxShadow: active ? 'var(--shadow-xs)' : 'none',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--card-hover)'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <group.icon size={16} strokeWidth={active ? 2.2 : 1.8} style={{ color: 'inherit', flexShrink: 0 }} />
                    {sidebarOpen && <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>{groupTitle}</span>}
                    {sidebarOpen && <SidebarHelpIcon href={group.href} />}
                  </Link>
                </Tooltip>
              );
            }

            const isExpanded = expandedGroups.has(group.key);
            const hasActiveChild = group.children?.some((c) => isSubActive(c.href, group.children, pathname));

            return (
              <div key={group.key} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Tooltip label={groupTitle} disabled={sidebarOpen}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      height: 36,
                      width: '100%',
                      padding: sidebarOpen ? '0 12px' : '0',
                      justifyContent: sidebarOpen ? 'flex-start' : 'center',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: text.md,
                      fontWeight: hasActiveChild ? 600 : 500,
                      color: hasActiveChild ? 'var(--fg)' : 'var(--sidebar-fg-muted)',
                      background: 'transparent',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <group.icon size={16} strokeWidth={hasActiveChild ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                    {sidebarOpen && (
                      <>
                        <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>{groupTitle}</span>
                        <ChevronDown
                          size={12}
                          style={{
                            transition: 'transform 0.18s',
                            transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                            opacity: 0.5,
                            flexShrink: 0,
                          }}
                        />
                      </>
                    )}
                  </button>
                </Tooltip>

                {/* Submenu Items */}
                {isExpanded && sidebarOpen && group.children && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 26, marginBottom: 4 }}>
                    {group.children.map((sub) => {
                      const subTitle = sub.title;
                      const active = isSubActive(sub.href, group.children, pathname);
                      const locked = !isAllowed(sub.pageKey);
                      return (
                        <Link
                          key={sub.href}
                          href={locked ? pathname : sub.href}
                          onClick={(e) => { if (locked) e.preventDefault(); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            height: 30,
                            padding: '0 8px',
                            borderRadius: 5,
                            textDecoration: 'none',
                            fontSize: text.sm,
                            fontWeight: active ? 600 : 500,
                            color: active ? 'var(--fg)' : locked ? 'var(--fg-subtle)' : 'var(--sidebar-fg-muted)',
                            background: active ? 'var(--card-hover)' : 'transparent',
                            border: active ? '1px solid var(--border-soft)' : '1px solid transparent',
                            boxShadow: active ? 'var(--shadow-xs)' : 'none',
                            transition: 'all 0.12s',
                          }}
                          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--card-hover)'; }}
                          onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                            {subTitle}
                          </span>
                          <SidebarHelpIcon href={sub.href} />
                          {locked && <Lock size={10} style={{ marginLeft: 4, opacity: 0.5 }} />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* 1. AKTİF ERP SİSTEMLERİ                                      */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {sidebarOpen ? (
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 6px' }}>
                <Link href="/erp/integrations" style={{ fontSize: text.xs, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--fg-muted)', textTransform: 'uppercase', textDecoration: 'none' }}>
                  {isEn ? 'ERP Systems' : 'ERP Sistemleri'}
                </Link>
                <button
                  type="button"
                  onClick={() => openAddModal('erp')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 18, height: 18, borderRadius: '50%',
                    border: '1px solid var(--border-soft)', background: 'var(--card)',
                    color: 'var(--fg-muted)', cursor: 'pointer',
                  }}
                  title={isEn ? 'Add New ERP Connection' : 'Yeni ERP Bağlantısı Ekle'}
                >
                  <Plus size={11} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {activeErpSystems.map((erp) => (
                  <Link
                    key={erp.name}
                    href={erp.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      height: 28,
                      padding: '0 12px',
                      borderRadius: 4,
                      textDecoration: 'none',
                      fontSize: text.sm,
                      fontWeight: 500,
                      color: 'var(--fg)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <erp.icon size={14} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{erp.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {activeErpSystems.map((erp) => (
                <Tooltip key={erp.name} label={`ERP: ${erp.name}`}>
                  <Link
                    href={erp.href}
                    style={{
                      width: 26, height: 26, borderRadius: 4,
                      color: 'var(--fg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--sidebar-fg-muted)'; }}
                  >
                    <erp.icon size={15} />
                  </Link>
                </Tooltip>
              ))}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* 2. AKTİF PAZARYERLERİ                                      */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {sidebarOpen ? (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 6px' }}>
                <Link href="/marketplace/integrations" style={{ fontSize: text.xs, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--fg-muted)', textTransform: 'uppercase', textDecoration: 'none' }}>
                  {isEn ? 'Marketplaces' : 'Pazaryerleri'}
                </Link>
                <button
                  type="button"
                  onClick={() => openAddModal('marketplace')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 18, height: 18, borderRadius: 4,
                    border: '1px solid var(--border-soft)', background: 'var(--card)',
                    color: 'var(--fg-muted)', cursor: 'pointer',
                  }}
                  title={isEn ? 'Add New Marketplace' : 'Yeni Pazaryeri Ekle'}
                >
                  <Plus size={11} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {activeMarketplaces.map((mp) => (
                  <Link
                    key={mp.name}
                    href={mp.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      height: 28,
                      padding: '0 12px',
                      borderRadius: 4,
                      textDecoration: 'none',
                      fontSize: text.sm,
                      fontWeight: 500,
                      color: 'var(--fg)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <mp.icon size={14} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mp.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {activeMarketplaces.slice(0, 4).map((mp) => (
                <Tooltip key={mp.name} label={`Marketplace: ${mp.name}`}>
                  <Link
                    href={mp.href}
                    style={{
                      width: 26, height: 26, borderRadius: 4,
                      color: 'var(--fg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--sidebar-fg-muted)'; }}
                  >
                    <mp.icon size={15} />
                  </Link>
                </Tooltip>
              ))}
            </div>
          )}
        </nav>

        {/* Footer Workspace Area */}
        <div style={{ padding: sidebarOpen ? '8px 10px 10px' : '8px', borderTop: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Tooltip label={isEn ? 'Customer 360' : 'Müşteri 360'} disabled={sidebarOpen}>
            <button
              type="button"
              onClick={() => setC360Open(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 34,
                width: '100%',
                padding: sidebarOpen ? '0 12px' : '0',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                fontSize: text.sm,
                fontWeight: 500,
                color: 'var(--sidebar-fg-muted)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <UserCircle2 size={15} style={{ flexShrink: 0 }} />
              {sidebarOpen && <span>{isEn ? 'Customer 360' : 'Müşteri 360'}</span>}
            </button>
          </Tooltip>

          <SidebarAccountMenu expanded={sidebarOpen} />
        </div>
      </div>

      {c360Open && <Customer360Modal isOpen onClose={() => setC360Open(false)} />}
      
      {addCatalogModalOpen && (
        <NewIntegrationCatalogModal
          isOpen={addCatalogModalOpen}
          initialCategory={catalogInitialCategory}
          onClose={() => setAddCatalogModalOpen(false)}
          onIntegrationAdded={() => queryClient.invalidateQueries({ queryKey: ['integration-connections'] })}
        />
      )}
    </aside>
  );
}
