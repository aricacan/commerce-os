// Çalışma sekmeleri: devirler, atananlar panosu, sohbet siparişleri ve talep sinyalleri.
import type {
  AssignmentAgentDto, AssignmentBoardDto, AssignmentCardDto,
} from '../../api/assignments';
import type { HandoffCounts, HandoffTicketDto } from '../../api/handoff';
import type {
  ChatOrderDetailDto, ChatOrderDraftDefaultsDto, ChatOrderPageDto, ChatOrderProductOptionDto,
} from '../../api/omnichannel-chat-orders';
import type { DemandSignalReportDto } from '../../api/omnichannel-demand';
import {
  assignTicket, listTickets, resolveTicket, setTicketWaiting, ticketById, ticketForConversation, ticketTimeline,
} from '../data/omnichannel-handoffs';
import { recordById } from '../data/omnichannel-conversations';
import { DEMO_AGENTS, DEMO_USER_ID } from '../data/omnichannel-core';
import { listOrders, orderById, toListItem } from '../data/omnichannel-orders';
import { teamSummaries } from '../data/omnichannel-teams';
import { PRODUCT_VIEWS } from '../data/omnichannel-scripts';
import { ago } from '../seed';
import { get, patch, post, put, type DemoRequest, type DemoRoute } from '../router';
import { bodyOf, daysQuery, idParam, noContent, notFound, numberQuery, slicePage, sliceSkipTake } from './omnichannel-http';

const DEFAULT_QUEUE_TAKE = 25;
const DEFAULT_ORDER_PAGE_SIZE = 20;
const CLOSED_STATUS = 3;
const UNCONFIRMED_BELOW = 2;
const PRODUCT_SEARCH_LIMIT = 8;
const STOCK_FALLBACK = 36;
const AVG_FIRST_RESPONSE_SECONDS = 410;

function ticketMatches(ticket: HandoffTicketDto, request: DemoRequest): boolean {
  const status = numberQuery(request, 'status');
  const channelId = numberQuery(request, 'channelId');
  const platform = numberQuery(request, 'platform');
  const country = request.query.get('country');
  const level = request.query.get('level');
  if (status !== null && ticket.status !== status) return false;
  if (channelId !== null && ticket.channelId !== channelId) return false;
  if (platform !== null && ticket.channelType !== platform) return false;
  if (country && ticket.country !== country) return false;
  if (level && ticket.level !== level) return false;
  if (request.query.get('mineOnly') === 'true' && ticket.assigneeUserId !== DEMO_USER_ID) return false;
  if (request.query.get('unassignedOnly') === 'true' && ticket.assigneeUserId !== null) return false;
  if (request.query.get('overdueOnly') === 'true' && ticket.slaBreachedAt === null) return false;
  return true;
}

/** Kuyruk sırası: önce çözülmemişler, sonra yüksek öncelik puanı. */
const byPriority = (left: HandoffTicketDto, right: HandoffTicketDto): number =>
  Number(left.status === CLOSED_STATUS) - Number(right.status === CLOSED_STATUS) || (right.score ?? 0) - (left.score ?? 0);

function filteredTickets(request: DemoRequest): HandoffTicketDto[] {
  return listTickets().filter((ticket) => ticketMatches(ticket, request)).sort(byPriority);
}

function handoffCounts(): HandoffCounts {
  const open = listTickets().filter((ticket) => ticket.status !== CLOSED_STATUS);
  const unassigned = open.filter((ticket) => ticket.assigneeUserId === null).length;
  const overdue = open.filter((ticket) => ticket.slaBreachedAt !== null).length;
  return {
    open: open.length, unassigned, overdue,
    mine: open.filter((ticket) => ticket.assigneeUserId === DEMO_USER_ID).length,
    attention: open.filter((ticket) => ticket.assigneeUserId === null || ticket.slaBreachedAt !== null).length,
  };
}

