// Devir kayıtları (handoff ticket): konuşma senaryolarından türer; atama/üstlenme/çözme oturum içinde değişir.
import type { HandoffLevel, HandoffOutcome, HandoffStatus, HandoffTicketDto, HandoffTimelineEventDto } from '../../api/handoff';
import { sessionGet } from '../session-store';
import { listRecords, recordById, type ConversationRecord } from './omnichannel-conversations';
import { DEMO_USER_ID, agentName } from './omnichannel-core';
import { STAGE, STATUS } from './omnichannel-scripts';

const MS_PER_MINUTE = 60_000;
const SLA_MINUTES = 30;
const FIRST_TICKET_ID = 101;
const SCORE_URGENT = 85;
const SCORE_STANDARD = 55;
const SCORE_LOW = 30;
const LEVEL_P1_MIN = 70;
const LEVEL_P2_MIN = 45;
const SUMMARY_FALLBACK = 'Müşteri talebi temsilciye aktarıldı.';

const STATUS_OPEN: HandoffStatus = 0;
const STATUS_IN_PROGRESS: HandoffStatus = 1;
const STATUS_WAITING_CUSTOMER: HandoffStatus = 2;
const STATUS_RESOLVED: HandoffStatus = 3;
const STATUS_ASSIGNED: HandoffStatus = 4;
const OUTCOME_SOLVED: HandoffOutcome = 0;
const OUTCOME_RETURNED: HandoffOutcome = 1;

const EVENT = { Created: 0, StatusChanged: 1, Assigned: 2, Resolved: 4 } as const;

interface TicketState { ticket: HandoffTicketDto; events: HandoffTimelineEventDto[] }

const levelOf = (score: number): HandoffLevel => (score >= LEVEL_P1_MIN ? 'P1' : score >= LEVEL_P2_MIN ? 'P2' : 'P3');

function scoreOf(record: ConversationRecord): number {
  if (record.summary.isUrgent) return SCORE_URGENT;
  return record.script.handoff?.reason === 3 ? SCORE_LOW : SCORE_STANDARD;
}

function statusOf(record: ConversationRecord): HandoffStatus {
  if (record.summary.status === STATUS.Resolved) return STATUS_RESOLVED;
  if (record.summary.assignedUserId === null) return STATUS_OPEN;
  return record.summary.stage === STAGE.AwaitingCustomer ? STATUS_IN_PROGRESS : STATUS_ASSIGNED;
}

function buildTicket(record: ConversationRecord, id: number): TicketState {
  const { summary, script, messages } = record;
  const createdAt = messages[Math.min(1, messages.length - 1)].createdAt;
  const status = statusOf(record);
  const score = scoreOf(record);
  const slaDueAt = new Date(Date.parse(createdAt) + SLA_MINUTES * MS_PER_MINUTE).toISOString();
  const isOpenUnassigned = status === STATUS_OPEN;
  const slaBreached = isOpenUnassigned && Date.parse(slaDueAt) < Date.now();
  const assigneeId = summary.assignedUserId;
  const ticket: HandoffTicketDto = {
    id,
    conversationId: summary.id,
    customerProfileId: summary.contactId,
    customerName: summary.contactDisplayName,
    channelName: summary.channelName,
    channelType: summary.channelType,
    reason: (script.handoff?.reason ?? 7) as HandoffTicketDto['reason'],
    summary: script.handoff?.summary ?? SUMMARY_FALLBACK,
    detectedVehicle: record.ctx.vehicle,
    requestedProduct: record.ctx.productName,
    botActionsTried: 'Katalog araması, stok kontrolü',
    status,
    isUrgent: summary.isUrgent,
    assigneeUserId: assigneeId,
    assigneeName: agentName(assigneeId),
    createdAt,
    resolvedAt: status === STATUS_RESOLVED ? summary.lastMessageAt : null,
    resolutionNote: status === STATUS_RESOLVED ? 'Müşteri bilgilendirildi, talep tamamlandı.' : null,
    score,
    level: levelOf(score),
    scoreBreakdown: summary.isUrgent ? 'Şikâyet +40, acil işaret +30, bekleme +15' : 'Temsilci talebi +35, bekleme +20',
    ticketCode: `T-${String(id).padStart(4, '0')}`,
    resolutionOutcome: status === STATUS_RESOLVED ? OUTCOME_SOLVED : null,
    channelId: summary.channelId,
    country: summary.country ?? null,
    assignedAt: assigneeId === null ? null : messages[Math.min(2, messages.length - 1)].createdAt,
    firstAgentReplyAt: messages.find((message) => message.senderType === 1)?.createdAt ?? null,
    customerNoticeSentAt: createdAt,
    slaDueAt,
    slaBreachedAt: slaBreached ? slaDueAt : null,
    lastMessagePreview: summary.lastMessagePreview,
    lastInboundAt: record.lastCustomerAt,
    isBotActive: summary.isBotActive,
  };
  const events: HandoffTimelineEventDto[] = [
    { id: id * 10, type: EVENT.Created, fromStatus: null, toStatus: STATUS_OPEN, actorUserId: null, actorName: 'Bot', assigneeUserId: null, assigneeName: null, note: script.handoff?.summary ?? null, at: createdAt },
  ];
  if (assigneeId !== null) {
    events.push({ id: id * 10 + 1, type: EVENT.Assigned, fromStatus: STATUS_OPEN, toStatus: STATUS_ASSIGNED, actorUserId: DEMO_USER_ID, actorName: agentName(DEMO_USER_ID), assigneeUserId: assigneeId, assigneeName: agentName(assigneeId), note: null, at: ticket.assignedAt ?? createdAt });
  }
  return { ticket, events };
}

