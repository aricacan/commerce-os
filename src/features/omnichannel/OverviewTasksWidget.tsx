'use client';

import { crmApi, TASK_SCOPE, TASK_STATUS } from '../../lib/api/customers';
import { formatPanelDate } from './CustomerPanelParts';
import { CardLink, ChartCard } from './OverviewCards';
import { isOverdue, sortOpenTasks, tasksCaption } from './overviewWidgetRules';
import { SnapshotList, type SnapshotItem } from './SnapshotList';
import { useResource } from './useResource';

const VISIBLE_COUNT = 5;

interface Props {
  reloadKey: number;
  onNavigate: (tab: string) => void;
}

// Benim açık görevlerim, vadesi en yakından başlayarak (şu an, dönemden bağımsız).
export function OverviewTasksWidget({ reloadKey, onNavigate }: Props) {
  const tasks = useResource(() => crmApi.tasks({ scope: TASK_SCOPE.Mine, status: TASK_STATUS.Open }), `tasks-${reloadKey}`);
  const open = sortOpenTasks(tasks.data ?? []);

  const items: SnapshotItem[] = open.slice(0, VISIBLE_COUNT).map((t) => ({
    id: t.id,
    title: t.title,
    subtitle: t.customerName ?? 'Müşteriye bağlı değil',
    meta: t.dueAt ? formatPanelDate(t.dueAt) : 'Vadesiz',
    attention: isOverdue(t),
  }));

  return (
    <ChartCard
      title="Bekleyen görevlerim" loading={tasks.loading && !tasks.data} error={tasks.error}
      caption={tasks.data ? tasksCaption(open) : undefined}
      action={<CardLink label="Görevler" onClick={() => onNavigate('tasks')} />}
    >
      <SnapshotList items={items} ariaLabel="Açık görevler" emptyText="Açık göreviniz yok." />
    </ChartCard>
  );
}
