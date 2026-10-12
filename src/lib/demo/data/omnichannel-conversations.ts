// Gelen kutusu konuşmaları (oturum içi bellekte): senaryolardan üretilir, mesaj gönderme/atama burada değişir.
import type { ConversationSummaryDto, MessageDto } from '../../api/omnichannel';
import { sessionGet } from '../session-store';
import {
  CHANNEL_KIND, DEMO_AGENTS, DEMO_CONTACTS, DEMO_USER_ID, agentName, channelById, type DemoContact,
} from './omnichannel-core';
import {
  PRODUCT_VIEWS, SCRIPTS, STAGE, TR_VEHICLES, UK_VEHICLES, type Script, type ScriptContext, type Turn,
} from './omnichannel-scripts';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const WHATSAPP_WINDOW_HOURS = 24;
const HUMAN_AGENT_WINDOW_DAYS = 7;
const PREVIEW_MAX_LENGTH = 90;
const BOT_REPLY_DELAY_MS = 20_000;
const AGENT_REPLY_GAP_MS = 5 * MS_PER_MINUTE;
const CUSTOMER_GAP_MS = 4 * MS_PER_MINUTE;

/** Botun temsilciye soru açtığı (danışma bekleyen) demo konuşması. */
export const CONSULT_CONVERSATION_ID = 14;

const SENDER = { Contact: 0, Agent: 1, Bot: 2 } as const;
const DELIVERY = { Sent: 1, Delivered: 2, Read: 3 } as const;
const STATE = { WaitingCustomer: 1, CollectingInfo: 2, HumanHandoff: 5, Closed: 6 } as const;
const STATUS_OPEN = 0;
/** Atanmış konuşmalar bu temsilciler arasında dönüşümlü dağıtılır; demo kullanıcı sık görünür. */
const ASSIGNEE_CYCLE = [DEMO_USER_ID, 2, DEMO_USER_ID, 3, 4];

export interface ConversationRecord {
  summary: ConversationSummaryDto;
  messages: MessageDto[];
  script: Script;
  ctx: ScriptContext;
  productId: number;
  /** Konuşmadaki son müşteri mesajı (WhatsApp pencere hesabı için). */
  lastCustomerAt: string | null;
}

interface Spec { contact: number; channel: number; script: string; minutes: number; product: number; vehicle: number }

const SPECS: Spec[] = [
  { contact: 0, channel: 1, script: 'collecting', minutes: 4, product: 0, vehicle: 0 },
  { contact: 1, channel: 1, script: 'stock', minutes: 12, product: 2, vehicle: 1 },
  { contact: 2, channel: 1, script: 'complaintOpen', minutes: 7, product: 5, vehicle: 2 },
  { contact: 3, channel: 3, script: 'igPrice', minutes: 25, product: 3, vehicle: 3 },
  { contact: 4, channel: 1, script: 'confirm', minutes: 38, product: 1, vehicle: 4 },
  { contact: 5, channel: 1, script: 'payment', minutes: 55, product: 9, vehicle: 5 },
  { contact: 6, channel: 1, script: 'shipping', minutes: 80, product: 6, vehicle: 6 },
  { contact: 7, channel: 5, script: 'emailWholesale', minutes: 95, product: 12, vehicle: 7 },
  { contact: 8, channel: 1, script: 'fitment', minutes: 120, product: 6, vehicle: 1 },
  { contact: 9, channel: 1, script: 'wholesale', minutes: 22, product: 0, vehicle: 0 },
  { contact: 10, channel: 1, script: 'returnRequest', minutes: 150, product: 8, vehicle: 2 },
  { contact: 11, channel: 3, script: 'photo', minutes: 180, product: 4, vehicle: 4 },
  { contact: 12, channel: 1, script: 'complaintHandled', minutes: 210, product: 10, vehicle: 5 },
  { contact: 13, channel: 1, script: 'outOfStock', minutes: 260, product: 9, vehicle: 3 },
  { contact: 14, channel: 4, script: 'stock', minutes: 300, product: 13, vehicle: 6 },
  { contact: 15, channel: 1, script: 'invoice', minutes: 420, product: 15, vehicle: 7 },
  { contact: 16, channel: 1, script: 'thanks', minutes: 600, product: 7, vehicle: 0 },
  { contact: 17, channel: 5, script: 'emailQuestion', minutes: 700, product: 1, vehicle: 1 },
  { contact: 18, channel: 1, script: 'dormant', minutes: 3000, product: 11, vehicle: 2 },
  { contact: 19, channel: 3, script: 'stock', minutes: 800, product: 14, vehicle: 3 },
  { contact: 20, channel: 1, script: 'collecting', minutes: 40, product: 16, vehicle: 4 },
  { contact: 21, channel: 1, script: 'shipping', minutes: 1500, product: 17, vehicle: 5 },
  { contact: 22, channel: 4, script: 'igPrice', minutes: 900, product: 18, vehicle: 6 },
  { contact: 23, channel: 1, script: 'payment', minutes: 1000, product: 19, vehicle: 7 },
  { contact: 24, channel: 1, script: 'fitment', minutes: 1300, product: 6, vehicle: 0 },
  { contact: 25, channel: 1, script: 'dormant', minutes: 4000, product: 20, vehicle: 1 },
  { contact: 26, channel: 5, script: 'emailQuestion', minutes: 1700, product: 21, vehicle: 2 },
  { contact: 27, channel: 1, script: 'thanks', minutes: 2000, product: 22, vehicle: 3 },
  { contact: 28, channel: 2, script: 'enStock', minutes: 9, product: 0, vehicle: 0 },
  { contact: 29, channel: 2, script: 'enDelivery', minutes: 70, product: 1, vehicle: 1 },
  { contact: 30, channel: 2, script: 'enReturn', minutes: 190, product: 2, vehicle: 2 },
  { contact: 31, channel: 6, script: 'enEmailBulk', minutes: 330, product: 0, vehicle: 3 },
  { contact: 32, channel: 2, script: 'enInvoice', minutes: 1200, product: 3, vehicle: 4 },
  { contact: 33, channel: 2, script: 'enComplaint', minutes: 28, product: 4, vehicle: 0 },
  { contact: 34, channel: 2, script: 'enFitment', minutes: 500, product: 10, vehicle: 1 },
  { contact: 35, channel: 2, script: 'enStock', minutes: 2600, product: 5, vehicle: 2 },
];

