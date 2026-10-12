'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { omnichannelApi, type ConversationFilter, type InboxChannelDto, type OverviewScopeParams } from '../../lib/api/omnichannel';
import { OverviewCharts } from './OverviewCharts';
import { OverviewFilters } from './OverviewFilters';
import { OverviewKpiStrip } from './OverviewKpiStrip';
import { OverviewLiveWidgets } from './OverviewLiveWidgets';
import { OverviewSkeleton } from './OverviewSkeleton';
import { DEFAULT_OVERVIEW_RANGE, periodPhrase, toPeriodParams, type OverviewRange } from './overviewPeriod';
import { summarize } from './overviewRules';
import { SYSTEM_HEALTH_SECTION_ID, SystemHealthBadge, SystemHealthSection } from './SystemHealthSection';
import { useOmnichannelCountries } from './useOmnichannelCountries';
import { useResource } from './useResource';

const EMPTY_SCOPE: OverviewScopeParams = {};

interface Props {
  // Hesap sağlığı bulgusundaki "Düzelt" ve widget kısayolları ilgili ekrana götürür.
  onNavigate: (tab: string) => void;
  // Kalite kartındaki düşük puanlı konuşmayı gelen kutusunda açar.
  onOpenConversation?: (conversationId: number) => void;
  // "Cevap bekleyen" kutusu gelen kutusunu o filtreyle açar.
  onOpenInbox?: (filter: ConversationFilter) => void;
}

// "Genel Bakış": süreci tek bakışta özetler. Üstte dönem + marka/kanal/ülke filtresi; sonra özet cümle, KPI
// şeridi ve widget ızgarası. Bakım ve sistem sağlığı en altta katlanır bölümdür (varsayılan kapalı).
export function OverviewTab({ onNavigate, onOpenConversation, onOpenInbox }: Props) {
  const [range, setRange] = useState<OverviewRange>(DEFAULT_OVERVIEW_RANGE);
  const [scope, setScope] = useState<OverviewScopeParams>(EMPTY_SCOPE);
  const [channels, setChannels] = useState<InboxChannelDto[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [insightsToken, setInsightsToken] = useState(0);
  const [healthToken, setHealthToken] = useState(0);
  const [healthOpen, setHealthOpen] = useState(false);

  const { brandId, channelId, country } = scope;
  const period = useMemo(() => toPeriodParams(range), [range]);
  const { countries } = useOmnichannelCountries();
  const countryNames = useMemo(() => Object.fromEntries(countries.map((c) => [c.code, c.name])), [countries]);

  useEffect(() => {
    // Kanal listesi yalnız filtre seçenekleri içindir; yüklenemezse filtre kutuları boş kalır, ekran çalışır.
    omnichannelApi.getMyChannels().then(setChannels).catch(() => setChannels([]));
  }, []);

  const dataKey = `${period.days}-${period.from}-${period.to}-${brandId}-${channelId}-${country}-${reloadToken}`;
  const summary = useResource(() => omnichannelApi.getOverviewSummary(period, { brandId, channelId, country }), `summary-${dataKey}`);
  const insights = useResource(() => omnichannelApi.getOverviewInsights(period, { brandId, channelId, country }), `insights-${dataKey}-${insightsToken}`);
  const health = useResource(() => omnichannelApi.getAccountHealth(), `health-${reloadToken}-${healthToken}`);

  const reloadAll = () => setReloadToken((t) => t + 1);
  const reloadInsights = () => setInsightsToken((t) => t + 1);
  const openHealth = () => {
    setHealthOpen(true);
    requestAnimationFrame(() => document.getElementById(SYSTEM_HEALTH_SECTION_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-4 p-3 text-xs sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <OverviewFilters range={range} onRangeChange={setRange} scope={scope} onScopeChange={setScope} channels={channels} />
        <div className="flex items-center gap-2">
          <SystemHealthBadge health={health} onClick={openHealth} />
          <button
            type="button" aria-label="Yenile" title="Yenile" onClick={reloadAll}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent text-fg-muted hover:bg-bg-subtle sm:size-8"
          >
            <RefreshCw size={13} aria-hidden />
          </button>
        </div>
      </div>

      {summary.error && !summary.data && <SummaryError message={summary.error} onRetry={reloadAll} />}

      {summary.data && (
        <p className="m-0 rounded-md border border-border-soft bg-card p-3 text-ui-md text-fg">
          {summarize(summary.data, periodPhrase(range, period))}
        </p>
      )}

      {!(summary.error && !summary.data) && <OverviewKpiStrip summary={summary.data} insights={insights} onOpenInbox={onOpenInbox} />}

      {summary.data ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <OverviewCharts summary={summary.data} insights={insights} countryNames={countryNames} onReloadInsights={reloadInsights} />
          <OverviewLiveWidgets
            period={period} scope={scope} reloadKey={reloadToken}
            onNavigate={onNavigate} onOpenConversation={onOpenConversation} onOpenInbox={onOpenInbox}
          />
        </div>
      ) : !summary.error && <OverviewSkeleton />}

      <SystemHealthSection
        health={health} open={healthOpen} onToggle={() => setHealthOpen((o) => !o)}
        onReloadHealth={() => setHealthToken((t) => t + 1)} onNavigate={onNavigate}
      />
    </div>
  );
}

function SummaryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-border-soft bg-card p-3 text-danger">
      <span>Genel bakış yüklenemedi: {message}</span>
      <button
        type="button" onClick={onRetry}
        className="cursor-pointer rounded-md border border-border bg-transparent px-2.5 py-1 text-ui-xs font-semibold text-fg hover:bg-bg-subtle"
      >
        Yeniden dene
      </button>
    </div>
  );
}
