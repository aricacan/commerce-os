'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertTriangle, Car, FileSpreadsheet, LayoutDashboard, LayoutGrid, PackageSearch, Settings, Ship,
  Warehouse,
} from 'lucide-react';
import { ModuleWorkspace, type WorkspaceTab } from '../shared/ModuleWorkspace';
import { EmptyState } from '../../components/ui/EmptyState';
import { useModuleAccess } from '../../hooks/useModuleAccess';
import { useModuleCatalog } from '../../hooks/useModuleCatalog';
import { usePagePermissions } from '../../hooks/usePagePermissions';
import { useBaseTrackSettings } from '../../hooks/basetrack/useBaseTrack';
import { OverviewTab } from '../basetrack/OverviewTab';
import { StockWarningsTab } from '../basetrack/StockWarningsTab';
import { PipelineTab } from '../basetrack/PipelineTab';
import { DepotTab } from '../basetrack/DepotTab';
import { ReportsTab } from '../basetrack/ReportsTab';
import { SettingsTab } from '../basetrack/SettingsTab';

// Base Hub — BaseLinker / StoreB UK ile ilgili HER ŞEY tek çalışma alanında: sevkiyat ve stok
// takibi (eski BaseTrack modülü) + Base katalog ekranları (eski sol panel "Base" grubu).
//
// Erişim SEKME bazındadır: sevkiyat/stok sekmeleri "basetrack" modül yetkisini, katalog
// sekmeleri eskisi gibi "products" sayfa yetkisini ister. Böylece kataloğu kullanan ama
// BaseTrack yetkisi olmayan kimse erişimini kaybetmez (bkz. TAB_GATED_WORKSPACES).
const BaseCatalogWorkspace = dynamic(
  () => import('../base-catalog/BaseCatalogWorkspace').then((m) => m.BaseCatalogWorkspace), { ssr: false });
const BaseCoverageWorkspace = dynamic(
  () => import('../base-catalog/BaseCoverageWorkspace').then((m) => m.BaseCoverageWorkspace), { ssr: false });
const BaseProductTrackingTab = dynamic(
  () => import('../../components/products/BaseProductTrackingTab').then((m) => m.BaseProductTrackingTab), { ssr: false });

const BASETRACK_MODULE_KEY = 'basetrack';
const CATALOG_PAGE_KEY = 'products';
const DEFAULT_DEPOT_LABEL = 'DEMO UK';

const SHIPMENTS_SECTION = { key: 'shipments-group', label: 'Sevkiyat ve Stok', Icon: Ship };
const CATALOG_SECTION = { key: 'catalog-group', label: 'Katalog', Icon: Car };

// Sıra = sol ray sırası. Anahtar URL segmentidir (/base/<anahtar>); eski /base/catalog,
// /base/coverage, /base/tracking adresleri aynen çalışır.
const TABS = [
  { key: 'overview', label: 'Genel Bakış', Icon: LayoutDashboard, section: SHIPMENTS_SECTION },
  { key: 'warnings', label: 'Stok Uyarıları', Icon: AlertTriangle, section: SHIPMENTS_SECTION },
  { key: 'pipeline', label: 'Sevkiyat Hattı', Icon: Ship, section: SHIPMENTS_SECTION },
  { key: 'depot', label: 'Depo', Icon: Warehouse, section: SHIPMENTS_SECTION },
  { key: 'reports', label: 'Raporlar', Icon: FileSpreadsheet, section: SHIPMENTS_SECTION },
  { key: 'settings', label: 'Ayarlar', Icon: Settings, section: SHIPMENTS_SECTION },
  { key: 'catalog', label: 'Araç Kataloğu', Icon: Car, section: CATALOG_SECTION },
  { key: 'coverage', label: 'Kategori Kapsamı', Icon: LayoutGrid, section: CATALOG_SECTION },
  { key: 'tracking', label: 'Ürün Takibi', Icon: PackageSearch, section: CATALOG_SECTION },
] as const satisfies readonly WorkspaceTab[];

type TabKey = (typeof TABS)[number]['key'];

const BASETRACK_TABS: ReadonlySet<TabKey> = new Set<TabKey>(['overview', 'warnings', 'pipeline', 'depot', 'reports', 'settings']);

const VIEWS: Record<TabKey, React.ComponentType> = {
  overview: OverviewTab,
  warnings: StockWarningsTab,
  pipeline: PipelineTab,
  depot: DepotTab,
  reports: ReportsTab,
  settings: SettingsTab,
  catalog: BaseCatalogWorkspace,
  coverage: BaseCoverageWorkspace,
  tracking: BaseProductTrackingTab,
};

export function BaseHubWorkspace({ onClose }: { onClose: () => void }) {
  const { isModuleAllowed } = useModuleAccess();
  const catalog = useModuleCatalog();
  const { isAllowed } = usePagePermissions();

  const baseTrackAllowed = catalog.isEnabled(BASETRACK_MODULE_KEY)
    && catalog.isAvailableOnServer(BASETRACK_MODULE_KEY)
    && isModuleAllowed(BASETRACK_MODULE_KEY);
  const catalogAllowed = isAllowed(CATALOG_PAGE_KEY);

  // Depo sekmesinin adı ayardan gelir; yetkisi olmayanda istek hiç atılmaz (403 olmasın).
  const settings = useBaseTrackSettings(baseTrackAllowed);
  const depotLabel = settings.data?.depotLabel ?? DEFAULT_DEPOT_LABEL;

  const tabs: WorkspaceTab[] = TABS
    .filter((tab) => (BASETRACK_TABS.has(tab.key) ? baseTrackAllowed : catalogAllowed))
    .map((tab) => (tab.key === 'depot' ? { ...tab, label: `${depotLabel} Depo` } : tab));

  const [tab, setTab] = useState<TabKey>(tabs[0]?.key as TabKey ?? 'overview');
  const activeKey = tabs.some((candidate) => candidate.key === tab) ? tab : (tabs[0]?.key as TabKey | undefined);
  const ActiveView = activeKey ? VIEWS[activeKey] : undefined;

  return (
    <ModuleWorkspace
      title="Base Hub"
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
              icon={Ship}
              title="Görüntüleyebileceğiniz Base ekranı yok"
              description="Bu çalışma alanındaki sayfalar için hesabınıza yetki tanımlanmamış. Sistem yöneticinizle görüşün."
            />
          </div>
        )}
      </div>
    </ModuleWorkspace>
  );
}
