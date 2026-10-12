'use client';

import type { AssignmentAgentDto } from '../../lib/api/assignments';
import { focusRing, motionFast } from '../shared/design';
import { AgentAvatar } from './AgentAvatar';

interface Props {
  assigneeUserId: number | null;
  assigneeName: string | null;
  // Atanabilir temsilciler; boşsa (eski backend) seçici gizlenir.
  agents: AssignmentAgentDto[];
  canAssign: boolean;
  busy: boolean;
  onAssign: (assigneeUserId: number | null) => void;
}

const UNASSIGN_VALUE = 'none';

// Devrin sorumlusu: büyük avatar + ad. Atanmamışsa uyarı tonunda "Atanmamış" ve hemen yanında atama seçicisi.
export function HandoffAssigneePanel({ assigneeUserId, assigneeName, agents, canAssign, busy, onAssign }: Props) {
  const unassigned = assigneeUserId === null;

  return (
    <div className={`flex min-w-0 flex-col gap-2 rounded-xl border p-3 ${
      unassigned ? 'border-warning/30 bg-warning-soft/40' : 'border-border-soft bg-bg-subtle/60'}`}>
      <span className="text-ui-2xs font-semibold uppercase tracking-wide text-fg-subtle">Sorumlu</span>
      <div className="flex min-w-0 items-center gap-3">
        <AgentAvatar name={unassigned ? null : (assigneeName ?? 'Temsilci')} />
        <span className={`min-w-0 flex-1 truncate text-ui-lg font-semibold ${unassigned ? 'text-warning' : 'text-fg'}`}>
          {unassigned ? 'Atanmamış' : (assigneeName ?? 'Temsilci')}
        </span>
      </div>
      {canAssign && agents.length > 0 && (
        <select aria-label={unassigned ? 'Temsilciye ata' : 'Yeniden ata'} disabled={busy} value=""
          onChange={(e) => { if (e.target.value) onAssign(e.target.value === UNASSIGN_VALUE ? null : Number(e.target.value)); }}
          className={`h-9 w-full min-w-0 rounded-lg border border-border bg-card px-2 text-ui-sm text-fg disabled:opacity-40 ${motionFast} ${focusRing}`}>
          <option value="">{unassigned ? 'Temsilciye ata…' : 'Yeniden ata…'}</option>
          {!unassigned && <option value={UNASSIGN_VALUE}>Kuyruğa geri al</option>}
          {agents.filter((agent) => agent.userId !== assigneeUserId).map((agent) => (
            <option key={agent.userId} value={agent.userId}>{agent.name}{agent.isOnDuty ? '' : ' (nöbet dışı)'}</option>
          ))}
        </select>
      )}
    </div>
  );
}