const formatTry = (value: number): string => `${value.toLocaleString('tr-TR')} TL`;
const formatGbp = (value: number): string => `£${value}`;
const orderNumber = (conversationId: number, country: 'TR' | 'UK'): string =>
  `${country === 'TR' ? 'EV' : 'DA'}-${10_400 + conversationId * 7}`;

function buildContext(spec: Spec, conversationId: number, contact: DemoContact): ScriptContext {
  const product = PRODUCT_VIEWS[spec.product];
  const isUk = contact.lang === 'en';
  const vehicles = isUk ? UK_VEHICLES : TR_VEHICLES;
  return {
    first: contact.name.split(' ')[0],
    full: contact.name,
    city: contact.city,
    productName: isUk ? product.nameEn : product.nameTr,
    sku: product.sku,
    price: isUk ? formatGbp(product.priceGbp) : formatTry(product.priceTry),
    vehicle: vehicles[spec.vehicle % vehicles.length],
    orderNo: orderNumber(conversationId, isUk ? 'UK' : 'TR'),
    country: isUk ? 'UK' : 'TR',
  };
}

function turnGapMs(turn: Turn): number {
  if (turn.who === 'bot') return BOT_REPLY_DELAY_MS;
  return turn.who === 'agent' ? AGENT_REPLY_GAP_MS : CUSTOMER_GAP_MS;
}

function buildMessages(conversationId: number, turns: Turn[], lastAtMs: number, firstId: number, agentId: number | null): MessageDto[] {
  const times: number[] = new Array<number>(turns.length);
  let cursor = lastAtMs;
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    times[index] = cursor;
    cursor -= turnGapMs(turns[index]);
  }
  return turns.map((turn, index): MessageDto => {
    const at = new Date(times[index]).toISOString();
    const isInbound = turn.who === 'customer';
    const isLastOutbound = !isInbound && index >= turns.length - 1;
    return {
      id: firstId + index,
      conversationId,
      direction: isInbound ? 0 : 1,
      senderType: isInbound ? SENDER.Contact : turn.who === 'bot' ? SENDER.Bot : SENDER.Agent,
      senderUserId: turn.who === 'agent' ? agentId : null,
      senderUserName: turn.who === 'agent' ? agentName(agentId) : null,
      contentType: 0,
      body: turn.text,
      deliveryStatus: isInbound ? DELIVERY.Read : isLastOutbound ? DELIVERY.Delivered : DELIVERY.Read,
      sentAt: at,
      deliveredAt: at,
      readAt: isLastOutbound ? null : at,
      failureReason: null,
      replyToMessageId: null,
      createdAt: at,
      attachments: [],
    };
  });
}

function stateOf(script: Script): number {
  if (script.stage === STAGE.Resolved) return STATE.Closed;
  if (script.stage === STAGE.Handoff || script.stage === STAGE.AwaitingAgent) return STATE.HumanHandoff;
  return script.stage === STAGE.OrderCollecting ? STATE.CollectingInfo : STATE.WaitingCustomer;
}

function trailingCustomerTurns(turns: Turn[]): number {
  let count = 0;
  for (let index = turns.length - 1; index >= 0 && turns[index].who === 'customer'; index -= 1) count += 1;
  return count;
}

function externalIdOf(contact: DemoContact, channelType: number, conversationId: number): string {
  if (channelType === CHANNEL_KIND.Email) return contact.email;
  if (channelType === CHANNEL_KIND.WhatsApp) return contact.phone.replace(/\s/g, '');
  return `17841400${String(conversationId).padStart(6, '0')}`;
}

