'use client';

import { useState } from 'react';
import { ModuleWorkspace } from '../shared/ModuleWorkspace';
import { parseWorkspacePath } from '../../lib/workspace-routes';
import { useAuthStore } from '../../stores/auth';
import { useSyntheticAccess } from '../../hooks/monitoring/useSyntheticChecks';
import { visibleMonitoringTabs, type MonitoringTabKey } from './monitoring-tabs';
import { isSuperAdmin } from './insights';
import { OverviewTab } from './tabs/OverviewTab';
import { InsightsTab } from './tabs/InsightsTab';
import { SessionsTab } from './tabs/SessionsTab';
import { ActivityTab } from './tabs/ActivityTab';
import { PageUsageTab } from './tabs/PageUsageTab';
import { HealthChecksTab } from './tabs/HealthChecksTab';
import { PagesTab } from './tabs/PagesTab';
import { SyntheticChecksTab } from './tabs/SyntheticChecksTab';
import { RoutesTab } from './tabs/RoutesTab';
import { ExceptionsTab } from './tabs/ExceptionsTab';
import { OperationsTab } from './tabs/OperationsTab';
import { SecurityTab } from './tabs/SecurityTab';
import { BackgroundJobsTab } from './tabs/BackgroundJobsTab';

interface Props {
  onClose: () => void;
}

// Sol panel monitoring-tabs.ts'ten gelir; burası yalnız aktif sekmenin içeriğini seçer.
// Eski "Geçmiş" sekmesi (Denetim + İş Olayları + Değişiklik) kaldırıldı: iş işlemleri
// Aktivite Akışı'na, güvenlik olayları Güvenlik Kaydı'na taşındı; ham EF_* satırları
// artık ekranda gösterilmiyor (bkz. docs/PLAN-MONITORING-V2.md).
export function MonitoringWorkspace({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<MonitoringTabKey>('overview');
  // Öneriler yalnız SuperAdmin'e: sekme listesi de, içerik de rolle süzülür (backend ayrıca 403).
  const superAdmin = useAuthStore((state) => isSuperAdmin(state.user?.roles));
  // Sentetik Kontroller yalnız platform işletmecisine — kararı sunucu verir.
  const canViewSynthetic = useSyntheticAccess();
  const tabs = visibleMonitoringTabs({ isSuperAdmin: superAdmin, canViewSynthetic });

  // Kart/satır tıklamasıyla sekme değişimi. Kenar çubuğu tıklamasındaki gibi adres de
  // güncellenir (history.replaceState — bkz. ModuleWorkspace), yoksa yenileyince eski
  // sekmeye dönülürdü.
  const navigate = (tab: MonitoringTabKey) => {
    const route = parseWorkspacePath(window.location.pathname);
    if (route) window.history.replaceState(null, '', `${route.base}/${tab}${window.location.search}`);
    setActiveTab(tab);
  };

  return (
    <ModuleWorkspace
      title="Sistem İzleme"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(key) => setActiveTab(key as MonitoringTabKey)}
      onClose={onClose}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-12 pt-3 text-[var(--fg)] md:px-6 md:py-5">
        {activeTab === 'overview' && (
          <OverviewTab onNavigate={navigate} showInsights={superAdmin} showSynthetic={canViewSynthetic} />
        )}
        {activeTab === 'insights' && superAdmin && <InsightsTab onNavigate={navigate} />}
        {activeTab === 'sessions' && <SessionsTab />}
        {activeTab === 'activity' && <ActivityTab />}
        {activeTab === 'page-usage' && <PageUsageTab />}
        {activeTab === 'health-checks' && <HealthChecksTab />}
        {activeTab === 'pages' && (
          <PagesTab onShowErrors={() => navigate('exceptions')} showBotStatus={canViewSynthetic} />
        )}
        {activeTab === 'synthetic-checks' && canViewSynthetic && <SyntheticChecksTab />}
        {activeTab === 'slow-requests' && <RoutesTab />}
        {activeTab === 'exceptions' && <ExceptionsTab />}
        {activeTab === 'operations' && <OperationsTab />}
        {activeTab === 'jobs' && <BackgroundJobsTab view="jobs" />}
        {activeTab === 'jobs-runtime' && <BackgroundJobsTab view="runtime" />}
        {activeTab === 'security' && <SecurityTab />}
      </div>
    </ModuleWorkspace>
  );
}