function withTicket(handle: (ticket: HandoffTicketDto, request: DemoRequest) => unknown): DemoRoute['handle'] {
  return (request) => {
    const ticket = ticketById(idParam(request));
    return ticket ? handle(ticket, request) : notFound();
  };
}

const handoffRoutes: DemoRoute[] = [
  get('/omnichannel/handoffs', (request) => filteredTickets(request)),
  get('/omnichannel/handoffs/page', (request) => {
    const matched = filteredTickets(request);
    return { items: sliceSkipTake(matched, request, DEFAULT_QUEUE_TAKE), total: matched.length };
  }),
  get('/omnichannel/handoffs/counts', handoffCounts),
  get('/omnichannel/handoffs/:id/timeline', (request) => ticketTimeline(idParam(request))),
  get('/omnichannel/conversations/:id/handoff', (request) => ticketForConversation(idParam(request)) ?? noContent()),
  post('/omnichannel/handoffs/:id/take-over', withTicket((ticket) => assignTicket(ticket.id, DEMO_USER_ID))),
  put('/omnichannel/handoffs/:id/assignee', withTicket((ticket, request) => {
    const userId = bodyOf(request).assigneeUserId;
    return assignTicket(ticket.id, typeof userId === 'number' ? userId : null);
  })),
  put('/omnichannel/handoffs/:id/waiting', withTicket((ticket, request) => setTicketWaiting(ticket.id, bodyOf(request).waiting === true))),
  post('/omnichannel/handoffs/:id/resolve', withTicket((ticket, request) => {
    const body = bodyOf(request);
    return resolveTicket(ticket.id, Number(body.outcome) as 0 | 1 | 2, typeof body.note === 'string' ? body.note : null);
  })),
  patch('/omnichannel/handoffs/:id', withTicket((ticket, request) => {
    const body = bodyOf(request);
    if (typeof body.status === 'number') ticket.status = body.status as HandoffTicketDto['status'];
    return ticket;
  })),
];

function agentCards(tickets: HandoffTicketDto[]): AssignmentCardDto[] {
  return tickets.filter((ticket) => ticket.status !== CLOSED_STATUS).map((ticket): AssignmentCardDto => ({
    conversationId: ticket.conversationId,
    ticketId: ticket.id,
    ticketCode: ticket.ticketCode ?? null,
    customerName: ticket.customerName,
    channelId: ticket.channelId ?? 0,
    channelName: ticket.channelName,
    channelType: ticket.channelType,
    country: ticket.country ?? null,
    level: ticket.level ?? null,
    score: ticket.score ?? null,
    isUrgent: ticket.isUrgent,
    ticketStatus: ticket.status,
    reason: ticket.reason,
    assigneeUserId: ticket.assigneeUserId,
    isBotActive: ticket.isBotActive ?? false,
    waitingSince: ticket.lastInboundAt ?? ticket.createdAt,
    slaDueAt: ticket.slaDueAt ?? null,
    slaBreachedAt: ticket.slaBreachedAt ?? null,
    lastMessagePreview: ticket.lastMessagePreview ?? null,
    tags: ticket.isUrgent ? ['Şikâyet'] : [],
  }));
}

const BOT_COLUMN_CARD_LIMIT = 6;

function botCards(): AssignmentCardDto[] {
  const withTicket = new Set(listTickets().map((ticket) => ticket.conversationId));
  const records = [3, 5, 8, 12, 18, 21, 25].map((id) => recordById(id)).filter((record) => record !== undefined);
  return records.filter((record) => !withTicket.has(record.summary.id) && record.summary.isBotActive).slice(0, BOT_COLUMN_CARD_LIMIT).map((record): AssignmentCardDto => ({
    conversationId: record.summary.id, ticketId: null, ticketCode: null, customerName: record.summary.contactDisplayName,
    channelId: record.summary.channelId, channelName: record.summary.channelName, channelType: record.summary.channelType,
    country: record.summary.country ?? null, level: null, score: null, isUrgent: false, ticketStatus: null, reason: null,
    assigneeUserId: null, isBotActive: true, waitingSince: record.summary.lastMessageAt ?? ago(0), slaDueAt: null,
    slaBreachedAt: null, lastMessagePreview: record.summary.lastMessagePreview, tags: [],
  }));
}

