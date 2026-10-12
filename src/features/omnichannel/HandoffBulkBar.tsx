'use client';

import { CheckCircle2, UserPlus, X } from 'lucide-react';
import type { AssignmentAgentDto } from '../../lib/api/assignments';
import { focusRing, motionFast, surfaceCard } from '../shared/design';

interface Props {
  count: number;
  agents: AssignmentAgentDto[];
  busy: boolean;
  onAssign: (assigneeUserId: number | null) => void;
  onResolve: () => void;
  onClear: () => void;
}

const UNASSIGN_VALUE = 'none';

// Seçili devirler için toplu işlem çubuğu (atama, sonuçlandırma). Seçim yokken görünmez.
export function HandoffBulkBar({ count, agents, busy, onAssign, onResolve, onClear }: Props) {
  if (count === 0) return null;

  return (
    <div role="toolbar" aria-label="Toplu işlemler"
      className={`${surfaceCard} sticky top-0 z-10 flex min-w-0 flex-wrap items-center gap-2 px-3 py-2`}>
      <span className="text-ui-sm font-semibold text-fg">{count} devir seçili</span>
      {agents.length > 0 && (
        <label className="inline-flex items-center gap-1.5 text-ui-xs text-fg-muted">
          <UserPlus size={13} aria-hidden />
          <select aria-label="Seçilenleri ata" disabled={busy} value=""
            onChange={(e) => { if (e.target.value) onAssign(e.target.value === UNASSIGN_VALUE ? null : Number(e.target.value)); }}
            className={`h-8 rounded-lg border border-border bg-card px-2 text-ui-xs text-fg ${focusRing}`}>
            <option value="">Ata…</option>
            <option value={UNASSIGN_VALUE}>Kuyruğa geri al</option>
            {agents.map((agent) => <option key={agent.userId} value={agent.userId}>{agent.name}</option>)}
          </select>
        </label>
      )}
      <button type="button" disabled={busy} onClick={onResolve}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-fg px-3 text-ui-xs font-semibold text-bg hover:opacity-85 disabled:opacity-40 ${motionFast} ${focusRing}`}>
        <CheckCircle2 size={13} aria-hidden /> Sonuçlandır
      </button>
      <button type="button" onClick={onClear} aria-label="Seçimi temizle"
        className={`ml-auto flex size-8 items-center justify-center rounded-lg text-fg-muted hover:bg-bg-subtle ${motionFast} ${focusRing}`}>
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
