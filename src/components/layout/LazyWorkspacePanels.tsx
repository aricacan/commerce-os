'use client';

import dynamic from 'next/dynamic';
import type { WorkspaceKey } from '../../stores/workspace-panel';

const workspaces = {
  'b2b-outreach': dynamic(() => import('../../features/radar/RadarWorkspace').then((module) => module.RadarWorkspace), { ssr: false }),
  'ai-copilot': dynamic(() => import('../../features/intelligent/IntelligentWorkspace').then((module) => module.IntelligentWorkspace), { ssr: false }),
  base: dynamic(() => import('../../features/base-hub/BaseHubWorkspace').then((module) => module.BaseHubWorkspace), { ssr: false }),
  erpis: dynamic(() => import('../../features/erpis/ErpisWorkspace').then((module) => module.ErpisWorkspace), { ssr: false }),
  sentos: dynamic(() => import('../../features/sentostrack/SentosTrackWorkspace').then((module) => module.SentosTrackWorkspace), { ssr: false }),
  omnichannel: dynamic(() => import('../../features/omnichannel/OmnichannelWorkspace').then((module) => module.OmnichannelWorkspace), { ssr: false }),
  sitehub: dynamic(() => import('../../features/sitehub/SiteHubWorkspace').then((module) => module.SiteHubWorkspace), { ssr: false }),
  shopify: dynamic(() => import('../../features/shopify/ShopifyHubWorkspace').then((module) => module.ShopifyHubWorkspace), { ssr: false }),
  'oem-matcher': dynamic(() => import('../../features/sonar/SonarWorkspace').then((module) => module.SonarWorkspace), { ssr: false }),
  adshub: dynamic(() => import('../../features/adshub/AdsHubWorkspace').then((module) => module.AdsHubWorkspace), { ssr: false }),
  logistics: dynamic(() => import('../../features/shipping/ShippingWorkspace').then((module) => module.ShippingWorkspace), { ssr: false }),
  'photo-studio': dynamic(() => import('../../features/photo-studio/PhotoStudioWorkspace').then((module) => module.PhotoStudioWorkspace), { ssr: false }),
  monitoring: dynamic(() => import('../../features/monitoring/MonitoringWorkspace').then((module) => module.MonitoringWorkspace), { ssr: false }),
  wms: dynamic(() => import('../../features/warehouse/WarehouseWorkspace').then((module) => module.WarehouseWorkspace), { ssr: false }),
  sellingview: dynamic(() => import('../../features/sellingview/SellingViewWorkspace').then((module) => module.SellingViewWorkspace), { ssr: false }),
  partnerhub: dynamic(() => import('../../features/partnerhub/PartnerHubWorkspace').then((module) => module.PartnerHubWorkspace), { ssr: false }),
  trendyol: dynamic(() => import('../../features/trendyol/TrendyolWorkspace').then((module) => module.TrendyolWorkspace), { ssr: false }),
} satisfies Record<WorkspaceKey, React.ComponentType<{ onClose: () => void }>>;

export function LazyWorkspacePanels({ activeWorkspace, onClose }: {
  activeWorkspace: WorkspaceKey | null;
  onClose: () => void;
}) {
  if (!activeWorkspace) return null;
  const Workspace = workspaces[activeWorkspace];
  return <Workspace onClose={onClose} />;
}
