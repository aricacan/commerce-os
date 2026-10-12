'use client';

import { useState } from 'react';
import {
  LayoutGrid, Building2, Mail, Radar as RadarIcon,
  MessagesSquare, FileText, FlaskConical, ListFilter, Activity,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { RADAR_ROLES } from '../../lib/radar/roles';
import { ModuleWorkspace, type WorkspaceTab } from '../shared/ModuleWorkspace';
import { ADMIN_ROLES } from './shared';
import { OverviewTab } from './tabs/OverviewTab';
import { ScrapeRunsTab } from './tabs/ScrapeRunsTab';
import { CompaniesTab } from './tabs/CompaniesTab';
import { MessagesTab } from './tabs/MessagesTab';
import { TemplatesTab } from './tabs/TemplatesTab';
import { TestSendTab } from './tabs/TestSendTab';
import { SettingsTab } from './tabs/SettingsTab';
import { EmailAccountsTab } from './tabs/EmailAccountsTab';

const TABS = [
  { key: 'overview', label: 'Genel Bakış', Icon: LayoutGrid, adminOnly: false },
  { key: 'scrape-runs', label: 'Veri Çekme Takibi', Icon: Activity, adminOnly: false },
  { key: 'companies', label: 'Şirketler', Icon: Building2, adminOnly: false },
  { key: 'messages', label: 'Mesajlar', Icon: MessagesSquare, adminOnly: false },
  { key: 'templates', label: 'Şablonlar', Icon: FileText, adminOnly: true },
  { key: 'email-accounts', label: 'E-posta Hesapları', Icon: Mail, adminOnly: false },
  { key: 'test-send', label: 'Test', Icon: FlaskConical, adminOnly: true },
  { key: 'settings', label: 'SIC Ayarları', Icon: ListFilter, adminOnly: true },
] as const satisfies readonly (WorkspaceTab & { adminOnly: boolean })[];

type TabKey = (typeof TABS)[number]['key'];

interface Props {
  onClose: () => void;
}

export function RadarWorkspace({ onClose }: Props) {
  const { user } = useAuthStore();
  const hasAccess = RADAR_ROLES.some((r) => user?.roles?.includes(r));
  const isAdmin = ADMIN_ROLES.some((r) => user?.roles?.includes(r));
  const [tab, setTab] = useState<TabKey>('overview');
  const [pendingMessageCompanyId, setPendingMessageCompanyId] = useState<number | null>(null);

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  function openMessagesFor(companyId: number) {
    setPendingMessageCompanyId(companyId);
    setTab('messages');
  }

  return (
    <>
      <ModuleWorkspace
        title="B2B Outreach"
        tabs={hasAccess ? visibleTabs : []}
        activeTab={tab}
        onTabChange={(k) => setTab(k as TabKey)}
        onClose={onClose}
        scroll={tab === 'overview' || tab === 'settings'}
      >
        {!hasAccess ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-[var(--fg-muted)]">
            <RadarIcon size={32} className="mb-3 text-[var(--fg-muted)]" />
            <div className="font-bold text-sm text-[var(--fg)] mb-1">Erişim Yetkiniz Yok</div>
            <p className="max-w-xs">
              Bu bölüme erişmek için Radar yetkisine sahip olmanız gerekmektedir.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 w-full">
            {tab === 'overview' && <OverviewTab onOpenMessages={openMessagesFor} />}
            {tab === 'scrape-runs' && <ScrapeRunsTab />}
            {tab === 'companies' && <CompaniesTab />}
            {tab === 'messages' && (
              <MessagesTab
                initialCompanyId={pendingMessageCompanyId}
                onConsumeInitialCompanyId={() => setPendingMessageCompanyId(null)}
              />
            )}
            {tab === 'templates' && isAdmin && <TemplatesTab />}
            {tab === 'test-send' && isAdmin && <TestSendTab />}
            {tab === 'settings' && isAdmin && <SettingsTab />}
            {tab === 'email-accounts' && <EmailAccountsTab />}
          </div>
        )}
      </ModuleWorkspace>
    </>
  );
}
