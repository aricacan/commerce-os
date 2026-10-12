// Gelen kutusu: kanallar, konuşma listesi/sayaçlar/pano, mesajlar ve konuşma yan paneli uçları.
import type {
  AssigneeDto, BoardColumnDto, ConversationContextDto, ConversationDigestDto, ConversationSummaryDto, InboxChannelDto,
  InboxCountsDto, MessageDto, SendableTemplateDto, CannedReplyDto,
} from '../../api/omnichannel';
import type { AgentConsultationDto } from '../../api/omnichannel-consult';
import type { FollowUpTaskDto } from '../../api/omnichannel-follow-ups';
import type { ConversationInstructionDto } from '../../api/omnichannel-instructions';
import type { BotTracePageDto } from '../../api/omnichannel-eval';
import {
  CONSULT_CONVERSATION_ID, appendAgentMessage, assigneeCandidates, listRecords, recordById, type ConversationRecord,
} from '../data/omnichannel-conversations';
import { DEMO_CHANNELS, DEMO_USER_ID } from '../data/omnichannel-core';
import { PRODUCT_VIEWS, STAGE } from '../data/omnichannel-scripts';
import { ago } from '../seed';
import { get, post, put, type DemoRequest, type DemoRoute } from '../router';
import { bodyOf, idParam, noContent, notFound, numberQuery, sliceSkipTake } from './omnichannel-http';

const DEFAULT_LIST_TAKE = 25;
const DEFAULT_MESSAGE_LIMIT = 50;
const BOARD_COLUMN_LIMIT = 30;
const CONTEXT_STOCK = 48;
const CONSULT_EXPIRES_MINUTES = 25;
const FILTER = {
  Unread: 1, AssignedToMe: 2, BotHandled: 3, NeedsAttention: 4, Unassigned: 5, SlaBreached: 6,
  WaitingReply: 7, InOrder: 8, AwaitingPayment: 9, BotRunning: 10, Closed: 11, AwaitingConsultation: 12,
} as const;
const STATUS_CLOSED_FROM = 2;

type Summary = ConversationSummaryDto;

const STAGE_SETS = {
  waitingReply: new Set<number>([STAGE.AwaitingAgent, STAGE.Handoff]),
  inOrder: new Set<number>([STAGE.OrderCollecting, STAGE.OrderAwaitingConfirmation]),
  awaitingPayment: new Set<number>([STAGE.AwaitingPayment]),
};

function matchesStatusFilter(summary: Summary, filter: number): boolean {
  switch (filter) {
    case FILTER.Unread: return summary.unreadCount > 0;
    case FILTER.AssignedToMe: return summary.assignedUserId === DEMO_USER_ID;
    case FILTER.BotHandled:
    case FILTER.BotRunning: return summary.isBotActive;
    case FILTER.NeedsAttention: return summary.isUrgent || STAGE_SETS.waitingReply.has(summary.stage ?? -1);
    case FILTER.Unassigned: return summary.assignedUserId === null && !summary.isBotActive;
    case FILTER.SlaBreached: return summary.isUrgent && summary.assignedUserId === null;
    case FILTER.WaitingReply: return STAGE_SETS.waitingReply.has(summary.stage ?? -1);
    case FILTER.InOrder: return STAGE_SETS.inOrder.has(summary.stage ?? -1);
    case FILTER.AwaitingPayment: return STAGE_SETS.awaitingPayment.has(summary.stage ?? -1);
    case FILTER.Closed: return summary.status >= STATUS_CLOSED_FROM;
    case FILTER.AwaitingConsultation: return summary.pendingConsultation === true;
    default: return true;
  }
}

