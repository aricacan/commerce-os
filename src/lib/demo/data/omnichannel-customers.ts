// Müşteri profilleri (CRM): her kişi (contact) için kanallar, araç, adres, ilgi, not ve zaman çizelgesi.
import type {
  CustomerChannelDto, CustomerListItemDto, CustomerNoteDto, CustomerProfileDto, CustomerTagDto, CustomerVehicleDto,
  CrmTaskDto,
} from '../../api/customers';
import type {
  CustomerAddressDto, CustomerFactDto, CustomerInterestDto, CustomerTimelineEventDto, CustomerChatOrderSummaryDto,
} from '../../api/customer-crm';
import { ago } from '../seed';
import { sessionGet } from '../session-store';
import { listRecords, type ConversationRecord } from './omnichannel-conversations';
import { DEMO_AGENTS, DEMO_CONTACTS, DEMO_USER_ID, agentName } from './omnichannel-core';
import { listOrders } from './omnichannel-orders';

const STAGE_CUSTOMER = 1;
const STAGE_LEAD = 0;
const STAGE_VIP = 2;
const VIP_EVERY = 9;
const FACT_CONFIDENCE_BOT = 0.8;
const DAYS_FIRST_SEEN_BASE = 40;
const SOURCE_BOT = 0;
const INTEREST_ASKED = 0;
const INTEREST_QUOTED = 1;
const INTEREST_ORDERED = 4;

export const DEMO_TAGS: CustomerTagDto[] = [
  { id: 1, name: 'VIP', color: 'violet' },
  { id: 2, name: 'Toptan', color: 'blue' },
  { id: 3, name: 'Şikâyet', color: 'rose' },
  { id: 4, name: 'Yeni müşteri', color: 'green', isSystem: true },
  { id: 5, name: 'Tekrar alışveriş', color: 'amber', isSystem: true },
];

const VEHICLE_BY_NAME: Record<string, [string, string]> = {
  'Passat B8': ['Volkswagen', 'Passat'], 'Golf 7': ['Volkswagen', 'Golf'], Corolla: ['Toyota', 'Corolla'],
  'Clio 5': ['Renault', 'Clio'], Fiorino: ['Fiat', 'Fiorino'], Egea: ['Fiat', 'Egea'], 'Megane 4': ['Renault', 'Megane'],
  'Astra K': ['Opel', 'Astra'], 'Ford Focus': ['Ford', 'Focus'], 'Vauxhall Corsa': ['Vauxhall', 'Corsa'],
  'VW Golf': ['Volkswagen', 'Golf'], 'BMW 3 Series': ['BMW', '3 Series'], 'Mini Cooper': ['Mini', 'Cooper'],
};

const recordFor = (contactIndex: number): ConversationRecord | undefined =>
  listRecords().find((record) => record.summary.contactId === contactIndex + 1);

function buildVehicle(record: ConversationRecord | undefined, id: number): CustomerVehicleDto[] {
  if (!record) return [];
  const [make, model] = VEHICLE_BY_NAME[record.ctx.vehicle] ?? [record.ctx.vehicle, null];
  return [{
    id, make, model, year: 2016 + (id % 6), generation: null, bodyType: null,
    lastConfirmedAt: record.summary.lastMessageAt, isPrimary: true, source: SOURCE_BOT, updatedAt: record.summary.lastMessageAt ?? ago(1),
  }];
}

function buildFacts(index: number, record: ConversationRecord | undefined): CustomerFactDto[] {
  const contact = DEMO_CONTACTS[index];
  const updatedAt = record?.summary.lastMessageAt ?? ago(5);
  const conversationId = record?.summary.id ?? null;
  const base = { confidence: FACT_CONFIDENCE_BOT, source: SOURCE_BOT, conversationId, sourceMessageId: null, updatedAt } as const;
  return [
    { key: 'full_name', label: 'Ad soyad', value: contact.name, ...base },
    { key: 'phone', label: 'Telefon', value: contact.phone, ...base },
    { key: 'city', label: 'Şehir', value: contact.city, ...base },
    { key: 'preferred_language', label: 'Tercih edilen dil', value: contact.lang === 'tr' ? 'Türkçe' : 'İngilizce', ...base },
  ];
}

