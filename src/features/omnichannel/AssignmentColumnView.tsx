'use client';

import { useDroppable } from '@dnd-kit/core';
import type { AssignmentCardDto } from '../../lib/api/assignments';
import { focusRing, motionFast } from '../shared/design';
import { AssignmentCardView } from './AssignmentCardView';
import { loadLabel, type BoardColumn } from './assignmentBoardRules';
import { formatMinutes } from './handoffRules';

interface Props {
  column: BoardColumn;
  now: number;
  isMobile: boolean;
  dragging: AssignmentCardDto | null;
  // Nöbet anahtarını değiştirebilir mi (kendi sütunu ya da yönetici).
  canToggleDuty: boolean;
  busy: boolean;
  onToggleDuty: (userId: number, onDuty: boolean) => void;
  onOpen: (conversationId: number) => void;
}

const SECONDS_PER_MINUTE = 60;

// Pano sütunu: temsilci (nöbet, yük/sınır, bugünkü ortalama ilk cevap) ya da Atanmamış / Bot sütunu.
export function AssignmentColumnView({ column, now, isMobile, dragging, canToggleDuty, busy, onToggleDuty, onOpen }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  const { agent } = column;
  const load = agent ? loadLabel(agent) : null;

  return (
    <div className={isMobile ? 'flex w-full shrink-0 snap-center p-3' : 'flex shrink-0'}>
      <section ref={setNodeRef} aria-label={column.title}
        className={`flex min-h-0 flex-col rounded-2xl border bg-bg-subtle/60 ${isMobile ? 'w-full' : 'w-[290px]'} ${motionFast} ${
          dragging && isOver ? 'border-fg/50 ring-2 ring-fg/15' : dragging ? 'border-dashed border-fg-subtle' : 'border-border-soft'}`}>
        <header className="flex flex-col gap-1 px-4 pb-2 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            {agent && (
              <span aria-hidden className={`size-2 shrink-0 rounded-full ${agent.isOnDuty ? 'bg-success' : 'bg-fg-subtle'}`} />
            )}
            <h3 className="m-0 min-w-0 flex-1 truncate text-ui-sm font-bold text-fg">{column.title}</h3>
            <span className={`rounded-full bg-card px-2 py-0.5 text-ui-xs font-semibold tabular-nums shadow-[var(--shadow-xs)] ${
              load?.full ? 'text-danger' : 'text-fg-muted'}`} title={load ? 'Açık konuşma / sınır' : undefined}>
              {load ? load.text : column.cards.length}
            </span>
          </div>
          {agent && (
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-ui-2xs text-fg-muted">
              <label className={`inline-flex items-center gap-1 ${canToggleDuty ? 'cursor-pointer' : ''}`}>
                <input type="checkbox" checked={agent.isOnDuty} disabled={!canToggleDuty || busy}
                  onChange={(e) => onToggleDuty(agent.userId, e.target.checked)}
                  className={`size-3.5 accent-[var(--fg)] ${focusRing}`} />
                Nöbette
              </label>
              {agent.avgFirstResponseSecondsToday !== null && (
                <span title="Bugün ilk cevap ortalaması">⌀ {formatMinutes(agent.avgFirstResponseSecondsToday / SECONDS_PER_MINUTE)}</span>
              )}
              {!agent.isTeamMember && <span>Ekip dışı</span>}
            </div>
          )}
        </header>
        <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
          {column.cards.length === 0 && <p className="m-0 py-6 text-center text-ui-xs text-fg-subtle">Boş</p>}
          {column.cards.map((card) => (
            <AssignmentCardView key={card.conversationId} card={card} now={now} dragDisabled={isMobile} onOpen={onOpen} />
          ))}
        </div>
      </section>
    </div>
  );
}
