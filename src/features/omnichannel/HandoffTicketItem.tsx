'use client';

import { useState } from 'react';
import { AlertTriangle, Car, CheckCircle2, ChevronDown, Clock, Hand, History, MessageSquare, Package } from 'lucide-react';
import type { AssignmentAgentDto } from '../../lib/api/assignments';
import { HANDOFF_REASON_LABELS, type HandoffTicketDto } from '../../lib/api/handoff';
import { badgeBase, badgeTone, focusRing, motionFast, surfaceCard } from '../shared/design';
import { channelTypeMeta } from './shared';
import { HandoffAssigneePanel } from './HandoffAssigneePanel';
import { HandoffPriorityBadge } from './HandoffPriorityBadge';
import { HandoffSummarySections } from './HandoffSummarySections';
import { HandoffTimeline } from './HandoffTimeline';
import { SlaBadge } from './SlaBadge';
import { handoffActions, statusLabel, statusTone, waitingLabel } from './handoffRules';

interface Props {
  ticket: HandoffTicketDto;
  agents: AssignmentAgentDto[];
  myId: number | null;
  now: number;
  selected: boolean;
  busy: boolean;
  onToggleSelected: () => void;
  onOpen?: (conversationId: number) => void;
  onTakeOver: () => void;
  onAssign: (assigneeUserId: number | null) => void;
  onResolve: () => void;
}

const ACTION_CLASS =
  `inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-ui-sm font-semibold text-fg hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40 ${motionFast} ${focusRing}`;
const PRIMARY_ACTION_CLASS =
  `inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-fg px-3 text-ui-sm font-semibold text-bg hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 ${motionFast} ${focusRing}`;
const STATUS_CHIP_CLASS = 'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-ui-xs font-semibold leading-none';

// Devirler listesindeki tek kayıt. Üstte kim (müşteri), nereden, hangi talep, durum; solda özet (İstek / Yapılan /
// Açık kalan), sağda büyük sorumlu kutusu ve atama; altta Üstlen / Sonuçlandır / zaman çizelgesi. Telefonda alt alta.
export function HandoffTicketItem({
  ticket, agents, myId, now, selected, busy, onToggleSelected, onOpen, onTakeOver, onAssign, onResolve,
}: Props) {
  const [timelineOpen, setTimelineOpen] = useState(false);
  const meta = channelTypeMeta(ticket.channelType);
  const actions = handoffActions(ticket, myId);
  const unassigned = ticket.assigneeUserId === null;

  return (
    <article className={`${surfaceCard} flex min-w-0 flex-col gap-4 p-4 sm:p-5 ${ticket.isUrgent ? 'border-danger/40' : ''}`}>
      <header className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {actions.canResolve && (
            <input type="checkbox" checked={selected} onChange={onToggleSelected} aria-label="Seç"
              className="size-4 shrink-0 cursor-pointer accent-[var(--fg)]" />
          )}
          {ticket.isUrgent && <AlertTriangle size={16} className="shrink-0 text-danger" aria-label="Acil" />}
          <button type="button" disabled={!onOpen} onClick={() => onOpen?.(ticket.conversationId)}
            className={`min-w-0 max-w-full truncate rounded text-left text-ui-lg font-bold text-fg enabled:hover:underline ${focusRing}`}>
            {ticket.customerName ?? 'İsimsiz müşteri'}
          </button>
          {ticket.ticketCode && <span className="font-mono text-ui-sm tabular-nums text-fg-muted">{ticket.ticketCode}</span>}
          <span className={`${STATUS_CHIP_CLASS} ${badgeTone[statusTone(ticket.status)]}`}>{statusLabel(ticket)}</span>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-ui-sm text-fg-muted">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <meta.Icon size={15} color={meta.color} />
            <span className="truncate">{ticket.channelName}</span>
            {ticket.country && <span className="font-semibold text-fg-subtle">{ticket.country}</span>}
          </span>
          <HandoffPriorityBadge ticket={ticket} />
          <span className={`${badgeBase} ${badgeTone.neutral}`}>{HANDOFF_REASON_LABELS[ticket.reason] ?? 'Devir'}</span>
          <span className="inline-flex items-center gap-1 tabular-nums" title="Devirden bu yana geçen süre">
            <Clock size={13} aria-hidden /> {waitingLabel(ticket.createdAt, now)} bekliyor
          </span>
          <SlaBadge dueAt={ticket.slaDueAt} breachedAt={ticket.slaBreachedAt} now={now} />
        </div>
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-3">
          <HandoffSummarySections summary={ticket.summary} />
          <HandoffContext ticket={ticket} />
        </div>
        <HandoffAssigneePanel assigneeUserId={ticket.assigneeUserId} assigneeName={ticket.assigneeName} agents={agents}
          canAssign={actions.canResolve} busy={busy} onAssign={onAssign} />
      </div>

      <footer className="flex flex-wrap items-center gap-2">
        {actions.canTakeOver && (
          <button type="button" className={unassigned ? PRIMARY_ACTION_CLASS : ACTION_CLASS} disabled={busy} onClick={onTakeOver}>
            <Hand size={15} aria-hidden /> Üstlen
          </button>
        )}
        {actions.canResolve && (
          <button type="button" className={ACTION_CLASS} disabled={busy} onClick={onResolve}>
            <CheckCircle2 size={15} aria-hidden /> Sonuçlandır
          </button>
        )}
        <button type="button" className={`${ACTION_CLASS} sm:ml-auto`} aria-expanded={timelineOpen}
          onClick={() => setTimelineOpen((open) => !open)}>
          <History size={15} aria-hidden /> Zaman çizelgesi
          <ChevronDown size={14} aria-hidden className={`${motionFast} ${timelineOpen ? 'rotate-180' : ''}`} />
        </button>
      </footer>

      {timelineOpen && <HandoffTimeline ticketId={ticket.id} />}
    </article>
  );
}

// Özete eşlik eden bağlam: son müşteri mesajı, algılanan araç ve ürün.
function HandoffContext({ ticket }: { ticket: HandoffTicketDto }) {
  if (!ticket.lastMessagePreview && !ticket.detectedVehicle && !ticket.requestedProduct) return null;

  return (
    <div className="flex min-w-0 flex-col gap-1.5 border-t border-border-soft pt-3 text-ui-sm text-fg-muted">
      {ticket.lastMessagePreview && (
        <p className="m-0 flex min-w-0 items-start gap-1.5">
          <MessageSquare size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span className="min-w-0 truncate"><span className="font-semibold">Son mesaj:</span> {ticket.lastMessagePreview}</span>
        </p>
      )}
      {(ticket.detectedVehicle || ticket.requestedProduct) && (
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
          {ticket.detectedVehicle && <span className="inline-flex items-center gap-1.5"><Car size={14} aria-hidden /> {ticket.detectedVehicle}</span>}
          {ticket.requestedProduct && <span className="inline-flex items-center gap-1.5"><Package size={14} aria-hidden /> {ticket.requestedProduct}</span>}
        </div>
      )}
    </div>
  );
}