function buildAll(): TicketState[] {
  const sources = listRecords().filter((record) => record.script.handoff || record.script.key === 'invoice' || record.script.key === 'enInvoice');
  return sources.map((record, index) => buildTicket(record, FIRST_TICKET_ID + index));
}

function states(): TicketState[] {
  return sessionGet('omnichannel.tickets', buildAll);
}

export function listTickets(): HandoffTicketDto[] {
  return states().map((state) => state.ticket);
}

export function ticketById(ticketId: number): HandoffTicketDto | undefined {
  return states().find((state) => state.ticket.id === ticketId)?.ticket;
}

export function ticketForConversation(conversationId: number): HandoffTicketDto | null {
  const open = listTickets().find((ticket) => ticket.conversationId === conversationId && ticket.status !== STATUS_RESOLVED);
  return open ?? null;
}

export function ticketTimeline(ticketId: number): HandoffTimelineEventDto[] {
  return states().find((state) => state.ticket.id === ticketId)?.events ?? [];
}

function pushEvent(ticketId: number, event: Omit<HandoffTimelineEventDto, 'id' | 'at'>): void {
  const state = states().find((entry) => entry.ticket.id === ticketId);
  state?.events.push({ ...event, id: ticketId * 10 + state.events.length, at: new Date().toISOString() });
}

/** Devri atar (null = kuyruğa geri) ve konuşmayı da aynı temsilciye bağlar. */
export function assignTicket(ticketId: number, userId: number | null): HandoffTicketDto | undefined {
  const ticket = ticketById(ticketId);
  if (!ticket) return undefined;
  const now = new Date().toISOString();
  Object.assign(ticket, {
    assigneeUserId: userId,
    assigneeName: agentName(userId),
    status: userId === null ? STATUS_OPEN : STATUS_ASSIGNED,
    assignedAt: userId === null ? null : now,
  });
  const conversation = recordById(ticket.conversationId);
  if (conversation) Object.assign(conversation.summary, { assignedUserId: userId, isBotActive: false });
  pushEvent(ticketId, {
    type: EVENT.Assigned, fromStatus: STATUS_OPEN, toStatus: ticket.status, actorUserId: DEMO_USER_ID,
    actorName: agentName(DEMO_USER_ID), assigneeUserId: userId, assigneeName: agentName(userId), note: null,
  });
  return ticket;
}

export function setTicketWaiting(ticketId: number, waiting: boolean): HandoffTicketDto | undefined {
  const ticket = ticketById(ticketId);
  if (!ticket) return undefined;
  ticket.status = waiting ? STATUS_WAITING_CUSTOMER : STATUS_IN_PROGRESS;
  pushEvent(ticketId, {
    type: EVENT.StatusChanged, fromStatus: STATUS_IN_PROGRESS, toStatus: ticket.status, actorUserId: DEMO_USER_ID,
    actorName: agentName(DEMO_USER_ID), assigneeUserId: ticket.assigneeUserId, assigneeName: ticket.assigneeName, note: null,
  });
  return ticket;
}

export function resolveTicket(ticketId: number, outcome: HandoffOutcome, note: string | null): HandoffTicketDto | undefined {
  const ticket = ticketById(ticketId);
  if (!ticket) return undefined;
  const now = new Date().toISOString();
  Object.assign(ticket, { status: STATUS_RESOLVED, resolvedAt: now, resolutionOutcome: outcome, resolutionNote: note });
  const conversation = recordById(ticket.conversationId);
  if (conversation) {
    Object.assign(conversation.summary, {
      status: STATUS.Resolved, stage: STAGE.Resolved, isBotActive: outcome === OUTCOME_RETURNED,
    });
  }
  pushEvent(ticketId, {
    type: EVENT.Resolved, fromStatus: STATUS_IN_PROGRESS, toStatus: STATUS_RESOLVED, actorUserId: DEMO_USER_ID,
    actorName: agentName(DEMO_USER_ID), assigneeUserId: ticket.assigneeUserId, assigneeName: ticket.assigneeName, note,
  });
  return ticket;
}
