'use client';

import { useState } from 'react';
import { LayoutGrid, Inbox, Globe, FileText } from 'lucide-react';
import { ModuleWorkspace, type WorkspaceTab } from '../shared/ModuleWorkspace';
import { DashboardTab } from './DashboardTab';
import { InboxTab } from './InboxTab';
import { SitesTab } from './SitesTab';
import { SiteDetailPanel } from './SiteDetailPanel';
import { BlogTab } from './BlogTab';

interface Props {
  onClose: () => void;
}

const TABS = [
  { key: 'dashboard', label: 'Genel Bakış', Icon: LayoutGrid },
  { key: 'inbox',     label: 'Gelen Kutusu', Icon: Inbox },
  { key: 'blog',      label: 'Ortak Blog', Icon: FileText },
  { key: 'sites',     label: 'Siteler', Icon: Globe },
] as const satisfies readonly WorkspaceTab[];

type TabKey = (typeof TABS)[number]['key'];

export function SiteHubWorkspace({ onClose }: Props) {
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [detailSiteId, setDetailSiteId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const openSite = (siteId: number) => {
    setDetailSiteId(siteId);
    setTab('sites');
  };

  const showingDetail = tab === 'sites' && detailSiteId !== null;
  const selfScrolling = tab === 'inbox' || showingDetail;

  return (
    <>
      <ModuleWorkspace
        title="SiteHub"
        tabs={TABS}
        activeTab={tab}
        onTabChange={(k) => { setDetailSiteId(null); setTab(k as TabKey); }}
        onClose={onClose}
        scroll={!selfScrolling}
      >
        {tab === 'dashboard' && <DashboardTab onOpenSite={openSite} />}
        {tab === 'inbox' && <InboxTab />}
        {tab === 'blog' && <BlogTab />}
        {tab === 'sites' && (
          showingDetail ? (
            <SiteDetailPanel
              siteId={detailSiteId}
              onBack={() => setDetailSiteId(null)}
              onChanged={() => setRefreshKey((k) => k + 1)}
            />
          ) : (
            <SitesTab key={refreshKey} onOpenSite={openSite} />
          )
        )}
      </ModuleWorkspace>
    </>
  );
}