/** Durum hapı dışındaki kapsam filtreleri (kanal, ülke, konu, aşama, platform, marka, arama). */
function matchesScope(record: ConversationRecord, request: DemoRequest): boolean {
  const { summary } = record;
  const channel = DEMO_CHANNELS.find((candidate) => candidate.id === summary.channelId);
  const channelId = numberQuery(request, 'channelId');
  const topic = numberQuery(request, 'topic');
  const stage = numberQuery(request, 'stage');
  const platform = numberQuery(request, 'platform');
  const brandId = numberQuery(request, 'brandId');
  const country = request.query.get('country');
  const search = request.query.get('search')?.toLocaleLowerCase('tr') ?? '';
  if (channelId !== null && summary.channelId !== channelId) return false;
  if (topic !== null && summary.topic !== topic) return false;
  if (stage !== null && summary.stage !== stage) return false;
  if (platform !== null && summary.channelType !== platform) return false;
  if (brandId !== null && channel?.brandId !== brandId) return false;
  if (country && summary.country !== country) return false;
  if (!search) return true;
  const haystack = `${summary.contactDisplayName ?? ''} ${summary.lastMessagePreview ?? ''} ${summary.subject ?? ''}`.toLocaleLowerCase('tr');
  return haystack.includes(search);
}

const byRecency = (left: Summary, right: Summary): number =>
  Number(right.isUrgent) - Number(left.isUrgent) || (right.lastMessageAt ?? '').localeCompare(left.lastMessageAt ?? '');

function scopedSummaries(request: DemoRequest): Summary[] {
  return listRecords().filter((record) => matchesScope(record, request)).map((record) => record.summary);
}

function listConversations(request: DemoRequest): Summary[] {
  const filter = numberQuery(request, 'filter') ?? 0;
  const matched = scopedSummaries(request).filter((summary) => matchesStatusFilter(summary, filter));
  return sliceSkipTake([...matched].sort(byRecency), request, DEFAULT_LIST_TAKE);
}

function inboxCounts(request: DemoRequest): InboxCountsDto {
  const summaries = scopedSummaries(request);
  const counts: Record<number, number> = {};
  Object.values(FILTER).forEach((filter) => {
    counts[filter] = summaries.filter((summary) => matchesStatusFilter(summary, filter)).length;
  });
  counts[0] = summaries.length;
  return { counts };
}

const BOARD_COLUMN_BY_STAGE: Record<number, number> = {
  0: 1, [STAGE.BotHandling]: 1, [STAGE.AwaitingAgent]: 2, [STAGE.Handoff]: 2, [STAGE.AwaitingCustomer]: 3, [STAGE.Dormant]: 3,
  [STAGE.OrderCollecting]: 4, [STAGE.OrderAwaitingConfirmation]: 4, [STAGE.OrderPlaced]: 4, [STAGE.AwaitingPayment]: 5,
  [STAGE.Shipped]: 6, [STAGE.Resolved]: 6,
};
const BOARD_COLUMNS = [1, 2, 3, 4, 5, 6] as const;
/** Karta sütun değiştirilince konuşmanın alacağı aşama. */
const STAGE_BY_BOARD_COLUMN: Record<number, number> = {
  1: STAGE.BotHandling, 2: STAGE.AwaitingAgent, 3: STAGE.AwaitingCustomer, 4: STAGE.OrderCollecting, 5: STAGE.AwaitingPayment, 6: STAGE.Resolved,
};

function inboxBoard(request: DemoRequest): BoardColumnDto[] {
  const summaries = scopedSummaries(request).sort(byRecency);
  return BOARD_COLUMNS.map((column): BoardColumnDto => {
    const inColumn = summaries.filter((summary) => (BOARD_COLUMN_BY_STAGE[summary.stage ?? 0] ?? 1) === column);
    return { column, total: inColumn.length, conversations: inColumn.slice(0, BOARD_COLUMN_LIMIT) };
  });
}

function myChannels(): InboxChannelDto[] {
  return DEMO_CHANNELS.map((channel): InboxChannelDto => ({
    id: channel.id,
    type: channel.type,
    displayName: channel.displayName,
    status: channel.status,
    botEnabled: channel.botEnabled,
    unreadCount: listRecords()
      .filter((record) => record.summary.channelId === channel.id)
      .reduce((sum, record) => sum + record.summary.unreadCount, 0),
    canWrite: true,
    isActive: true,
    brandId: channel.brandId ?? null,
    brandName: channel.brandName ?? null,
    supportsDeliveryReceipts: channel.type === 1,
    supportsReadReceipts: channel.type === 1 || channel.type === 2,
  }));
}

