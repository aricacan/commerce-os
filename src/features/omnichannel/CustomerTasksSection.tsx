'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { crmApi, TASK_SCOPE, type CrmTaskDto } from '../../lib/api/customers';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { EmptyLine, PanelSection, ghostButtonClass } from './CustomerPanelParts';
import { CrmTaskForm, CrmTaskRow } from './CrmTaskParts';

interface Props {
  profileId: number;
  conversationId?: number;
  readOnly: boolean;
}

// Bu müşterinin açık görevleri (herkesin). Tamamlanan görev üstü çizili kalır, panel
// yeniden açılınca listeden düşer.
export function CustomerTasksSection({ profileId, conversationId, readOnly }: Props) {
  const [tasks, setTasks] = useState<CrmTaskDto[]>([]);
  const [adding, setAdding] = useState(false);
  const { notify } = useFeedback();

  const load = useCallback(async () => {
    try {
      setTasks(await crmApi.tasks({ scope: TASK_SCOPE.All, customerProfileId: profileId }));
    } catch (e) {
      notify.error(describeError(e));
    }
  }, [profileId, notify]);

  useEffect(() => { void load(); }, [load]);

  return (
    <PanelSection title="Görevler" count={tasks.length}
      action={!readOnly && !adding && (
        <button type="button" className={ghostButtonClass} onClick={() => setAdding(true)}>
          <Plus size={12} /> Görev
        </button>
      )}>
      {adding && (
        <CrmTaskForm customerProfileId={profileId} conversationId={conversationId}
          onCancel={() => setAdding(false)}
          onCreated={(task) => { setTasks((prev) => [...prev, task]); setAdding(false); }} />
      )}
      {tasks.length === 0 && !adding && <EmptyLine>Açık görev yok.</EmptyLine>}
      <ul className="flex flex-col gap-2">
        {tasks.map((t) => (
          <CrmTaskRow key={t.id} task={t}
            onChanged={(updated) => setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))} />
        ))}
      </ul>
    </PanelSection>
  );
}
