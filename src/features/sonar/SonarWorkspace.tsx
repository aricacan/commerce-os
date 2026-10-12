'use client';

import { useState } from 'react';
import { FileSpreadsheet, Globe, Hash, LayoutGrid, ListChecks, Radio } from 'lucide-react';
import { ModuleWorkspace, type WorkspaceTab } from '../shared/ModuleWorkspace';
import { ImportTab } from './ImportTab';
import { JobsTab } from './JobsTab';
import { MatchReviewTab } from './MatchReviewTab';
import { OemsTab } from './OemsTab';
import { StudioTab } from './StudioTab';
import { SitesTab } from './SitesTab';

interface Props {
  onClose: () => void;
}

const TABS = [
  { key: 'imports', label: 'Excel', Icon: FileSpreadsheet },
  { key: 'sites',   label: 'Siteler', Icon: Globe },
  { key: 'jobs',    label: 'Taramalar', Icon: Radio },
  { key: 'review',  label: 'Eşleştirme', Icon: ListChecks },
  { key: 'oems',    label: 'OEM Sözlüğü', Icon: Hash },
  { key: 'studio',  label: 'Stüdyo', Icon: LayoutGrid },
] as const satisfies readonly WorkspaceTab[];

type TabKey = (typeof TABS)[number]['key'];

export function SonarWorkspace({ onClose }: Props) {
  const [tab, setTab] = useState<TabKey>('imports');

  return (
    <ModuleWorkspace
      title="OEM Matcher"
      tabs={TABS}
      activeTab={tab}
      onTabChange={(k) => setTab(k as TabKey)}
      onClose={onClose}
    >
      {tab === 'imports' && <ImportTab />}
      {tab === 'sites' && <SitesTab />}
      {tab === 'jobs' && <JobsTab />}
      {tab === 'review' && <MatchReviewTab />}
      {tab === 'oems' && <OemsTab />}
      {tab === 'studio' && <StudioTab />}
    </ModuleWorkspace>
  );
}
