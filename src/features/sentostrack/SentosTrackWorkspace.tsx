'use client';

import { useState } from 'react';
import { LayoutDashboard, AlertTriangle, ServerCog, PackageCheck, Settings } from 'lucide-react';
import { ModuleWorkspace, type WorkspaceTab } from '../shared/ModuleWorkspace';
import { OverviewTab } from './OverviewTab';
import { WarningsTab } from './WarningsTab';
import { SentosStockTab } from './SentosStockTab';
import { PotentialStockTab } from './PotentialStockTab';
import { SettingsTab } from './SettingsTab';

interface Props {
  onClose: () => void;
}

const TABS: readonly WorkspaceTab[] = [
  { key: 'overview', label: 'Genel Bakış', Icon: LayoutDashboard },
  { key: 'warnings', label: 'Uyarılar', Icon: AlertTriangle },
  { key: 'sentos', label: 'Sentos Stok', Icon: ServerCog },
  { key: 'potential', label: 'Potansiyel Stok', Icon: PackageCheck },
  { key: 'settings', label: 'Ayarlar', Icon: Settings },
];

export function SentosTrackWorkspace({ onClose }: Props) {
  const [tab, setTab] = useState('overview');

  return (
    <>
      <ModuleWorkspace
        title="Sentos Hub"
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
        onClose={onClose}
        scroll={false}
      >
        <div className="flex-1 flex flex-col min-h-0 w-full">
          {tab === 'overview' && <OverviewTab />}
          {tab === 'warnings' && <WarningsTab />}
          {tab === 'sentos' && <SentosStockTab />}
          {tab === 'potential' && <PotentialStockTab />}
          {tab === 'settings' && <SettingsTab />}
        </div>
      </ModuleWorkspace>
    </>
  );
}
