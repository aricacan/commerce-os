'use client';

import { useState } from 'react';
import { ListChecks } from 'lucide-react';
import type { ActivityEntryDto } from '../../../lib/api';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useActivity, useActivityDomains, useUsersActivity } from '../../../hooks/monitoring/useMonitoringUsers';
import { daysAgoIso, dayHeading, localDayKey } from '../format';
import { Pager, Panel, QueryStatus, useNow } from '../ui';
import { ActivityRow } from '../ActivityRow';
import { ActivityFilters, type ActivityFilterValues } from './ActivityFilters';

const PAGE_SIZE = 50;
const DEFAULT_DAYS = 7;
// Kişi seçeneği, süzgeç aralığından bağımsız olarak son 90 günde görünen herkesi listeler.
const USER_OPTIONS_DAYS = 90;

interface DayGroup {
  key: string;
  entries: ActivityEntryDto[];
}

// Liste sunucudan en yeniden eskiye gelir; ardışık aynı günler tek başlık altında toplanır.
function groupByDay(entries: ActivityEntryDto[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const entry of entries) {
    const key = localDayKey(entry.createdAt);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.entries.push(entry);
    else groups.push({ key, entries: [entry] });
  }
  return groups;
}

// "Kim ne yaptı": manuel sipariş, fiyat, cari, fatura… iş işlemleri, en yeni üstte.
export function ActivityTab() {
  const now = useNow();
  const [filters, setFilters] = useState<ActivityFilterValues>({ domain: '', userId: null, search: '', days: DEFAULT_DAYS });
  // Başlangıç anı aralık SEÇİLDİĞİNDE sabitlenir; her render'da yeniden hesaplansa sorgu
  // anahtarı dakikada bir değişir ve liste sürekli yeniden çekilirdi.
  const [from, setFrom] = useState(() => daysAgoIso(DEFAULT_DAYS, Date.now()));
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(filters.search.trim(), 300);

  const domains = useActivityDomains();
  const users = useUsersActivity(USER_OPTIONS_DAYS);
  const activity = useActivity({
    domain: filters.domain || undefined,
    actorUserId: filters.userId ?? undefined,
    search: search || undefined,
    from,
    page,
    pageSize: PAGE_SIZE,
  });

  const changeFilters = (patch: Partial<ActivityFilterValues>) => {
    setFilters((current) => ({ ...current, ...patch }));
    if (patch.days !== undefined) setFrom(daysAgoIso(patch.days, Date.now()));
    setPage(1);
  };

  const items = activity.data?.items ?? [];
  const filtered = Boolean(filters.domain || filters.userId || search);

  return (
    <div className="flex flex-col gap-4">
      <ActivityFilters
        values={filters}
        domains={domains.data ?? []}
        users={users.data ?? []}
        onChange={changeFilters}
      />

      <Panel>
        <QueryStatus
          isLoading={activity.isLoading}
          isError={activity.isError}
          isEmpty={items.length === 0}
          onRetry={() => activity.refetch()}
          emptyIcon={ListChecks}
          emptyTitle={filtered ? 'Eşleşen işlem yok' : 'Bu dönemde işlem yok'}
          emptyDescription={filtered
            ? 'Süzgeçleri gevşetmeyi ya da tarih aralığını genişletmeyi deneyin.'
            : 'Sipariş, fiyat, cari gibi iş işlemleri yapıldıkça burada görünür.'}
        >
          <div className={activity.isPlaceholderData ? 'opacity-60 transition-opacity' : ''}>
            {groupByDay(items).map((group) => (
              <section key={group.key}>
                <h3 className="sticky top-0 z-[1] border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] px-4 py-1.5 text-ui-2xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  {dayHeading(group.entries[0].createdAt, now)}
                </h3>
                <ul className="divide-y divide-[var(--border-soft)]">
                  {group.entries.map((entry) => <ActivityRow key={entry.id} entry={entry} />)}
                </ul>
              </section>
            ))}
          </div>
          <Pager page={page} pageSize={PAGE_SIZE} totalCount={activity.data?.totalCount ?? 0} onChange={setPage} />
        </QueryStatus>
      </Panel>
    </div>
  );
}
