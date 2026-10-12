'use client';

import { useState } from 'react';
import { AlertTriangle, Bot, Car, CheckCircle2, Hand, Hourglass, ListChecks, Package, type LucideIcon } from 'lucide-react';
import { HANDOFF_REASON_LABELS, HANDOFF_STATUS, type HandoffTicketDto } from '../../lib/api/handoff';
import { useAuthStore } from '../../stores/auth';
import { focusRing } from '../shared/design';
import { AgentAvatar } from './AgentAvatar';
import { formatPanelDate, ghostButtonClass } from './CustomerPanelParts';
import { HandoffPriorityBadge } from './HandoffPriorityBadge';
import { HandoffResolveDialog } from './HandoffResolveDialog';
import { HandoffSummarySections } from './HandoffSummarySections';
import { SlaBadge } from './SlaBadge';
import { handoffActions, statusLabel } from './handoffRules';
import { INFO_SECTION_CLASS, INFO_SECTION_HEADING_CLASS, INFO_SECTION_URGENT_CLASS } from './infoSectionStyle';
import type { HandoffTicketState } from './useHandoffTicket';
import { useNowTick } from './useNowTick';

interface Props {
  ticket: HandoffTicketDto;
  handoff: HandoffTicketState;
}

// "Ayrıntılar" panelindeki devir kartı: temsilci konuşmayı baştan okumadan devralabilsin diye botun bıraktığı özet,
// sebep, öncelik, araç/ürün ve denenen adımlar (Faz 5). FAZ 7: talep no, SLA geri sayımı, Üstlen (gerçek atama),
// "Müşteri bekleniyor" anahtarı ve sonuçlu kapanış.
export function HandoffCard({ ticket, handoff }: Props) {
  const myId = useAuthStore((state) => state.user?.id ?? null);
  const now = useNowTick();
  const [resolving, setResolving] = useState(false);
  const actions = handoffActions(ticket, myId);
  const waiting = ticket.status === HANDOFF_STATUS.WaitingCustomer;
  const unassigned = ticket.assigneeUserId === null;

  return (
    <section aria-label="Bot devretti" className={ticket.isUrgent ? INFO_SECTION_URGENT_CLASS : INFO_SECTION_CLASS}>
      <div className={INFO_SECTION_HEADING_CLASS}>
        {ticket.isUrgent
          ? <AlertTriangle size={14} className="shrink-0 text-danger" aria-hidden />
          : <Bot size={14} className="shrink-0 text-fg-muted" aria-hidden />}
        <h3 className="m-0 text-ui-sm font-bold text-fg">Bot devretti</h3>
        {ticket.ticketCode && <span className="text-ui-2xs tabular-nums text-fg-subtle">{ticket.ticketCode}</span>}
        <HandoffPriorityBadge ticket={ticket} />
        <span className="rounded-md bg-bg-subtle px-1.5 py-0.5 text-ui-2xs font-semibold text-fg-muted">
          {HANDOFF_REASON_LABELS[ticket.reason]}
        </span>
        <span className="ml-auto text-ui-2xs text-fg-muted">{formatPanelDate(ticket.createdAt, true)}</span>
      </div>

      <div className="flex min-w-0 items-center gap-2.5">
        <AgentAvatar name={unassigned ? null : (ticket.assigneeName ?? 'Temsilci')} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={`truncate text-ui-md font-semibold ${unassigned ? 'text-warning' : 'text-fg'}`}>
            {unassigned ? 'Atanmamış' : (ticket.assigneeName ?? 'Temsilci')}
          </span>
          <span className="text-ui-xs text-fg-muted">{statusLabel(ticket)}</span>
        </div>
        <SlaBadge dueAt={ticket.slaDueAt} breachedAt={ticket.slaBreachedAt} now={now} />
      </div>

      <HandoffSummarySections summary={ticket.summary} />

      <HandoffFacts ticket={ticket} />

      <div className="flex flex-wrap items-center gap-2">
        {actions.canTakeOver && (
          <button type="button" className={`${ghostButtonClass} ${focusRing}`} disabled={handoff.busy}
            onClick={() => void handoff.takeOver(ticket.id)}>
            <Hand size={12} aria-hidden /> Üstlen
          </button>
        )}
        {actions.canToggleWaiting && (
          <button type="button" className={`${ghostButtonClass} ${focusRing}`} disabled={handoff.busy} aria-pressed={waiting}
            onClick={() => void handoff.setWaiting(ticket.id, !waiting)}>
            <Hourglass size={12} aria-hidden /> {waiting ? 'Müşteri cevap verdi' : 'Müşteri bekleniyor'}
          </button>
        )}
        <button type="button" className={`${ghostButtonClass} ${focusRing}`} disabled={handoff.busy}
          onClick={() => setResolving(true)}>
          <CheckCircle2 size={12} aria-hidden /> Sonuçlandır
        </button>
      </div>

      {resolving && (
        <HandoffResolveDialog count={1} busy={handoff.busy} onClose={() => setResolving(false)}
          onConfirm={(outcome, note) => {
            void handoff.resolve(ticket.id, outcome, note).then((done) => { if (done) setResolving(false); });
          }} />
      )}
    </section>
  );
}

function HandoffFacts({ ticket }: { ticket: HandoffTicketDto }) {
  if (!ticket.detectedVehicle && !ticket.requestedProduct && !ticket.botActionsTried) return null;

  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-ui-xs text-fg-muted">
      {ticket.detectedVehicle && <Fact Icon={Car} label="Araç">{ticket.detectedVehicle}</Fact>}
      {ticket.requestedProduct && <Fact Icon={Package} label="Ürün">{ticket.requestedProduct}</Fact>}
      {ticket.botActionsTried && <Fact Icon={ListChecks} label="Botun denediği">{ticket.botActionsTried}</Fact>}
    </ul>
  );
}

function Fact({ Icon, label, children }: { Icon: LucideIcon; label: string; children: string }) {
  return (
    <li className="flex min-w-0 items-start gap-1.5">
      <Icon size={12} className="mt-0.5 shrink-0" aria-hidden />
      <span className="min-w-0 break-words">
        <span className="font-semibold">{label}:</span> {children}
      </span>
    </li>
  );
}
