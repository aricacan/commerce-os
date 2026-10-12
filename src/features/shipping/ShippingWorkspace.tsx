'use client';

import { useState } from 'react';
import { Truck, Package, Link2 } from 'lucide-react';
import { useInitialTab } from '../../hooks/useInitialTab';
import { ModuleWorkspace, type WorkspaceTab } from '../shared/ModuleWorkspace';
import { CarriersTab } from './CarriersTab';
import { CarrierMappingsTab } from './CarrierMappingsTab';
import { ShipmentsTab } from './ShipmentsTab';

interface Props {
  onClose: () => void;
}

const TABS = [
  { key: 'shipments', label: 'Gönderiler', Icon: Package },
  { key: 'carriers',  label: 'Taşıyıcılar', Icon: Truck },
  { key: 'mappings',  label: 'Eşleştirme', Icon: Link2 },
] as const satisfies readonly WorkspaceTab[];

type TabKey = (typeof TABS)[number]['key'];

export function ShippingWorkspace({ onClose }: Props) {
  const initialTab = useInitialTab(TABS.map((t) => t.key), 'shipments');
  const [tab, setTab] = useState<TabKey>(initialTab);

  return (
    <>
      <ModuleWorkspace
        title="Lojistik"
        tabs={TABS}
        activeTab={tab}
        onTabChange={(k) => setTab(k as TabKey)}
        onClose={onClose}
        scroll={false}
      >
        <div className="flex-1 flex flex-col min-h-0 w-full">
          {tab === 'shipments' && <ShipmentsTab />}
          {tab === 'carriers' && <CarriersTab />}
          {tab === 'mappings' && <CarrierMappingsTab />}
        </div>
      </ModuleWorkspace>
    </>
  );
}
