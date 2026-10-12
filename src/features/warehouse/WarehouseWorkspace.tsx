'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Warehouse as WarehouseIcon, HelpCircle } from 'lucide-react';
import { warehouseApi } from '../../lib/api';
import { ModuleWorkspace } from '../shared/ModuleWorkspace';
import { WMS_TABS, type WmsTab } from './shared';
import { EditorTab } from './EditorTab';
import { OperationsTab } from './OperationsTab';
import { ManagementTab } from './ManagementTab';
import { ReceivingTab } from './ReceivingTab';
import { PickingTab } from './PickingTab';
import { MutabakatTab } from './MutabakatTab';
import { WmsAlertHost } from './WmsAlertHost';
import { WarehouseHelpOverlay } from './WarehouseHelpOverlay';
import { FilterSelect } from '../../components/ui/FilterSelect';

const Viewer3DTab = dynamic(
  () => import('./Viewer3DTab').then((module) => module.Viewer3DTab),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        className="h-full flex items-center justify-center text-xs text-[var(--fg-muted)]"
      >
        3D depo yükleniyor…
      </div>
    ),
  },
);

interface Props {
  onClose: () => void;
}

function CreateWarehouseCard() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const { mutate, isPending, error } = useMutation({
    mutationFn: (name: string) => warehouseApi.createWarehouse(name, null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wms-warehouses'] }),
  });

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 gap-3 text-center text-xs text-[var(--fg-muted)]">
      <WarehouseIcon size={36} className="text-[var(--fg-muted)]" />
      <div className="font-bold text-sm text-[var(--fg)]">Henüz depo oluşturulmadı</div>
      <p className="max-w-xs">Başlamak için ilk fiziksel deponuzu tanımlayın.</p>
      <form
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) mutate(name.trim()); }}
        className="flex items-center gap-2 mt-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Depo adı (ör. DEMO Ana Depo)"
          className="h-8.5 w-64 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
        />
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="h-8.5 px-4 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
        >
          {isPending ? 'Oluşturuluyor...' : 'Depo Oluştur'}
        </button>
      </form>
      {error && <div className="text-rose-500 text-xs mt-1">Depo oluşturulamadı, tekrar deneyin.</div>}
    </div>
  );
}

export function WarehouseWorkspace({ onClose }: Props) {
  const [tab, setTab] = useState<WmsTab>('editor');
  const { data: warehouses } = useQuery({ queryKey: ['wms-warehouses'], queryFn: warehouseApi.listWarehouses });
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const activeWarehouseId = warehouseId ?? warehouses?.[0]?.id ?? null;

  const warehouseOptions = (warehouses ?? []).map((w) => ({
    value: String(w.id),
    label: w.name,
  }));

  return (
    <>
      <ModuleWorkspace
        title="WMS"
        tabs={WMS_TABS}
        activeTab={tab}
        onTabChange={(k) => setTab(k as WmsTab)}
        onClose={onClose}
        scroll={false}
        sidebarFooter={(sidebarOpen) => (
          <div
            className="flex items-center gap-2.5 p-2 rounded-[4px] hover:bg-[var(--bg-subtle)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer text-xs font-semibold"
            onClick={() => setHelpOpen(true)}
            title="Yardım — kullanım rehberi"
          >
            <HelpCircle size={16} />
            {sidebarOpen && <span>Kullanım Rehberi</span>}
          </div>
        )}
      >
        <WmsAlertHost />

        {warehouses && warehouses.length > 1 && (
          <div className="flex justify-end p-3 px-5 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 shrink-0">
            <div className="w-52">
              <FilterSelect
                value={String(activeWarehouseId ?? '')}
                onChange={(v) => setWarehouseId(Number(v))}
                placeholder="Aktif Depo Seçin"
                height="h-7.5"
                options={warehouseOptions}
              />
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeWarehouseId == null ? (
            <CreateWarehouseCard />
          ) : tab === 'editor' ? (
            <EditorTab warehouseId={activeWarehouseId} />
          ) : tab === 'viewer3d' ? (
            <Viewer3DTab warehouseId={activeWarehouseId} />
          ) : tab === 'operations' ? (
            <OperationsTab warehouseId={activeWarehouseId} />
          ) : tab === 'receiving' ? (
            <ReceivingTab warehouseId={activeWarehouseId} />
          ) : tab === 'picking' ? (
            <PickingTab warehouseId={activeWarehouseId} />
          ) : tab === 'mutabakat' ? (
            <MutabakatTab />
          ) : (
            <ManagementTab warehouseId={activeWarehouseId} />
          )}
        </div>
      </ModuleWorkspace>

      {helpOpen && <WarehouseHelpOverlay onClose={() => setHelpOpen(false)} />}
    </>
  );
}
