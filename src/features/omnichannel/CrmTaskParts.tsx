'use client';

import { useEffect, useState } from 'react';
import { AlarmClock, UserRound } from 'lucide-react';
import { crmApi, TASK_STATUS, type CrmTaskCreateInput, type CrmTaskDto } from '../../lib/api/customers';
import type { TeamCandidateDto } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { formatPanelDate, ghostButtonClass, inputClass, primaryButtonClass } from './CustomerPanelParts';

// Görev satırı ve görev formu — müşteri paneli ile Görevler sekmesi aynı parçaları kullanır.

interface FormProps {
  // Görevin bağlanacağı müşteri/konuşma; ikisi de boşsa genel görev.
  customerProfileId?: number;
  conversationId?: number;
  onCreated: (task: CrmTaskDto) => void;
  onCancel: () => void;
}

export function CrmTaskForm({ customerProfileId, conversationId, onCreated, onCancel }: FormProps) {
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assignee, setAssignee] = useState('');
  const [users, setUsers] = useState<TeamCandidateDto[]>([]);
  const [saving, setSaving] = useState(false);
  const { notify } = useFeedback();

  useEffect(() => {
    crmApi.assignees().then(setUsers).catch((e) => notify.error(describeError(e)));
  }, [notify]);

  const save = async () => {
    setSaving(true);
    try {
      const input: CrmTaskCreateInput = {
        title: title.trim(),
        customerProfileId: customerProfileId ?? null,
        conversationId: conversationId ?? null,
        assigneeUserId: assignee ? Number(assignee) : null,
        // datetime-local yerel saattir; sunucuya UTC gider.
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      };
      onCreated(await crmApi.createTask(input));
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-[4px] border border-[var(--border-soft)] p-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass}
        placeholder="Görev (ör. Yarın geri ara)" maxLength={200} autoFocus />
      <div className="grid grid-cols-2 gap-1.5">
        <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inputClass} title="Tarih (hatırlatma)" />
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputClass} title="Atanan">
          <option value="">Bana ata</option>
          {users.map((u) => <option key={u.userId} value={u.userId}>{u.displayName}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-1.5">
        <button type="button" className={ghostButtonClass} onClick={onCancel}>İptal</button>
        <button type="button" className={primaryButtonClass} disabled={saving || !title.trim()} onClick={() => void save()}>
          Görev oluştur
        </button>
      </div>
    </div>
  );
}

interface RowProps {
  task: CrmTaskDto;
  showCustomer?: boolean;
  onOpenCustomer?: (profileId: number) => void;
  onChanged: (task: CrmTaskDto) => void;
}

export function CrmTaskRow({ task, showCustomer = false, onOpenCustomer, onChanged }: RowProps) {
  const { notify } = useFeedback();
  const done = task.status === TASK_STATUS.Done;
  const overdue = !done && task.dueAt !== null && new Date(task.dueAt) < new Date();

  const toggle = async () => {
    try {
      onChanged(await crmApi.updateTask(task.id, { status: done ? TASK_STATUS.Open : TASK_STATUS.Done }));
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return (
    <li className="flex items-start gap-2 text-xs">
      <input type="checkbox" checked={done} onChange={() => void toggle()} className="mt-0.5" title={done ? 'Yeniden aç' : 'Tamamlandı'} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`break-words ${done ? 'text-[var(--fg-muted)] line-through' : 'text-[var(--fg)]'}`}>{task.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 text-[10.5px] text-[var(--fg-muted)]">
          {task.dueAt && (
            <span className={`inline-flex items-center gap-0.5 ${overdue ? 'font-semibold text-rose-500' : ''}`}>
              <AlarmClock size={11} /> {formatPanelDate(task.dueAt, true)}
            </span>
          )}
          <span className="inline-flex items-center gap-0.5"><UserRound size={11} /> {task.assigneeName ?? `#${task.assigneeUserId}`}</span>
          {showCustomer && task.customerProfileId && (
            <button type="button" className="hover:underline" onClick={() => onOpenCustomer?.(task.customerProfileId!)}>
              {task.customerName ?? 'Müşteri'}
            </button>
          )}
        </span>
      </div>
    </li>
  );
}