function lastInboundIso(messages: MessageDto[]): string | null {
  const inbound = messages.filter((message) => message.direction === 0);
  return inbound.length > 0 ? inbound[inbound.length - 1].createdAt : null;
}

function buildRecord(spec: Spec, index: number, firstMessageId: number): ConversationRecord {
  const conversationId = index + 1;
  const contact = DEMO_CONTACTS[spec.contact];
  const channel = channelById(spec.channel);
  const script = SCRIPTS[spec.script];
  const ctx = buildContext(spec, conversationId, contact);
  const turns = script.turns(ctx);
  const agentId = script.assigned ? ASSIGNEE_CYCLE[index % ASSIGNEE_CYCLE.length] : null;
  const lastAtMs = Date.now() - spec.minutes * MS_PER_MINUTE;
  const messages = buildMessages(conversationId, turns, lastAtMs, firstMessageId, agentId);
  const lastInbound = lastInboundIso(messages);
  const isWhatsApp = channel.type === CHANNEL_KIND.WhatsApp;
  const isMeta = channel.type === CHANNEL_KIND.Instagram || channel.type === CHANNEL_KIND.Facebook;
  const unread = trailingCustomerTurns(turns);
  const lastMessage = messages[messages.length - 1];

  const summary: ConversationSummaryDto = {
    id: conversationId,
    channelId: channel.id,
    channelName: channel.displayName,
    channelType: channel.type,
    country: channel.country,
    contactId: spec.contact + 1,
    contactDisplayName: contact.name,
    contactExternalId: externalIdOf(contact, channel.type, conversationId),
    status: script.status as ConversationSummaryDto['status'],
    state: stateOf(script) as ConversationSummaryDto['state'],
    assignedUserId: agentId,
    isBotActive: script.botActive,
    pendingConsultation: conversationId === CONSULT_CONVERSATION_ID,
    isUrgent: script.urgent ?? false,
    topic: script.topic as ConversationSummaryDto['topic'],
    topicSetByUser: false,
    stage: script.stage as ConversationSummaryDto['stage'],
    stageChangedAt: lastMessage.createdAt,
    unreadCount: unread,
    lastMessageAt: lastMessage.createdAt,
    lastMessagePreview: (lastMessage.body ?? '').replace(/\s+/g, ' ').slice(0, PREVIEW_MAX_LENGTH),
    serviceWindowEndsAt: isWhatsApp && lastInbound ? new Date(Date.parse(lastInbound) + WHATSAPP_WINDOW_HOURS * MS_PER_HOUR).toISOString() : null,
    humanAgentWindowEndsAt: isMeta && lastInbound ? new Date(Date.parse(lastInbound) + HUMAN_AGENT_WINDOW_DAYS * 24 * MS_PER_HOUR).toISOString() : null,
    subject: script.subject ? script.subject(ctx) : null,
  };
  return { summary, messages, script, ctx, productId: PRODUCT_VIEWS[spec.product].id, lastCustomerAt: lastInbound };
}

function buildAll(): ConversationRecord[] {
  let nextMessageId = 1;
  return SPECS.map((spec, index) => {
    const record = buildRecord(spec, index, nextMessageId);
    nextMessageId += record.messages.length;
    return record;
  });
}

export function listRecords(): ConversationRecord[] {
  return sessionGet('omnichannel.conversations', buildAll);
}

export function recordById(conversationId: number): ConversationRecord | undefined {
  return listRecords().find((record) => record.summary.id === conversationId);
}

function nextMessageId(): number {
  return listRecords().reduce((max, record) => Math.max(max, ...record.messages.map((message) => message.id)), 0) + 1;
}

/** Temsilci mesajı ekler; konuşma temsilcinin üzerine alınır, bot susar. */
export function appendAgentMessage(conversationId: number, body: string): MessageDto | undefined {
  const record = recordById(conversationId);
  if (!record) return undefined;
  const now = new Date().toISOString();
  const message: MessageDto = {
    id: nextMessageId(),
    conversationId,
    direction: 1,
    senderType: SENDER.Agent,
    senderUserId: DEMO_USER_ID,
    senderUserName: agentName(DEMO_USER_ID),
    contentType: 0,
    body,
    deliveryStatus: DELIVERY.Delivered,
    sentAt: now,
    deliveredAt: now,
    readAt: null,
    failureReason: null,
    replyToMessageId: null,
    createdAt: now,
    attachments: [],
  };
  record.messages.push(message);
  Object.assign(record.summary, {
    lastMessageAt: now,
    lastMessagePreview: body.replace(/\s+/g, ' ').slice(0, PREVIEW_MAX_LENGTH),
    unreadCount: 0,
    isBotActive: false,
    assignedUserId: record.summary.assignedUserId ?? DEMO_USER_ID,
    status: STATUS_OPEN,
    stage: STAGE.AwaitingCustomer,
  });
  return message;
}

export function assigneeCandidates(): { userId: number; displayName: string }[] {
  return DEMO_AGENTS.map(({ userId, displayName }) => ({ userId, displayName }));
}