function buildInterests(record: ConversationRecord | undefined, hasOrder: boolean): CustomerInterestDto[] {
  if (!record) return [];
  const [make, model] = VEHICLE_BY_NAME[record.ctx.vehicle] ?? [record.ctx.vehicle, ''];
  return [{
    id: record.summary.id,
    productName: record.ctx.productName,
    sku: record.ctx.sku,
    categoryName: null,
    vehicleText: `${make} ${model}`.trim(),
    status: (hasOrder ? INTEREST_ORDERED : record.script.stage === 1 ? INTEREST_QUOTED : INTEREST_ASKED) as CustomerInterestDto['status'],
    lastQuotedPrice: null,
    currency: record.ctx.country === 'UK' ? 'GBP' : 'TRY',
    askCount: 1 + (record.summary.id % 3),
    firstAskedAt: record.messages[0].createdAt,
    lastAskedAt: record.summary.lastMessageAt ?? record.messages[0].createdAt,
    conversationId: record.summary.id,
  }];
}

function buildAddress(index: number, record: ConversationRecord | undefined): CustomerAddressDto[] {
  if (!record) return [];
  const isUk = record.ctx.country === 'UK';
  return [{
    id: index + 1, fullName: record.ctx.full, phone: DEMO_CONTACTS[index].phone, country: isUk ? 'UK' : 'TR',
    city: record.ctx.city, district: isUk ? null : 'Merkez', addressLine: 'Örnek Mah. Deneme Sk. No:12 D:4',
    postalCode: isUk ? 'AB1 2CD' : '34000', isDefault: true, lastUsedAt: record.summary.lastMessageAt,
  }];
}

function buildChannels(record: ConversationRecord | undefined, contactId: number): CustomerChannelDto[] {
  if (!record) return [];
  return [{
    contactId, channelId: record.summary.channelId, channelName: record.summary.channelName,
    channelType: record.summary.channelType, externalId: record.summary.contactExternalId,
    displayName: record.summary.contactDisplayName, latestConversationId: record.summary.id,
  }];
}

function tagsFor(index: number, record: ConversationRecord | undefined, orderCount: number): CustomerTagDto[] {
  const tags: CustomerTagDto[] = [];
  if (index % VIP_EVERY === 0) tags.push(DEMO_TAGS[0]);
  if (record?.script.key.toLowerCase().includes('wholesale') || record?.script.key === 'enEmailBulk') tags.push(DEMO_TAGS[1]);
  if (record?.script.topic === 4) tags.push(DEMO_TAGS[2]);
  tags.push(orderCount > 1 ? DEMO_TAGS[4] : DEMO_TAGS[3]);
  return tags;
}

function buildNotes(index: number): CustomerNoteDto[] {
  if (index % 5 !== 0) return [];
  return [{
    id: index + 1, authorUserId: 2, authorName: agentName(2), isPinned: index % 10 === 0,
    body: 'Müşteri telefonla da ulaşmak istiyor; akşam saatlerinde arayın.', createdAt: ago(4),
  }];
}

function orderSummaries(profileId: number): CustomerChatOrderSummaryDto[] {
  return listOrders().filter((order) => order.customerProfileId === profileId).map((order) => ({
    id: order.id, publicNo: order.publicNo, conversationId: order.conversationId, status: order.status,
    total: order.total, currency: order.currency, itemCount: order.lines.length, createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
  }));
}

function buildProfile(index: number): CustomerProfileDto {
  const contact = DEMO_CONTACTS[index];
  const profileId = index + 1;
  const record = recordFor(index);
  const orders = orderSummaries(profileId);
  const lastSeen = record?.summary.lastMessageAt ?? ago(DAYS_FIRST_SEEN_BASE);
  return {
    id: profileId,
    displayName: contact.name,
    countryCode: contact.lang === 'tr' ? 'TR' : 'UK',
    lifecycleStage: (index % VIP_EVERY === 0 ? STAGE_VIP : orders.length > 0 ? STAGE_CUSTOMER : STAGE_LEAD) as CustomerProfileDto['lifecycleStage'],
    ownerUserId: DEMO_AGENTS[index % DEMO_AGENTS.length].userId,
    marketingOptIn: index % 3 !== 0,
    marketingOptInAt: index % 3 !== 0 ? ago(20) : null,
    anonymizedAt: null,
    createdAt: ago(DAYS_FIRST_SEEN_BASE + index),
    lastSeenAt: lastSeen,
    preferredLanguage: contact.lang,
    firstSeenAt: ago(DAYS_FIRST_SEEN_BASE + index),
    pendingMergeSuggestions: index === 3 || index === 12 ? 1 : 0,
    identities: [
      { id: profileId * 2, type: 0, value: contact.phone, verified: true },
      { id: profileId * 2 + 1, type: 1, value: contact.email, verified: index % 2 === 0 },
    ],
    channels: buildChannels(record, profileId),
    vehicles: buildVehicle(record, profileId),
    addresses: buildAddress(index, record),
    facts: buildFacts(index, record),
    interests: buildInterests(record, orders.length > 0),
    chatOrders: orders,
    tags: tagsFor(index, record, orders.length),
    notes: buildNotes(index),
  };
}