function assignmentBoard(request: DemoRequest): AssignmentBoardDto {
  const tickets = filteredTickets(request);
  const open = listTickets().filter((ticket) => ticket.status !== CLOSED_STATUS);
  const agents = DEMO_AGENTS.map((agent): AssignmentAgentDto => ({
    userId: agent.userId, name: agent.displayName, isOnDuty: agent.userId !== 4, isTeamMember: true,
    openCount: open.filter((ticket) => ticket.assigneeUserId === agent.userId).length,
    maxOpenConversations: 12,
    avgFirstResponseSecondsToday: AVG_FIRST_RESPONSE_SECONDS + agent.userId * 35,
    repliedToday: 6 + agent.userId * 3,
  }));
  return { agents, cards: [...agentCards(tickets), ...botCards()], generatedAt: new Date().toISOString() };
}

const assignmentRoutes: DemoRoute[] = [
  get('/omnichannel/assignments/board', assignmentBoard),
  get('/omnichannel/assignments/teams', teamSummaries),
];

function orderPage(request: DemoRequest): ChatOrderPageDto {
  const status = numberQuery(request, 'status');
  const country = request.query.get('country');
  const channelId = numberQuery(request, 'channelId');
  const payment = numberQuery(request, 'paymentMethod');
  const search = request.query.get('search')?.toLocaleLowerCase('tr') ?? '';
  const includeUnconfirmed = request.query.get('includeUnconfirmed') === 'true' || status !== null;
  const rows = listOrders()
    .filter((order) => includeUnconfirmed || order.status >= UNCONFIRMED_BELOW)
    .filter((order) => status === null || order.status === status)
    .filter((order) => !country || order.country === country)
    .filter((order) => payment === null || order.paymentMethod === payment)
    .filter((order) => channelId === null || recordById(order.conversationId)?.summary.channelId === channelId)
    .filter((order) => !search || `${order.publicNo ?? ''} ${order.fullName ?? ''}`.toLocaleLowerCase('tr').includes(search));
  const paged = slicePage(rows, request, DEFAULT_ORDER_PAGE_SIZE);
  return {
    items: paged.items.map((order) => toListItem(order, recordById(order.conversationId))),
    total: rows.length, page: paged.page, pageSize: paged.pageSize,
  };
}

function orderDetail(request: DemoRequest): ChatOrderDetailDto | ReturnType<typeof notFound> {
  const order = orderById(idParam(request));
  if (!order) return notFound();
  const record = recordById(order.conversationId);
  return {
    order, channelId: record?.summary.channelId ?? 0, channelName: record?.summary.channelName ?? null,
    channelType: record?.summary.channelType ?? null, canWrite: true, canOverridePrice: true, canMessageCustomer: true,
  };
}

function draftDefaults(request: DemoRequest): ChatOrderDraftDefaultsDto | ReturnType<typeof notFound> {
  const record = recordById(idParam(request));
  if (!record) return notFound();
  const isUk = record.ctx.country === 'UK';
  return {
    conversationId: record.summary.id, country: record.ctx.country, currency: isUk ? 'GBP' : 'TRY', fullName: record.ctx.full,
    phone: record.summary.contactExternalId.startsWith('+') ? record.summary.contactExternalId : null,
    city: record.ctx.city, district: null, addressLine: null, postalCode: null, openOrderId: null,
    paymentMethods: [1, 2], canMessageCustomer: true, canOverridePrice: true,
  };
}

