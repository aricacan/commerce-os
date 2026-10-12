'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { LayoutGrid, Users, BarChart3, Shield, HelpCircle } from 'lucide-react';
import { ModuleWorkspace, type WorkspaceTab } from '../shared/ModuleWorkspace';
import { useAuthStore } from '../../stores/auth';
import { useI18n } from '../../lib/i18n';
import { OverviewTab } from './OverviewTab';
import { ClientsTab } from './ClientsTab';
import { ActivityTab } from './ActivityTab';

// Yardım dokümanı ancak açıldığında yüklensin — AdsHub'daki AYNI desen.
const PartnerHubHelpOverlay = dynamic(
  () => import('./PartnerHubHelpOverlay').then((m) => m.PartnerHubHelpOverlay),
  { ssr: false },
);

// PartnerHub — Uygulamalar (Topbar) launcher'ına taşındı. Önceden Ayarlar >
// Sistem altında tek sayfalık bir alt-sayfaydı (bkz. eski
// features/system/PartnerHubWorkspace.tsx + app/(app)/system/partner-integrations,
// ikisi de silindi) — AdsHub/Omnichannel/SiteHub/Hangfire/Monitoring ile AYNI
// tam-ekran ModuleWorkspace kabuğuna geçirildi ki iç ekip diğer modüllerle
// tutarlı bir yerden (Uygulamalar menüsü) erişsin.
interface Props {
  onClose: () => void;
}

const TABS = [
  { key: 'overview', label: 'Genel Bakış', Icon: LayoutGrid },
  { key: 'clients', label: "Client'lar", Icon: Users },
  { key: 'activity', label: 'Aktivite', Icon: BarChart3 },
] as const satisfies readonly WorkspaceTab[];

type TabKey = (typeof TABS)[number]['key'];

export function PartnerHubWorkspace({ onClose }: Props) {
  const { lang } = useI18n();
  const currentUser = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<TabKey>('overview');
  const [helpOpen, setHelpOpen] = useState(false);

  // Backend gate'iyle AYNI: PartnerHubClientsController [Authorize(Roles=
  // "SuperAdmin,Admin")] — Topbar'daki isModuleAllowed('partnerhub') ikonu
  // üye-bazlı erişime göre gösterip/gizleyebilir (Hangfire/Monitoring ile
  // AYNI desen), ama gerçek yetki burada, rol üzerinden ikinci kez kontrol
  // ediliyor — API zaten 403 döneceği için UI de aynı sınırı baştan gösterir.
  const isSuperAdmin = Boolean(currentUser?.roles?.some((r) => r.toLowerCase() === 'superadmin'));
  const isAdmin = currentUser?.roles?.some((r) => r.toLowerCase() === 'admin');
  const canManage = Boolean(isSuperAdmin || isAdmin);
  // Aktivite sekmesi TÜM kiracıların partner çağrılarını gösterir — backend yalnızca
  // SuperAdmin'e açıyor ([Authorize(Roles = "SuperAdmin")]), sekme de yalnızca ona görünür.
  const visibleTabs = isSuperAdmin ? TABS : TABS.filter((t) => t.key !== 'activity');

  return (
    <>
      <ModuleWorkspace
        title="PartnerHub"
        tabs={visibleTabs}
        activeTab={tab}
        onTabChange={(k) => setTab(k as TabKey)}
        onClose={onClose}
        // Modülün amacı + kullanım rehberi sekme değil, sol panelin dibindeki
        // yardım düğmesi — AdsHub ile AYNI yer, AYNI davranış.
        sidebarFooter={(sidebarOpen) => (
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-xs font-semibold text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
            onClick={() => setHelpOpen(true)}
            title="Amaç & Yardım — PartnerHub ne işe yarar, nasıl kullanılır"
          >
            <HelpCircle size={15} />
            {sidebarOpen && <span>Amaç &amp; Yardım</span>}
          </button>
        )}
      >
        {!canManage ? (
          <div className="flex h-full flex-1 items-center justify-center p-6 text-center">
            <div className="max-w-md rounded-[4px] border border-border-soft bg-card p-8 shadow-xs">
              <Shield className="mx-auto mb-3 h-8 w-8 text-fg-subtle" />
              <h2 className="text-sm font-bold text-fg">
                {lang === 'tr' ? 'Erişim Kısıtlı' : 'Access Restricted'}
              </h2>
              <p className="mt-1 text-xs text-fg-muted">
                {lang === 'tr'
                  ? 'Bu modülü yalnızca yöneticiler görüntüleyebilir.'
                  : 'Only administrators have permission to view this module.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            {tab === 'overview' && (
              <OverviewTab onOpenHelp={() => setHelpOpen(true)} canViewActivity={isSuperAdmin} />
            )}
            {tab === 'clients' && <ClientsTab />}
            {tab === 'activity' && isSuperAdmin && <ActivityTab />}
          </div>
        )}
      </ModuleWorkspace>

      {helpOpen && <PartnerHubHelpOverlay onClose={() => setHelpOpen(false)} />}
    </>
  );
}