function profiles(): CustomerProfileDto[] {
  return sessionGet('omnichannel.customers', () => DEMO_CONTACTS.map((_, index) => buildProfile(index)));
}

export function listProfiles(): CustomerProfileDto[] {
  return profiles();
}

export function profileById(profileId: number): CustomerProfileDto | undefined {
  return profiles().find((profile) => profile.id === profileId);
}

export function toListItem(profile: CustomerProfileDto): CustomerListItemDto {
  return {
    id: profile.id,
    displayName: profile.displayName,
    countryCode: profile.countryCode,
    lifecycleStage: profile.lifecycleStage,
    primaryPhone: profile.identities.find((identity) => identity.type === 0)?.value ?? null,
    channelTypes: profile.channels.map((channel) => channel.channelType),
    tags: profile.tags,
    lastSeenAt: profile.lastSeenAt,
    isAnonymized: profile.anonymizedAt !== null,
  };
}

export function timelineFor(profile: CustomerProfileDto): CustomerTimelineEventDto[] {
  const events: CustomerTimelineEventDto[] = [];
  const channelId = profile.channels[0]?.channelId ?? null;
  let nextId = profile.id * 100;
  const add = (type: number, summary: string, refType: string | null, refId: string | null, occurredAt: string, actor?: number) => {
    nextId += 1;
    events.push({
      id: nextId, type: type as CustomerTimelineEventDto['type'], summary, refType, refId, channelId,
      actorUserId: actor ?? null, actorName: actor ? agentName(actor) : null, occurredAt,
    });
  };
  const conversationId = profile.channels[0]?.latestConversationId ?? null;
  add(0, 'Konuşma başladı', 'conversation', conversationId === null ? null : String(conversationId), profile.firstSeenAt);
  profile.interests.forEach((interest) => add(1, `${interest.productName} soruldu`, 'interest', String(interest.id), interest.firstAskedAt));
  profile.vehicles.forEach((vehicle) => add(11, `Araç eklendi: ${vehicle.make} ${vehicle.model ?? ''}`.trim(), 'vehicle', String(vehicle.id), vehicle.updatedAt));
  profile.chatOrders.forEach((order) => add(5, `Sipariş oluşturuldu: ${order.publicNo ?? order.id}`, 'chat_order', String(order.id), order.createdAt));
  profile.notes.forEach((note) => add(8, 'Not eklendi', 'note', String(note.id), note.createdAt, note.authorUserId ?? DEMO_USER_ID));
  return events.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

export function listCrmTasks(): CrmTaskDto[] {
  return sessionGet('omnichannel.crm-tasks', () => [
    ['Müşteriyi geri ara: toptan fiyat teklifi', 9, 1, 2, 'Teklif hazır olunca WhatsApp\'tan da bilgi ver.'],
    ['Değişim ürününün kargo takibini paylaş', 12, 1, 0, null],
    ['Fatura bilgilerini doğrula', 15, 3, 1, null],
    ['İade gelen ürünü kontrol et', 10, 4, 3, 'Ürün kullanılmamış görünüyor.'],
    ['Stok gelince müşteriye haber ver', 13, 2, 5, null],
    ['VIP müşteriye kampanya mesajı hazırla', 0, 1, 7, null],
  ].map(([title, customer, assignee, dueDays, notes], index): CrmTaskDto => {
    const profile = profileById(Number(customer) + 1);
    return {
      id: index + 1,
      customerProfileId: profile?.id ?? null,
      customerName: profile?.displayName ?? null,
      conversationId: profile?.channels[0]?.latestConversationId ?? null,
      title: String(title),
      notes: notes === null ? null : String(notes),
      assigneeUserId: Number(assignee),
      assigneeName: agentName(Number(assignee)),
      createdByUserId: DEMO_USER_ID,
      dueAt: ago(-Number(dueDays) + (index === 2 ? 1 : 0)),
      status: (index === 3 ? 1 : 0) as CrmTaskDto['status'],
      completedAt: index === 3 ? ago(1) : null,
      createdAt: ago(3 + index),
    };
  }));
}
