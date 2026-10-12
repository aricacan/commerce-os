'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LayoutGrid, Megaphone, Link2, Layers, PiggyBank, HelpCircle, Lightbulb, ShieldCheck } from 'lucide-react';
import { ModuleWorkspace, type WorkspaceTab } from '../shared/ModuleWorkspace';
import type { ErpSourceCode } from '../../stores/store-selector';
import type { AdPlatform } from '../../lib/api/adshub';
import { useWorkspacePanel, type PendingAdsHubOAuthSession } from '../../stores/workspace-panel';
import { useDateRange } from './useDateRange';
import { DateRangeBar } from './DateRangeBar';
import { FilterBar } from './FilterBar';
import { OverviewTab } from './OverviewTab';
import { CampaignsTab } from './CampaignsTab';
import { PlacementTab } from './PlacementTab';
import { ProfitTab } from './ProfitTab';
import { AccountsTab } from './AccountsTab';
import { RecommendationsTab } from './RecommendationsTab';
import { ApprovalsTab } from './ApprovalsTab';

const AdsHubHelpOverlay = dynamic(
  () => import('./AdsHubHelpOverlay').then((module) => module.AdsHubHelpOverlay),
  { ssr: false },
);

interface Props {
  onClose: () => void;
}

const TABS = [
  { key: 'overview',        label: 'Genel Bakış', Icon: LayoutGrid },
  { key: 'campaigns',       label: 'Kampanyalar', Icon: Megaphone },
  { key: 'profit',          label: 'Kârlılık', Icon: PiggyBank },
  { key: 'recommendations', label: 'Öneriler', Icon: Lightbulb },
  { key: 'approvals',       label: 'Onaylar', Icon: ShieldCheck },
  { key: 'placement',       label: 'Yerleşim', Icon: Layers },
  { key: 'accounts',        label: 'Hesaplar', Icon: Link2 },
] as const satisfies readonly WorkspaceTab[];

type TabKey = (typeof TABS)[number]['key'];

export function AdsHubWorkspace({ onClose }: Props) {
  const pendingOAuth = useWorkspacePanel((s) => s.pendingAdsHubOAuthSession);
  const clearPendingOAuth = useWorkspacePanel((s) => s.clearPendingAdsHubOAuthSession);
  const [oauthSession, setOauthSession] = useState<PendingAdsHubOAuthSession | null>(null);

  const [tab, setTab] = useState<TabKey>(() => (pendingOAuth ? 'accounts' : 'overview'));
  const range = useDateRange(30);

  useEffect(() => {
    if (!pendingOAuth) return;
    setOauthSession(pendingOAuth);
    setTab('accounts');
    clearPendingOAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOAuth]);

  const [erpSources, setErpSources] = useState<ErpSourceCode[]>([]);
  const [platforms, setPlatforms] = useState<AdPlatform[]>([]);
  const [focusAccountId, setFocusAccountId] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const openAccount = (accountId: number) => {
    setFocusAccountId(accountId);
    setTab('accounts');
  };

  const showTopFilters = tab === 'overview' || tab === 'campaigns' || tab === 'profit' || tab === 'placement';

  return (
    <>
      <ModuleWorkspace
        title="AdsHub"
        tabs={TABS}
        activeTab={tab}
        onTabChange={(k) => { setFocusAccountId(null); setTab(k as TabKey); }}
        onClose={onClose}
        sidebarFooter={(sidebarOpen) => (
          <button
            type="button"
            className="flex items-center gap-2.5 w-full py-2 px-2.5 rounded-[4px] text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            onClick={() => setHelpOpen(true)}
            title="Yardım — API bağlantı rehberi"
          >
            <HelpCircle size={15} />
            {sidebarOpen && <span>API Rehberi & Yardım</span>}
          </button>
        )}
      >
        {/* ── Transparent Unified Filter Row (ERP, Platform, Date Range Side-by-Side) ── */}
        {showTopFilters && (
          <div data-tour="adshub-filter-bar" className="flex flex-wrap items-center gap-2 px-4 sm:px-5 pt-4 pb-0 shrink-0 bg-transparent">
            <FilterBar
              erpSources={erpSources}
              onErpSourcesChange={setErpSources}
              platforms={platforms}
              onPlatformsChange={setPlatforms}
            />
            <DateRangeBar range={range} />
          </div>
        )}

        {/* ── Active Tab Contents ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-16">
          {tab === 'overview' && (
            <OverviewTab
              onOpenAccount={openAccount}
              erpSources={erpSources}
              platforms={platforms}
              from={range.from}
              to={range.to}
            />
          )}
          {tab === 'campaigns' && (
            <CampaignsTab
              onOpenAccount={openAccount}
              erpSources={erpSources}
              platforms={platforms}
              from={range.from}
              to={range.to}
            />
          )}
          {tab === 'profit' && (
            <ProfitTab
              erpSources={erpSources}
              platforms={platforms}
              from={range.from}
              to={range.to}
            />
          )}
          {tab === 'recommendations' && <RecommendationsTab />}
          {tab === 'approvals' && <ApprovalsTab />}
          {tab === 'placement' && (
            <PlacementTab
              erpSources={erpSources}
              platforms={platforms}
              from={range.from}
              to={range.to}
            />
          )}
          {tab === 'accounts' && (
            <AccountsTab
              key={focusAccountId ?? 'all'}
              focusAccountId={focusAccountId}
              pendingOAuthSession={oauthSession}
              onOAuthSessionConsumed={() => setOauthSession(null)}
            />
          )}
        </div>
      </ModuleWorkspace>

      {helpOpen && <AdsHubHelpOverlay onClose={() => setHelpOpen(false)} />}
    </>
  );
}