function productOptions(request: DemoRequest): ChatOrderProductOptionDto[] {
  const needle = (request.query.get('q') ?? '').toLocaleLowerCase('tr');
  const isUk = request.query.get('country') === 'UK';
  return PRODUCT_VIEWS
    .filter((product) => !needle || `${product.nameTr} ${product.nameEn} ${product.sku}`.toLocaleLowerCase('tr').includes(needle))
    .slice(0, PRODUCT_SEARCH_LIMIT)
    .map((product): ChatOrderProductOptionDto => ({
      productId: product.id, sku: product.sku, title: isUk ? product.nameEn : product.nameTr,
      price: isUk ? product.priceGbp : product.priceTry, currency: isUk ? 'GBP' : 'TRY', stockQuantity: STOCK_FALLBACK + product.id % 40,
      productUrl: null, imageUrl: null, vehicleBrand: null, vehicleModel: null, modelYear: null, categoryName: null,
    }));
}

const orderRoutes: DemoRoute[] = [
  get('/omnichannel/chat-orders', orderPage),
  get('/omnichannel/chat-orders/:id', orderDetail),
  get('/omnichannel/conversations/:id/chat-orders', (request) => listOrders().filter((order) => order.conversationId === idParam(request))),
  get('/omnichannel/conversations/:id/chat-order-draft', draftDefaults),
  get('/omnichannel/conversations/:id/chat-order-products', productOptions),
  get('/omnichannel/customers/:id/chat-orders', (request) => listOrders().filter((order) => order.customerProfileId === idParam(request))),
];

function demandReport(request: DemoRequest): DemandSignalReportDto {
  const days = daysQuery(request, 30);
  const sample = (conversationId: number, query: string, hoursAgo: number) => ({ conversationId, query, createdAt: ago(0, hoursAgo) });
  const groups: DemandSignalReportDto['groups'] = [
    { make: 'Volkswagen', model: 'Passat', generation: 'B8', categoryName: 'Tavan Barı', count: 14, uniqueCustomers: 11, lastAt: ago(0, 5), years: [2017, 2018, 2019], outcomes: ['ModelNoProducts'], countries: ['TR'], samples: [sample(14, 'Passat B8 tavan barı var mı', 5), sample(9, 'Passat B8 için tavan taşıyıcı', 31)] },
    { make: 'Fiat', model: 'Egea', generation: null, categoryName: 'Bagaj Havuzu', count: 9, uniqueCustomers: 8, lastAt: ago(0, 20), years: [2020, 2021], outcomes: ['OtherGenerationsOnly'], countries: ['TR'], samples: [sample(21, 'Egea cross bagaj havuzu', 20)] },
    { make: 'Toyota', model: 'Corolla', generation: 'E210', categoryName: 'Çamurluk Paspası', count: 7, uniqueCustomers: 6, lastAt: ago(1, 3), years: [2019], outcomes: ['NoResults'], countries: ['TR'], samples: [sample(3, 'Corolla 2019 çamurluk paspası', 27)] },
    { make: 'Ford', model: 'Focus', generation: 'Mk4', categoryName: 'Roof Bars', count: 5, uniqueCustomers: 5, lastAt: ago(1, 8), years: [2020], outcomes: ['PartNotForVehicle'], countries: ['UK'], samples: [sample(29, 'roof bars for focus mk4', 32)] },
    { make: null, model: null, generation: null, categoryName: 'Dikiz Aynası Kamerası', count: 4, uniqueCustomers: 4, lastAt: ago(2), years: [], outcomes: ['VehicleUnknown'], countries: ['TR', 'UK'], samples: [sample(5, 'aynalı kamera var mı', 48)] },
  ];
  const country = request.query.get('country');
  const visible = groups.filter((group) => !country || group.countries.includes(country));
  return {
    sinceUtc: ago(days), untilUtc: new Date().toISOString(),
    totalSignals: visible.reduce((sum, group) => sum + group.count, 0), truncated: false, groups: visible,
  };
}

const demandRoutes: DemoRoute[] = [get('/omnichannel/demand-signals', demandReport)];

export const workRoutes: DemoRoute[] = [...handoffRoutes, ...assignmentRoutes, ...orderRoutes, ...demandRoutes];