function messagesPage(record: ConversationRecord, request: DemoRequest): MessageDto[] {
  const beforeId = numberQuery(request, 'beforeId');
  const limit = numberQuery(request, 'limit') ?? DEFAULT_MESSAGE_LIMIT;
  const older = beforeId === null ? record.messages : record.messages.filter((message) => message.id < beforeId);
  return older.slice(-limit);
}

function digestOf(record: ConversationRecord): ConversationDigestDto {
  const { ctx, summary } = record;
  const product = ctx.productName;
  const summaryText = summary.topic === 4
    ? `${ctx.first} ürünle ilgili şikâyetini iletti; ${product} için çözüm bekliyor.`
    : summary.stage === STAGE.Resolved
      ? `${ctx.first} ile konuşma çözüldü; talep tamamlandı.`
      : `${ctx.first}, ${ctx.vehicle} için ${product} hakkında bilgi/sipariş talep etti. Son durum: ${summary.lastMessagePreview ?? ''}`.trim();
  return { summary: summaryText, customerLanguage: ctx.country === 'UK' ? 'en' : 'tr' };
}

function contextOf(record: ConversationRecord): ConversationContextDto {
  const product = PRODUCT_VIEWS.find((view) => view.id === record.productId);
  return {
    vehicle: record.ctx.vehicle,
    variants: record.ctx.country === 'UK' ? ['Black', 'Grey'] : ['Siyah', 'Gri'],
    product: product ? {
      id: product.id, name: record.ctx.productName, supplierSku: product.sku, stockQuantity: CONTEXT_STOCK, imageUrl: null,
    } : null,
  };
}

function consultationOf(record: ConversationRecord): AgentConsultationDto {
  return {
    id: 1,
    conversationId: record.summary.id,
    questionTr: 'Müşteri tavan barının ne zaman stoğa gireceğini soruyor. Tahmini tarih paylaşalım mı?',
    options: [
      { index: 0, labelTr: 'Evet, 10-14 gün', customerText: 'It should be back in stock in 10-14 days.', customerTextTr: 'Tahminen 10-14 gün içinde stoğa girer.' },
      { index: 1, labelTr: 'Hayır, haber vereceğiz', customerText: 'We will let you know as soon as it arrives.', customerTextTr: 'Gelir gelmez haber vereceğiz.' },
    ],
    triggerReason: 'NotUnderstood',
    createdAt: ago(0, 0, 6),
    expiresAt: ago(0, 0, -CONSULT_EXPIRES_MINUTES),
    autoReplyAt: null,
    autoReplyOptionIndex: null,
  };
}

function followUpsOf(record: ConversationRecord): FollowUpTaskDto[] {
  if (record.script.stage !== STAGE.AwaitingCustomer && record.script.stage !== STAGE.Dormant) return [];
  return [{
    id: record.summary.id, conversationId: record.summary.id, kind: 2, attempt: 1, maxAttempts: 2, status: 0, outcome: null,
    suggestedText: `Merhaba ${record.ctx.first}, ${record.ctx.productName} için yardımcı olabilir miyiz?`,
    dueAt: ago(0, 0, -90), createdAt: ago(0, 2), completedAt: null,
  }];
}

function instructionsOf(record: ConversationRecord): ConversationInstructionDto[] {
  if (record.summary.id % 7 !== 0) return [];
  return [{
    id: record.summary.id, text: 'Müşteriye kargo ücretsiz denildiğini mutlaka belirt.', mode: 'Persistent', isActive: true,
    createdByUserId: DEMO_USER_ID, createdByName: 'Demo Kullanıcı', createdAt: ago(0, 3), scope: 'Conversation',
    expiresAt: null, lastAppliedAt: null, deactivatedAt: null, inherited: false,
  }];
}

const TEMPLATES: SendableTemplateDto[] = [
  { name: 'siparis_hazir', language: 'tr', category: 'UTILITY', bodyText: 'Merhaba {{1}}, {{2}} numaralı siparişiniz hazırlandı.', parameterCount: 2 },
  { name: 'order_dispatched', language: 'en', category: 'UTILITY', bodyText: 'Hi {{1}}, your order {{2}} has been dispatched.', parameterCount: 2 },
];

