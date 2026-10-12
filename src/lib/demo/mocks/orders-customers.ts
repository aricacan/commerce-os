// Müşteri 360 (omnichannel müşteri dizini) ve sistem içi Müşteri 360 arama uçları.
import type { ChannelType } from '../../api/omnichannel';
import type {
  CustomerChannelCountDto, CustomerCountryCountDto, CustomerListItemDto, CustomerListResultDto,
  CustomerOrderDto, CustomerProfileDto, CustomerSegment, CustomerShopifyOrdersDto, CustomerSummaryDto,
} from '../../api/customers';
import type { ContactMatch, Customer360SearchResult, CustomerGroup, CustomerOrderRow } from '../../api/customer360';
import { DEMO_PROFILES, type DemoProfile } from '../data/orders-customers';
import { DEMO_ORDERS } from '../data/orders-seed';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';
import { ago, matchesSearch } from '../seed';
import { MERGE_SUGGESTIONS } from './orders-crm';

const NOT_FOUND = 404;
const DEFAULT_TAKE = 50;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_ORDER_LIMIT = 30;
const SHOPIFY_EVERY_NTH_PROFILE = 4;

const round2 = (value: number): number => Math.round(value * 100) / 100;
const hasPhone = (profile: DemoProfile): boolean => profile.phoneDigits !== '';
const isComplete = (profile: DemoProfile): boolean =>
  hasPhone(profile) && profile.addresses.length > 0 && profile.vehicles.length > 0;

const SEGMENT_FILTERS: Record<CustomerSegment, (profile: DemoProfile) => boolean> = {
  all: () => true,
  hasVehicle: (profile) => profile.vehicles.length > 0,
  hasAddress: (profile) => profile.addresses.length > 0,
  hasPhone: hasPhone,
  complete: isComplete,
  incomplete: (profile) => !isComplete(profile),
  hasOrder: (profile) => profile.chatOrders.length > 0,
};

function pendingSuggestionCount(profileId: number): number {
  return MERGE_SUGGESTIONS.filter((item) => item.profileA.profileId === profileId || item.profileB.profileId === profileId).length;
}

function toProfileDto(profile: DemoProfile): CustomerProfileDto {
  const { phoneDigits: _phone, email: _email, ...dto } = profile;
  return { ...dto, pendingMergeSuggestions: pendingSuggestionCount(profile.id) };
}

function toListItem(profile: DemoProfile): CustomerListItemDto {
  return {
    id: profile.id,
    displayName: profile.displayName,
    countryCode: profile.countryCode,
    lifecycleStage: profile.lifecycleStage,
    primaryPhone: profile.phoneDigits,
    channelTypes: [...new Set(profile.channels.map((channel) => channel.channelType))],
    tags: profile.tags,
    lastSeenAt: profile.lastSeenAt,
    isAnonymized: false,
  };
}

function matchesQuery(profile: DemoProfile, query: URLSearchParams): boolean {
  const search = query.get('search');
  const country = query.get('countryCode');
  const tagId = query.get('tagId');
  const channelType = query.get('channelType');
  const segment = (query.get('segment') ?? 'all') as CustomerSegment;
  const textMatch = matchesSearch(profile, search, ['displayName', 'phoneDigits', 'email']);
  return textMatch
    && (!country || profile.countryCode === country)
    && (!tagId || profile.tags.some((tag) => tag.id === Number(tagId)))
    && (!channelType || profile.channels.some((channel) => channel.channelType === Number(channelType)))
    && (SEGMENT_FILTERS[segment] ?? SEGMENT_FILTERS.all)(profile);
}

function listCustomers(request: DemoRequest): CustomerListResultDto {
  const { query } = request;
  const matching = DEMO_PROFILES.filter((profile) => matchesQuery(profile, query))
    .sort((a, b) => (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? ''));
  const skip = Number(query.get('skip') ?? 0);
  const take = Number(query.get('take') ?? DEFAULT_TAKE);
  return { items: matching.slice(skip, skip + take).map(toListItem), total: matching.length };
}

function countByChannel(): CustomerChannelCountDto[] {
  const types = [...new Set(DEMO_PROFILES.flatMap((profile) => profile.channels.map((channel) => channel.channelType)))];
  return types.map((channelType: ChannelType) => ({
    channelType,
    count: DEMO_PROFILES.filter((profile) => profile.channels.some((channel) => channel.channelType === channelType)).length,
  }));
}

function countByCountry(): CustomerCountryCountDto[] {
  const codes = [...new Set(DEMO_PROFILES.map((profile) => profile.countryCode))];
  return codes.map((countryCode) => ({
    countryCode,
    count: DEMO_PROFILES.filter((profile) => profile.countryCode === countryCode).length,
  }));
}

function summary(): CustomerSummaryDto {
  const count = (segment: CustomerSegment) => DEMO_PROFILES.filter(SEGMENT_FILTERS[segment]).length;
  return {
    total: DEMO_PROFILES.length,
    complete: count('complete'),
    incomplete: count('incomplete'),
    withVehicle: count('hasVehicle'),
    withAddress: count('hasAddress'),
    withPhone: count('hasPhone'),
    withOrder: count('hasOrder'),
    byChannel: countByChannel(),
    byCountry: countByCountry(),
  };
}

