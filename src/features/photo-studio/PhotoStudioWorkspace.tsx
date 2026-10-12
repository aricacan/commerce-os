'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Camera, Eraser } from 'lucide-react';
import { ModuleWorkspace, type WorkspaceTab } from '../shared/ModuleWorkspace';

const StudioTab = dynamic(() => import('./StudioTab').then((module) => module.StudioTab), { ssr: false });
const RemoveBgTab = dynamic(() => import('./RemoveBgTab').then((module) => module.RemoveBgTab), { ssr: false });

const TABS = [
  { key: 'studio', label: 'Stüdyo', Icon: Camera },
  { key: 'remove-bg', label: 'Arka Plan Kaldır', Icon: Eraser },
] as const satisfies readonly WorkspaceTab[];

type TabKey = (typeof TABS)[number]['key'];

interface Props {
  onClose: () => void;
}

export function PhotoStudioWorkspace({ onClose }: Props) {
  const [tab, setTab] = useState<TabKey>('studio');
  const [loadedTabs, setLoadedTabs] = useState<ReadonlySet<TabKey>>(() => new Set(['studio']));

  function handleTabChange(key: string) {
    const nextTab = key as TabKey;
    setTab(nextTab);
    setLoadedTabs((current) => current.has(nextTab) ? current : new Set(current).add(nextTab));
  }

  return (
    <>
      <ModuleWorkspace
        title="Photo Studio"
        tabs={TABS}
        activeTab={tab}
        onTabChange={handleTabChange}
        onClose={onClose}
        scroll={false}
      >
        <div className="flex-1 flex flex-col min-h-0 w-full overflow-y-auto">
          <div className={`p-4 sm:p-5 flex-1 ${tab === 'studio' ? 'block' : 'hidden'}`}>
            <StudioTab />
          </div>
          {loadedTabs.has('remove-bg') && (
            <div className={`p-4 sm:p-5 flex-1 ${tab === 'remove-bg' ? 'block' : 'hidden'}`}>
              <RemoveBgTab />
            </div>
          )}
        </div>
      </ModuleWorkspace>
    </>
  );
}