const CANNED_REPLIES: CannedReplyDto[] = [
  { id: 1, title: 'Kargo süresi', body: 'Siparişleriniz 1-2 iş günü içinde kargoya verilir.', language: 'tr' },
  { id: 2, title: 'İade koşulları', body: 'Kullanılmamış ürünleri 14 gün içinde iade edebilirsiniz.', language: 'tr' },
  { id: 3, title: 'Teşekkür', body: 'Bizi tercih ettiğiniz için teşekkür ederiz!', language: 'tr' },
  { id: 4, title: 'Delivery time', body: 'UK orders are delivered within 2-3 working days.', language: 'en' },
  { id: 5, title: 'Returns', body: 'Unused items can be returned within 30 days.', language: 'en' },
];

const emptyTraces = (): BotTracePageDto => ({ items: [], nextBeforeId: null });

/** Kayıt bulunursa handler'ı çalıştırır, bulunamazsa 404 döner. */
function withRecord(handle: (record: ConversationRecord, request: DemoRequest) => unknown): DemoRoute['handle'] {
  return (request) => {
    const record = recordById(idParam(request));
    return record ? handle(record, request) : notFound();
  };
}

const readReceipt = withRecord((record) => {
  record.summary.unreadCount = 0;
  return noContent();
});

export const inboxRoutes: DemoRoute[] = [
  get('/omnichannel/my-channels', myChannels),
  get('/omnichannel/conversations/counts', inboxCounts),
  get('/omnichannel/conversations/board', inboxBoard),
  get('/omnichannel/conversations', listConversations),
  get('/omnichannel/conversations/:id', withRecord((record) => record.summary)),
  get('/omnichannel/conversations/:id/messages', withRecord(messagesPage)),
  get('/omnichannel/conversations/:id/context', withRecord(contextOf)),
  get('/omnichannel/conversations/:id/assignees', (): AssigneeDto[] => assigneeCandidates()),
  get('/omnichannel/conversations/:id/summary', withRecord(digestOf)),
  get('/omnichannel/conversations/:id/language', withRecord((record) => ({ customerLanguage: digestOf(record).customerLanguage }))),
  get('/omnichannel/conversations/:id/bot-drafts', () => []),
  get('/omnichannel/conversations/:id/follow-ups', withRecord(followUpsOf)),
  get('/omnichannel/conversations/:id/instructions', withRecord(instructionsOf)),
  get('/omnichannel/conversations/:id/traces', emptyTraces),
  get('/omnichannel/conversations/:id/consultation', withRecord((record) =>
    record.summary.id === CONSULT_CONVERSATION_ID ? consultationOf(record) : noContent())),
  get('/omnichannel/messages/templates', () => TEMPLATES),
  get('/omnichannel/canned-replies', () => CANNED_REPLIES),

  post('/omnichannel/messages', (request) => {
    const body = bodyOf(request);
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    const message = text ? appendAgentMessage(Number(body.conversationId), text) : undefined;
    return message ?? notFound();
  }),
  post('/omnichannel/conversations/:id/read', readReceipt),
  post('/omnichannel/conversations/:id/board-move', withRecord((record, request) => {
    record.summary.stage = (STAGE_BY_BOARD_COLUMN[Number(bodyOf(request).column)] ?? record.summary.stage) as Summary['stage'];
    return record.summary;
  })),
  post('/omnichannel/conversations/:id/take-over', withRecord((record) => {
    Object.assign(record.summary, { assignedUserId: DEMO_USER_ID, isBotActive: false });
    return record.summary;
  })),
  put('/omnichannel/conversations/:id/assign', withRecord((record, request) => {
    const userId = bodyOf(request).userId;
    Object.assign(record.summary, { assignedUserId: typeof userId === 'number' ? userId : null, isBotActive: false });
    return record.summary;
  })),
  put('/omnichannel/conversations/:id/status', withRecord((record, request) => {
    record.summary.status = Number(bodyOf(request).status) as Summary['status'];
    return record.summary;
  })),
  put('/omnichannel/conversations/:id/topic', withRecord((record, request) => {
    Object.assign(record.summary, { topic: Number(bodyOf(request).topic), topicSetByUser: true });
    return record.summary;
  })),
  put('/omnichannel/conversations/:id/bot', withRecord((record, request) => {
    record.summary.isBotActive = bodyOf(request).isActive === true;
    return record.summary;
  })),
];
