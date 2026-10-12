'use client';

import { useCallback, useEffect, useState } from 'react';
import { ListTodo, Plus } from 'lucide-react';
import { crmApi, TASK_SCOPE, TASK_STATUS, type CrmTaskDto, type TaskScope, type TaskStatus } from '../../lib/api/customers';
import { useMobile } from '../../hooks/useMobile';
import { describeError } from '../../lib/errors';
import { CustomerPanel, CustomerPanelDock } from './CustomerPanel';
import { CrmTaskForm, CrmTaskRow } from './CrmTaskParts';
import { primaryButtonClass } from './CustomerPanelParts';

const SCOPES: { value: TaskScope; label: string }[] = [
  { value: TASK_SCOPE.Mine, label: 'Bana atanan' },
  { value: TASK_SCOPE.All, label: 'Tüm ekip' },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: TASK_STATUS.Open, label: 'Açık' },
  { value: TASK_STATUS.Done, label: 'Tamamlanan' },
];

// "Görevlerim": takip işleri (geri arama, teklif hazırlama). Süresi gelen görev atanan
// kişiye bildirim olarak hatırlatılır.
export function TasksTab() {
  const isMobile = useMobile();
  const [scope, setScope] = useState<TaskScope>(TASK_SCOPE.Mine);
  const [status, setStatus] = useState<TaskStatus>(TASK_STATUS.Open);
  const [tasks, setTasks] = useState<CrmTaskDto[]>([]);
  const [adding, setAdding] = useState(false);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTasks(await crmApi.tasks({ scope, status }));
    } catch (e) {
      setError(describeError(e));
    }
  }, [scope, status]);

  useEffect(() => { void load(); }, [load]);

  const panel = customerId !== null && (
    <CustomerPanel key={customerId} profileId={customerId} onClose={() => setCustomerId(null)} />
  );

  if (isMobile && panel) return <div className="h-full">{panel}</div>;

  return (
    <div className="relative flex h-full min-h-0 w-full">
      <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4 text-xs sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <ListTodo size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">Görevler</h2>
          <div className="flex-1" />
          <Segmented options={SCOPES} value={scope} onChange={setScope} />
          <Segmented options={STATUSES} value={status} onChange={setStatus} />
          {!adding && (
            <button type="button" className={primaryButtonClass} onClick={() => setAdding(true)}>
              <Plus size={12} /> Görev
            </button>
          )}
        </div>

        {adding && (
          <CrmTaskForm onCancel={() => setAdding(false)} onCreated={() => { setAdding(false); void load(); }} />
        )}

        {error && <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">{error}</div>}

        <ul className="flex flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4">
          {tasks.length === 0 && <li className="text-center text-[var(--fg-muted)]">Görev yok.</li>}
          {tasks.map((t) => (
            <CrmTaskRow key={t.id} task={t} showCustomer onOpenCustomer={setCustomerId}
              onChanged={(updated) => setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))} />
          ))}
        </ul>
      </div>

      {panel && <CustomerPanelDock>{panel}</CustomerPanelDock>}
    </div>
  );
}

function Segmented<T extends number>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-[4px] border border-[var(--border)]">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`h-7 px-2.5 text-[11px] ${o.value === value ? 'bg-[var(--fg)] font-bold text-[var(--bg)]' : 'text-[var(--fg)] hover:bg-[var(--bg-subtle)]'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