function profileDetail(request: DemoRequest) {
  const profile = DEMO_PROFILES.find((candidate) => candidate.id === Number(request.params.id));
  return profile ? toProfileDto(profile) : new DemoHttpResponse(NOT_FOUND);
}

function profileForContact(request: DemoRequest) {
  const contactId = Number(request.params.contactId);
  const profile = DEMO_PROFILES.find((candidate) => candidate.channels.some((channel) => channel.contactId === contactId));
  return profile ? toProfileDto(profile) : new DemoHttpResponse(NOT_FOUND);
}

// ─── Müşterinin ERP / Shopify siparişleri ────────────────────────────────────

function erpOrders(request: DemoRequest): CustomerOrderDto[] {
  const profile = DEMO_PROFILES.find((candidate) => candidate.id === Number(request.params.id));
  if (!profile) return [];
  return DEMO_ORDERS.filter((order) => order.customerName === profile.displayName)
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
    .map((order) => ({
      orderNumber: order.platformOrderNumber,
      platform: order.platformName,
      status: order.universalStatus,
      orderDate: order.orderDate,
      total: order.totalAmount,
      currency: order.currency,
      itemCount: order.items.length,
      matchedBy: 'name',
    }));
}

function shopifyOrders(request: DemoRequest): CustomerShopifyOrdersDto {
  const profileId = Number(request.params.id);
  if (profileId % SHOPIFY_EVERY_NTH_PROFILE !== 0) return { outcome: 'ok', message: null, orders: [] };
  return {
    outcome: 'ok',
    message: null,
    orders: [{
      storeId: 1, orderId: 900000 + profileId, name: `#${3000 + profileId}`, createdAt: ago(profileId % 20 + 3),
      isCancelled: false, financialStatus: 'paid', fulfillmentStatus: 'fulfilled', total: 1290, currency: 'TRY',
      matchedBy: 'email', tracking: [{ company: 'Demo Kargo', number: `DK${profileId}00123`, url: null }],
    }],
  };
}

// ─── Müşteri 360 arama (sipariş müşterileri + omnichannel kişileri) ───────────

function orderRow(order: (typeof DEMO_ORDERS)[number]): CustomerOrderRow {
  return {
    orderId: order.orderId,
    customerName: order.customerName ?? '',
    storeName: order.storeName,
    platformName: order.platformName,
    platformOrderNumber: order.platformOrderNumber,
    orderDate: order.orderDate,
    universalStatus: order.universalStatus,
    revenue: order.totalAmount,
    netProfit: round2(order.items.reduce((total, item) => total + (item.hasCostData ? item.netProfit : 0), 0)),
  };
}

function contactMatches(profiles: DemoProfile[]): ContactMatch[] {
  return profiles.flatMap((profile) => profile.channels.map((channel): ContactMatch => ({
    contactId: channel.contactId,
    displayName: profile.displayName ?? '',
    phoneNumber: profile.phoneDigits,
    channelName: channel.channelName,
    conversations: channel.latestConversationId === null ? [] : [{
      conversationId: channel.latestConversationId,
      status: 'open',
      isUrgent: false,
      unreadCount: profile.id % 3,
      lastMessageAt: profile.lastSeenAt,
      lastMessagePreview: 'Merhaba, ürün hakkında bilgi alabilir miyim?',
    }],
  })));
}

function customer360Search(request: DemoRequest): Customer360SearchResult {
  const term = (request.query.get('q') ?? '').trim();
  if (term.length < SEARCH_MIN_LENGTH) return { orderCustomers: [], orders: [], contacts: [] };
  const needle = term.toLocaleLowerCase('tr');
  const orders = DEMO_ORDERS.filter((order) =>
    `${order.customerName} ${order.platformOrderNumber} ${order.customerEmail ?? ''}`.toLocaleLowerCase('tr').includes(needle));
  const groups = new Map<string, CustomerGroup>();
  orders.forEach((order) => {
    const key = order.customerName ?? '';
    const current = groups.get(key) ?? { customerName: key, orderCount: 0, totalRevenue: 0, totalNetProfit: 0 };
    const row = orderRow(order);
    groups.set(key, {
      customerName: key,
      orderCount: current.orderCount + 1,
      totalRevenue: round2(current.totalRevenue + row.revenue),
      totalNetProfit: round2(current.totalNetProfit + row.netProfit),
    });
  });
  const profiles = DEMO_PROFILES.filter((profile) => matchesSearch(profile, term, ['displayName', 'phoneDigits', 'email']));
  return {
    orderCustomers: [...groups.values()].sort((a, b) => b.totalRevenue - a.totalRevenue),
    orders: [...orders].reverse().slice(0, SEARCH_ORDER_LIMIT).map(orderRow),
    contacts: contactMatches(profiles),
  };
}

export const orderCustomerRoutes: DemoRoute[] = [
  get('/omnichannel/customers/summary', summary),
  get('/omnichannel/customers/:id/orders', erpOrders),
  get('/omnichannel/customers/:id/shopify-orders', shopifyOrders),
  get('/omnichannel/customers/:id', profileDetail),
  get('/omnichannel/customers', listCustomers),
  get('/omnichannel/contacts/:contactId/customer', profileForContact),
  get('/customer360/search', customer360Search),
];
