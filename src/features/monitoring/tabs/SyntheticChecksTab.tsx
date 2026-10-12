'use client';

import { useMemo, useState } from 'react';
import { Bot } from 'lucide-react';
import { useI18n } from '../../../lib/i18n';
import { moduleKeyOfWorkspace } from '../../../lib/workspace-routes';
import { useModuleCatalog } from '../../../hooks/useModuleCatalog';
import { useSyntheticOverview } from '../../../hooks/monitoring/useSyntheticChecks';
import {
  ALL, DEFAULT_FILTERS, filterChecks, groupChecksByModule, moduleOptions, type GroupLabels, type SyntheticFilters,
} from '../synthetic-groups';
import { QueryStatus } from '../ui';
import { SyntheticSummary } from './SyntheticSummary';
import { SyntheticQuietHours } from './SyntheticQuietHours';
import { SyntheticRunBar } from './SyntheticRunBar';
import { SyntheticFilterBar } from './SyntheticFilterBar';
import { SyntheticModuleList, type HistoryTarget } from './SyntheticModuleList';
import { SyntheticHistorySheet } from './SyntheticHistorySheet';

// "Bot sayfaları, modül sekmelerini, iş akışlarını denediğinde ne gördü?" — sonuçlar MODÜL →
// İÇ SEKME olarak gruplanır; katman/durum/modül süzgeci, katman başına "Şimdi çalıştır" ve
// mesai saati ayarı burada. Kontroller burada koşmaz; "Şimdi çalıştır" kuyruğa alır.
export function SyntheticChecksTab() {
  const overview = useSyntheticOverview();
  const { all: modules } = useModuleCatalog();
  const { t } = useI18n();
  const [filters, setFilters] = useState<SyntheticFilters>(DEFAULT_FILTERS);
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);
  const data = overview.data;

  // Modül adları backend kataloğundan (Uygulamalar menüsüyle aynı ad); katalog dizisi sorgu
  // önbelleğinden geldiği için kararlı — gruplama her çizimde yeniden hesaplanmaz.
  const labels: GroupLabels = useMemo(() => {
    const names = new Map(modules.map((entry) => [entry.key.toLowerCase(), entry.displayName]));
    return {
      translate: t,
      moduleName: (workspace) => names.get(moduleKeyOfWorkspace(workspace).toLowerCase()) ?? null,
    };
  }, [t, modules]);

  // Süzgeç seçenekleri TÜM kontrollerden: durum süzgeci değişince modül listesi daralmasın.
  const allGroups = useMemo(() => groupChecksByModule(data?.checks ?? [], labels), [data?.checks, labels]);
  const visibleGroups = useMemo(() => {
    const groups = groupChecksByModule(filterChecks(data?.checks ?? [], filters), labels);
    return filters.group === ALL ? groups : groups.filter((group) => group.key === filters.group);
  }, [data?.checks, filters, labels]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <QueryStatus
        isLoading={overview.isLoading}
        isError={overview.isError}
        isEmpty={false}
        onRetry={() => overview.refetch()}
        emptyIcon={Bot}
        emptyTitle="Henüz kontrol yok"
      >
        {data ? (
          <>
            <SyntheticSummary overview={data} />
            <SyntheticQuietHours settings={data.settings} />
            <SyntheticRunBar overview={data} />
            <SyntheticFilterBar filters={filters} moduleOptions={moduleOptions(allGroups)} onChange={setFilters} />
            <SyntheticModuleList groups={visibleGroups} onOpen={setHistoryTarget} />
          </>
        ) : null}
      </QueryStatus>
      <SyntheticHistorySheet target={historyTarget} onClose={() => setHistoryTarget(null)} />
    </div>
  );
}
