// Müşteriler (CRM) ve görevler: liste, özet, 360 detay, zaman çizelgesi, birleştirme önerileri, etiketler.
import type {
  CrmTaskDto, CustomerOrderDto, CustomerShopifyOrdersDto, CustomerSummaryDto,
} from '../../api/customers';
import type { CustomerMergeCandidateDto, CustomerMergeSuggestionDto } from '../../api/customer-crm';
import {
  DEMO_TAGS, listCrmTasks, listProfiles, profileById, timelineFor, toListItem,
} from '../data/omnichannel-customers';
import { DEMO_AGENTS } from '../data/omnichannel-core';
import { listOrders } from '../data/omnichannel-orders';
import { matchesSearch, ago } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { idParam, notFound, numberQuery, sliceSkipTake } from './omnichannel-http';

const DEFAULT_TAKE = 25;
const TIMELINE_TAKE = 50;
const ERP_ORDER_STATUS = 'Teslim edildi';
const TASK_STATUS_OPEN = 0;

const SEGMENTS: Record<string, (profile: ReturnType<typeof listProfiles>[number]) => boolean> = {
  hasVehicle: (profile) => profile.vehicles.length > 0,
  hasAddress: (profile) => profile.addresses.length > 0,
  hasPhone: (profile) => profile.identities.some((identity) => identity.type === 0),
  hasOrder: (profile) => profile.chatOrders.length > 0,
  complete: (profile) => profile.vehicles.length > 0 && profile.addresses.length > 0,
  incomplete: (profile) => profile.vehicles.length === 0 || profile.addresses.length === 0,
};

function filteredProfiles(request: DemoRequest) {
  const search = request.query.get('search');
  const countryCode = request.query.get('countryCode');
  const tagId = numberQuery(request, 'tagId');
  const channelType = numberQuery(request, 'channelType');
  const segment = SEGMENTS[request.query.get('segment') ?? ''];
  return listProfiles()
    .filter((profile) => matchesSearch(profile, search, ['displayName']))
    .filter((profile) => !countryCode || profile.countryCode === countryCode)
    .filter((profile) => tagId === null || profile.tags.some((tag) => tag.id === tagId))
    .filter((profile) => channelType === null || profile.channels.some((channel) => channel.channelType === channelType))
    .filter((profile) => !segment || segment(profile));
}

function customerSummary(): CustomerSummaryDto {
  const all = listProfiles();
  const count = (segment: string) => all.filter(SEGMENTS[segment]).length;
  const byChannel = new Map<number, number>();
  all.forEach((profile) => profile.channels.forEach((channel) => byChannel.set(channel.channelType, (byChannel.get(channel.channelType) ?? 0) + 1)));
  return {
    total: all.length, complete: count('complete'), incomplete: count('incomplete'), withVehicle: count('hasVehicle'),
    withAddress: count('hasAddress'), withPhone: count('hasPhone'), withOrder: count('hasOrder'),
    byChannel: [...byChannel.entries()].map(([channelType, total]) => ({ channelType: channelType as 1, count: total })),
    byCountry: [{ countryCode: 'TR', count: all.filter((p) => p.countryCode === 'TR').length }, { countryCode: 'UK', count: all.filter((p) => p.countryCode === 'UK').length }],
  };
}

function erpOrders(request: DemoRequest): CustomerOrderDto[] {
  const profile = profileById(idParam(request));
  if (!profile) return [];
  return profile.chatOrders.slice(0, 2).map((order, index): CustomerOrderDto => ({
    orderNumber: `ERP-${20_000 + order.id}`, platform: index === 0 ? 'Web Sitesi' : 'Trendyol', status: ERP_ORDER_STATUS,
    orderDate: order.createdAt, total: order.total, currency: order.currency, itemCount: order.itemCount, matchedBy: 'phone',
  }));
}

function shopifyOrders(request: DemoRequest): CustomerShopifyOrdersDto {
  const profile = profileById(idParam(request));
  const orders = listOrders().filter((order) => order.customerProfileId === profile?.id && order.shopifyOrderName);
  return {
    outcome: 'ok', message: null,
    orders: orders.map((order) => ({
      storeId: 1, orderId: order.id, name: order.shopifyOrderName ?? '', createdAt: order.createdAt, isCancelled: false,
      financialStatus: 'paid', fulfillmentStatus: order.trackingNumber ? 'fulfilled' : 'unfulfilled', total: order.total,
      currency: order.currency, matchedBy: 'phone',
      tracking: order.trackingNumber ? [{ company: 'Demo Kargo', number: order.trackingNumber, url: null }] : [],
    })),
  };
}

function candidateOf(profileId: number): CustomerMergeCandidateDto {
  const profile = profileById(profileId) ?? listProfiles()[0];
  return {
    profileId: profile.id, displayName: profile.displayName, countryCode: profile.countryCode,
    primaryPhone: profile.identities[0]?.value ?? null, channelTypes: profile.channels.map((channel) => channel.channelType),
    lastSeenAt: profile.lastSeenAt,
  };
}

function mergeSuggestions(): CustomerMergeSuggestionDto[] {
  return [
    { id: 1, score: 0.91, reasons: 'Aynı ad · Aynı şehir', status: 0, createdAt: ago(1), profileA: candidateOf(4), profileB: candidateOf(37) },
    { id: 2, score: 0.78, reasons: 'Aynı araç · Benzer ad', status: 0, createdAt: ago(2), profileA: candidateOf(13), profileB: candidateOf(38) },
  ];
}

function crmTasks(request: DemoRequest): CrmTaskDto[] {
  const status = numberQuery(request, 'status') ?? TASK_STATUS_OPEN;
  const customer = numberQuery(request, 'customerProfileId');
  return listCrmTasks()
    .filter((task) => task.status === status)
    .filter((task) => customer === null || task.customerProfileId === customer)
    .filter((task) => request.query.get('scope') !== '0' || task.assigneeUserId === 1);
}

export const customerRoutes: DemoRoute[] = [
  get('/omnichannel/customers', (request) => {
    const matched = filteredProfiles(request);
    return { items: sliceSkipTake(matched, request, DEFAULT_TAKE).map(toListItem), total: matched.length };
  }),
  get('/omnichannel/customers/summary', customerSummary),
  get('/omnichannel/customers/merge-suggestions', () => ({ items: mergeSuggestions(), total: mergeSuggestions().length })),
  get('/omnichannel/customers/:id', (request) => profileById(idParam(request)) ?? notFound()),
  get('/omnichannel/contacts/:id/customer', (request) => profileById(idParam(request)) ?? notFound()),
  get('/omnichannel/customers/:id/timeline', (request) => {
    const profile = profileById(idParam(request));
    return { items: profile ? timelineFor(profile).slice(0, TIMELINE_TAKE) : [], nextBeforeId: null };
  }),
  get('/omnichannel/customers/:id/merge-suggestions', (request) =>
    mergeSuggestions().filter((s) => s.profileA.profileId === idParam(request) || s.profileB.profileId === idParam(request))),
  get('/omnichannel/customers/:id/orders', erpOrders),
  get('/omnichannel/customers/:id/shopify-orders', shopifyOrders),
  get('/omnichannel/customer-tags', () => DEMO_TAGS),
  get('/omnichannel/crm-tasks', crmTasks),
  get('/omnichannel/crm-assignees', () => DEMO_AGENTS),
];
