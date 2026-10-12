'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { BookMarked, FileBarChart, FileUp, Store, Target, Zap } from 'lucide-react';
import { ModuleWorkspace, type WorkspaceTab } from '../shared/ModuleWorkspace';
import { EmptyState } from '../../components/ui/EmptyState';
import { usePagePermissions } from '../../hooks/usePagePermissions';
import { useModuleCatalog } from '../../hooks/useModuleCatalog';

// Trendyol Hub — kampanya dosyaları, komisyon tarifesi, DSS analizi, fatura yükleme ve
// pazaryeri kârlılığı tek çalışma alanında. Backend'de iş kapısı olan bir modül YOK: modül
// kaydı ("trendyol") yalnız uygulama menüsü ve kiracı bazlı aç/kapa içindir; her sekme
// eskisi gibi kendi sayfa yetkisiyle (pageKey) görünür (bkz. TAB_GATED_WORKSPACES).
const TRENDYOL_MODULE_KEY = 'trendyol';

const CAMPAIGNS_SECTION = { key: 'campaign-group', label: 'Kampanyalar', Icon: Target };

const TABS = [
  { key: 'campaigns', label: 'Kampanya Dosyaları', Icon: Target, pageKey: 'campaigns', section: CAMPAIGNS_SECTION },
  { key: 'tariff', label: 'Komisyon Tarifesi', Icon: BookMarked, pageKey: 'campaigns', section: CAMPAIGNS_SECTION },
  { key: 'best-actions', label: 'DSS Analizi', Icon: Zap, pageKey: 'campaigns', section: CAMPAIGNS_SECTION },
  { key: 'uploads', label: 'Fatura Yükleme', Icon: FileUp, pageKey: 'invoicing-trendyol-upload' },
  { key: 'reports', label: 'Pazaryeri Kârlılığı', Icon: FileBarChart, pageKey: 'finance' },
] as const satisfies readonly (WorkspaceTab & { pageKey: string })[];

type TabKey = (typeof TABS)[number]['key'];

const VIEWS: Record<TabKey, React.ComponentType> = {
  campaigns: dynamic(() => import('./CampaignUploadsView').then((m) => m.CampaignUploadsView), { ssr: false }),
  tariff: dynamic(() => import('./CampaignTariffView').then((m) => m.CampaignTariffView), { ssr: false }),
  'best-actions': dynamic(() => import('./CampaignBestActionsView').then((m) => m.CampaignBestActionsView), { ssr: false }),
  uploads: dynamic(
    () => import('../../components/invoicing/TrendyolInvoiceUploadPageView').then((m) => m.TrendyolInvoiceUploadPageView),
    { ssr: false }),
  reports: dynamic(
    () => import('../../components/finance/MarketplaceProfitPageView').then((m) => m.MarketplaceProfitPageView),
    { ssr: false }),
};

export function TrendyolWorkspace({ onClose }: { onClose: () => void }) {
  const { isAllowed } = usePagePermissions();
  const catalog = useModuleCatalog();

  const hubEnabled = catalog.isEnabled(TRENDYOL_MODULE_KEY);
  const tabs = hubEnabled ? TABS.filter((tab) => isAllowed(tab.pageKey)) : [];

  const [tab, setTab] = useState<TabKey>('campaigns');
  const activeKey = tabs.some((candidate) => candidate.key === tab) ? tab : tabs[0]?.key;
  const ActiveView = activeKey ? VIEWS[activeKey] : undefined;

  return (
    <ModuleWorkspace
      title="Trendyol Hub"
      tabs={tabs}
      activeTab={activeKey ?? ''}
      onTabChange={(key) => setTab(key as TabKey)}
      onClose={onClose}
      scroll={false}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        {ActiveView ? (
          <ActiveView />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <EmptyState
              icon={Store}
              title={hubEnabled ? 'Görüntüleyebileceğiniz Trendyol ekranı yok' : 'Trendyol Hub bu şirkette kapalı'}
              description={hubEnabled
                ? 'Bu çalışma alanındaki sayfalar için hesabınıza yetki tanımlanmamış. Sistem yöneticinizle görüşün.'
                : 'Modül Sistem › Yetkiler › Modüller ekranından açılabilir.'}
            />
          </div>
        )}
      </div>
    </ModuleWorkspace>
  );
}
