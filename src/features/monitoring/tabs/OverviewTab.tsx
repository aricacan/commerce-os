'use client';

import type { ReactNode } from 'react';
import { Bot, Clock, HeartPulse, LayoutGrid, Lightbulb, ListChecks, ShieldAlert, Users } from 'lucide-react';
import { useI18n } from '../../../lib/i18n';
import { useExceptionGroups, useHealthChecks, useRoutePerformance } from '../../../hooks/monitoring/useMonitoring';
import { useActivity, usePageUsage, useUsersActivity } from '../../../hooks/monitoring/useMonitoringUsers';
import { useInsightSummary } from '../../../hooks/monitoring/useMonitoringInsights';
import { useSyntheticOverview } from '../../../hooks/monitoring/useSyntheticChecks';
import type { MonitoringTabKey } from '../monitoring-tabs';
import { buildPageHealth } from '../page-health';
import { checkLabel } from '../synthetic';
import { OverviewCard } from '../OverviewCard';
import { ActivityRow } from '../ActivityRow';

const WINDOW_HOURS = 24;
// Hata sayısı gruplardan toplanır; bu sınırı aşan grup sayısı "+" ile belirtilir.
const ERROR_GROUP_LIMIT = 50;
const SLOWEST_ROUTE_COUNT = 3;
const RECENT_ACTIVITY_COUNT = 10;
const NAMES_SHOWN = 3;

interface Props {
  onNavigate: (tab: MonitoringTabKey) => void;
  /** Öneriler kartı — yalnız SuperAdmin (uç diğer rollere 403). */
  showInsights: boolean;
  /** Sentetik kontroller kartı — yalnız platform işletmecisi (uç diğerlerine 403). */
  showSynthetic: boolean;
}

function Detail({ children }: { children: ReactNode }) {
  return <p className="line-clamp-2 text-xs text-[var(--fg-muted)]">{children}</p>;
}

// Tek ekranda "şu an her şey yolunda mı": altı kart, her biri kendi sekmesine götürür.
export function OverviewTab({ onNavigate, showInsights, showSynthetic }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {showInsights ? <InsightsCard onOpen={() => onNavigate('insights')} /> : null}
      <UsersCard onOpen={() => onNavigate('sessions')} />
      <ErrorsCard onOpen={() => onNavigate('exceptions')} />
      <SlowRoutesCard onOpen={() => onNavigate('slow-requests')} />
      <ModulesCard onOpen={() => onNavigate('health-checks')} />
      <PagesCard onOpen={() => onNavigate('pages')} />
      {showSynthetic ? <SyntheticCard onOpen={() => onNavigate('synthetic-checks')} /> : null}
      <RecentActivityCard onOpen={() => onNavigate('activity')} />
    </div>
  );
}

function InsightsCard({ onOpen }: { onOpen: () => void }) {
  const { data, isLoading, isError } = useInsightSummary();

  return (
    <OverviewCard
      title="Öneriler"
      Icon={Lightbulb}
      value={data?.newCount ?? 0}
      alert={(data?.criticalCount ?? 0) > 0}
      isLoading={isLoading}
      isError={isError}
      onOpen={onOpen}
    >
      <Detail>
        {!data?.lastRunAt
          ? 'Henüz analiz yok — Analiz et ile başlat.'
          : `${data.newCount} yeni öneri (${data.criticalCount} kritik)`}
      </Detail>
    </OverviewCard>
  );
}

function UsersCard({ onOpen }: { onOpen: () => void }) {
  const { data = [], isLoading, isError } = useUsersActivity(1);
  const online = data.filter((user) => user.isOnline);
  const activeToday = data.filter((user) => user.sessions > 0).length;

  return (
    <OverviewCard title="Şu an çevrimiçi" Icon={Users} value={online.length} isLoading={isLoading} isError={isError} onOpen={onOpen}>
      <Detail>
        Son 24 saatte {activeToday} kişi girdi
        {online.length > 0 ? ` · ${online.slice(0, NAMES_SHOWN).map((user) => user.userName).join(', ')}` : ''}
      </Detail>
    </OverviewCard>
  );
}

function ErrorsCard({ onOpen }: { onOpen: () => void }) {
  const { data = [], isLoading, isError } = useExceptionGroups(WINDOW_HOURS, ERROR_GROUP_LIMIT);
  const total = data.reduce((sum, group) => sum + group.count, 0);
  const top = [...data].sort((a, b) => b.count - a.count)[0];
  const capped = data.length >= ERROR_GROUP_LIMIT ? '+' : '';

  return (
    <OverviewCard title="Hatalar · 24 saat" Icon={ShieldAlert} value={`${total}${capped}`} alert={total > 0} isLoading={isLoading} isError={isError} onOpen={onOpen}>
      <Detail>{top ? `En sık: ${top.count}× ${top.sampleMessage}` : 'Son 24 saatte hata yok.'}</Detail>
    </OverviewCard>
  );
}

function SlowRoutesCard({ onOpen }: { onOpen: () => void }) {
  const { data = [], isLoading, isError } = useRoutePerformance(WINDOW_HOURS);
  const slowest = [...data].sort((a, b) => b.p95Ms - a.p95Ms).slice(0, SLOWEST_ROUTE_COUNT);

  return (
    <OverviewCard
      title="En yavaş uçlar"
      Icon={Clock}
      value={slowest[0] ? `${Math.round(slowest[0].p95Ms)} ms` : '—'}
      isLoading={isLoading}
      isError={isError}
      onOpen={onOpen}
    >
      {slowest.length === 0 ? <Detail>Henüz ölçüm yok.</Detail> : (
        <ul className="flex flex-col gap-1">
          {slowest.map((route) => (
            <li key={`${route.method} ${route.route}`} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate font-mono text-[var(--fg-muted)]">{route.method} {route.route}</span>
              <span className="shrink-0 font-semibold text-[var(--fg)]">{Math.round(route.p95Ms)} ms</span>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}

function ModulesCard({ onOpen }: { onOpen: () => void }) {
  const { data = [], isLoading, isError } = useHealthChecks();
  const failing = data.filter((check) => check.state === 'Failing');

  return (
    <OverviewCard title="Bozuk modüller" Icon={HeartPulse} value={failing.length} alert={failing.length > 0} isLoading={isLoading} isError={isError} onOpen={onOpen}>
      <Detail>
        {failing.length === 0
          ? `${data.length} kontrolde hatalı yok.`
          : failing.map((check) => check.name).join(', ')}
      </Detail>
    </OverviewCard>
  );
}

function PagesCard({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  const { data = [], isLoading, isError } = usePageUsage(1);
  const broken = buildPageHealth(data).filter((item) => item.status === 'error');

  return (
    <OverviewCard title="Sorunlu sayfalar" Icon={LayoutGrid} value={broken.length} alert={broken.length > 0} isLoading={isLoading} isError={isError} onOpen={onOpen}>
      <Detail>
        {broken.length === 0
          ? 'Son 24 saatte sayfa hatası yok.'
          : broken.slice(0, NAMES_SHOWN).map((item) => t(item.page.labelKey)).join(', ')}
      </Detail>
    </OverviewCard>
  );
}

function SyntheticCard({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  const { data, isLoading, isError } = useSyntheticOverview();
  const failed = data?.checks.filter((check) => check.status === 'failed') ?? [];

  const detail = !data || data.total === 0
    ? 'Henüz kontrol çalışmadı.'
    : !data.botReady
      ? 'Bot hesabı hazır değil — kontroller koşamıyor.'
      : failed.length === 0
        ? 'Kalan kontrol yok.'
        : `Kalan: ${failed.slice(0, NAMES_SHOWN).map((check) => checkLabel(check, t)).join(', ')}`;

  return (
    <OverviewCard
      title="Sentetik kontroller"
      Icon={Bot}
      value={data ? `${data.passed}/${data.total} geçti` : '—'}
      alert={failed.length > 0 || data?.botReady === false}
      isLoading={isLoading}
      isError={isError}
      onOpen={onOpen}
    >
      <Detail>{detail}</Detail>
    </OverviewCard>
  );
}

function RecentActivityCard({ onOpen }: { onOpen: () => void }) {
  const { data, isLoading, isError } = useActivity({ page: 1, pageSize: RECENT_ACTIVITY_COUNT });
  const items = data?.items ?? [];

  return (
    <div className="sm:col-span-2 xl:col-span-3">
      <OverviewCard title="Son işlemler" Icon={ListChecks} isLoading={isLoading} isError={isError} onOpen={onOpen}>
        {items.length === 0 ? <Detail>Henüz kayıtlı işlem yok.</Detail> : (
          <ul className="divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)]">
            {items.map((entry) => <ActivityRow key={entry.id} entry={entry} compact />)}
          </ul>
        )}
      </OverviewCard>
    </div>
  );
}
