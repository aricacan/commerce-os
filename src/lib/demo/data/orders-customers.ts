// Müşteri 360 profilleri: ortak müşteri listesinden türeyen CRM kayıtları.
import { CHANNEL_TYPE, type ChannelType } from '../../api/omnichannel';
import { CHAT_ORDER_STATUS } from '../../api/omnichannel-chat-orders';
import {
  INTEREST_STATUS, type CustomerAddressDto, type CustomerChatOrderSummaryDto, type CustomerFactDto,
  type CustomerInterestDto,
} from '../../api/customer-crm';
import {
  DATA_SOURCE, IDENTITY_TYPE, LIFECYCLE_STAGE,
  type CustomerChannelDto, type DataSource, type CustomerIdentityDto, type CustomerNoteDto, type CustomerProfileDto,
  type CustomerTagDto, type CustomerVehicleDto,
} from '../../api/customers';
import { ago, createRng, type Rng } from '../seed';
import { DEMO_CUSTOMERS, DEMO_PRODUCTS, type DemoCustomer } from './core';

const CUSTOMER_SEED = 7731;
const UK_CITIES: readonly string[] = ['London', 'Manchester', 'Leeds'];
const PROFILE_AGE_RANGE_DAYS = [20, 220] as const;

export const DEMO_TAGS: CustomerTagDto[] = [
  { id: 1, name: 'VIP', color: 'violet' },
  { id: 2, name: 'Toptancı', color: 'blue' },
  { id: 3, name: 'Fiyat soran', color: 'amber' },
  { id: 4, name: 'Tekrar alan', color: 'green' },
  { id: 5, name: 'Şikayetçi', color: 'rose', isSystem: true },
  { id: 6, name: 'Yeni müşteri', color: 'neutral', isSystem: true },
];

interface DemoChannel {
  id: number;
  name: string;
  type: ChannelType;
}

export const DEMO_CHANNELS: DemoChannel[] = [
  { id: 1, name: 'WhatsApp Mağaza A', type: CHANNEL_TYPE.WhatsApp },
  { id: 2, name: 'Instagram Mağaza A', type: CHANNEL_TYPE.Instagram },
  { id: 3, name: 'WhatsApp Store C (UK)', type: CHANNEL_TYPE.WhatsApp },
  { id: 4, name: 'Facebook Mağaza B', type: CHANNEL_TYPE.Facebook },
  { id: 5, name: 'E-posta Destek', type: CHANNEL_TYPE.Email },
];

// Kurgusal araç markaları: gerçek üretici adı kullanılmaz.
const VEHICLES = [
  { make: 'Arvento', model: 'Sedan S', generation: 'Mk2', bodyType: 'sedan' },
  { make: 'Kestrel', model: 'Cross', generation: 'B7', bodyType: 'suv' },
  { make: 'Novara', model: 'Hatch', generation: 'Mk7', bodyType: 'hatchback' },
  { make: 'Lumen', model: 'Estate', generation: 'C3', bodyType: 'estate' },
];
const PAYMENT_PREFERENCES = ['Kredi kartı', 'Havale / EFT', 'Kapıda ödeme'];
const NOTE_BODIES = [
  'Hafta sonu teslimat istedi.',
  'Toplu alım için fiyat teklifi bekliyor.',
  'Paspas ölçüsü konusunda tekrar aranacak.',
];
const AGENT_NAMES = ['Demo Kullanıcı', 'Destek Temsilcisi'];

export interface DemoProfile extends CustomerProfileDto {
  /** Ham telefon (başında + yok); liste satırı için. */
  phoneDigits: string;
  email: string;
}

const isUkCity = (city: string): boolean => UK_CITIES.includes(city);
const digitsOf = (text: string): string => text.replace(/\D/g, '');

function phoneFor(customer: DemoCustomer, rng: Rng): string {
  return isUkCity(customer.city) ? `447${rng.int(100, 999)}${rng.int(100000, 999999)}` : digitsOf(customer.phone);
}

function pickChannels(rng: Rng, isUk: boolean, profileId: number): CustomerChannelDto[] {
  const primary = DEMO_CHANNELS[isUk ? 2 : rng.int(0, 1)];
  const extras = rng.chance(0.4) ? [DEMO_CHANNELS[rng.chance(0.5) ? 3 : 4]] : [];
  return [primary, ...extras].map((channel, index) => ({
    contactId: profileId * 10 + index,
    channelId: channel.id,
    channelName: channel.name,
    channelType: channel.type,
    externalId: `${channel.type}-${profileId}-${index}`,
    displayName: null,
    latestConversationId: profileId * 100 + index,
  }));
}

function buildVehicles(rng: Rng, profileId: number): CustomerVehicleDto[] {
  if (!rng.chance(0.65)) return [];
  const vehicle = rng.pick(VEHICLES);
  return [{
    id: profileId * 10,
    make: vehicle.make,
    model: vehicle.model,
    year: rng.int(2012, 2024),
    generation: vehicle.generation,
    bodyType: vehicle.bodyType,
    lastConfirmedAt: ago(rng.int(3, 90)),
    isPrimary: true,
    source: rng.chance(0.5) ? DATA_SOURCE.Bot : DATA_SOURCE.Agent,
    updatedAt: ago(rng.int(3, 90)),
  }];
}

function buildAddresses(rng: Rng, customer: DemoCustomer, profileId: number, isUk: boolean): CustomerAddressDto[] {
  if (!rng.chance(0.6)) return [];
  return [{
    id: profileId * 10,
    fullName: customer.name,
    phone: null,
    country: isUk ? 'United Kingdom' : 'Türkiye',
    city: customer.city,
    district: isUk ? null : 'Merkez',
    addressLine: isUk ? `${rng.int(1, 99)} Station Road` : `Cumhuriyet Mah. Gül Sok. No:${rng.int(1, 80)}`,
    postalCode: isUk ? `M${rng.int(1, 20)} ${rng.int(1, 9)}AB` : String(rng.int(10000, 59999)),
    isDefault: true,
    lastUsedAt: ago(rng.int(2, 60)),
  }];
}

function buildFacts(rng: Rng, customer: DemoCustomer, isUk: boolean): CustomerFactDto[] {
  const fact = (key: string, label: string, value: string, source: DataSource): CustomerFactDto => ({
    key, label, value, confidence: source === DATA_SOURCE.Agent ? 1 : 0.85,
    source, conversationId: null, sourceMessageId: null, updatedAt: ago(rng.int(1, 80)),
  });
  return [
    fact('full_name', 'Ad soyad', customer.name, DATA_SOURCE.Agent),
    fact('city', 'Şehir', customer.city, DATA_SOURCE.Bot),
    fact('preferred_language', 'Tercih edilen dil', isUk ? 'en' : 'tr', DATA_SOURCE.Bot),
    fact('payment_preference', 'Ödeme tercihi', rng.pick(PAYMENT_PREFERENCES), DATA_SOURCE.Bot),
  ];
}

function buildInterests(rng: Rng, profileId: number, isUk: boolean): CustomerInterestDto[] {
  return Array.from({ length: rng.int(0, 3) }, (_, index) => {
    const product = rng.pick(DEMO_PRODUCTS);
    const firstAskedAt = ago(rng.int(10, 120));
    return {
      id: profileId * 10 + index,
      productName: product.name,
      sku: product.sku,
      categoryName: product.category,
      vehicleText: null,
      status: rng.pick(Object.values(INTEREST_STATUS)),
      lastQuotedPrice: product.price,
      currency: isUk ? 'GBP' : 'TRY',
      askCount: rng.int(1, 4),
      firstAskedAt,
      lastAskedAt: ago(rng.int(0, 9)),
      conversationId: profileId * 100,
    };
  });
}

function buildChatOrders(rng: Rng, profileId: number, isUk: boolean): CustomerChatOrderSummaryDto[] {
  if (!rng.chance(0.4)) return [];
  const product = rng.pick(DEMO_PRODUCTS);
  return [{
    id: profileId,
    publicNo: `SO-${2000 + profileId}`,
    conversationId: profileId * 100,
    status: rng.pick([CHAT_ORDER_STATUS.Confirmed, CHAT_ORDER_STATUS.Paid, CHAT_ORDER_STATUS.Shipped]),
    total: product.price,
    currency: isUk ? 'GBP' : 'TRY',
    itemCount: rng.int(1, 3),
    createdAt: ago(rng.int(2, 70)),
    confirmedAt: ago(rng.int(1, 60)),
  }];
}

function buildNotes(rng: Rng, profileId: number): CustomerNoteDto[] {
  if (!rng.chance(0.3)) return [];
  return [{
    id: profileId,
    authorUserId: 1,
    authorName: rng.pick(AGENT_NAMES),
    body: rng.pick(NOTE_BODIES),
    isPinned: rng.chance(0.3),
    createdAt: ago(rng.int(1, 40)),
  }];
}

function buildProfile(customer: DemoCustomer, rng: Rng): DemoProfile {
  const isUk = isUkCity(customer.city);
  const phoneDigits = phoneFor(customer, rng);
  const identities: CustomerIdentityDto[] = [
    { id: customer.id * 10, type: IDENTITY_TYPE.Phone, value: phoneDigits, verified: rng.chance(0.8) },
    { id: customer.id * 10 + 1, type: IDENTITY_TYPE.Email, value: customer.email, verified: rng.chance(0.4) },
  ];
  const createdAt = ago(rng.int(PROFILE_AGE_RANGE_DAYS[0], PROFILE_AGE_RANGE_DAYS[1]));
  const stages = [LIFECYCLE_STAGE.Lead, LIFECYCLE_STAGE.Customer, LIFECYCLE_STAGE.Customer, LIFECYCLE_STAGE.Vip, LIFECYCLE_STAGE.Churned];
  return {
    id: customer.id,
    displayName: customer.name,
    countryCode: isUk ? 'UK' : 'TR',
    lifecycleStage: rng.pick(stages),
    ownerUserId: 1,
    marketingOptIn: rng.chance(0.6),
    marketingOptInAt: null,
    anonymizedAt: null,
    createdAt,
    lastSeenAt: ago(rng.int(0, 30), rng.int(0, 23)),
    preferredLanguage: isUk ? 'en' : 'tr',
    firstSeenAt: createdAt,
    pendingMergeSuggestions: 0,
    identities: rng.chance(0.85) ? identities : identities.slice(0, 1),
    channels: pickChannels(rng, isUk, customer.id),
    vehicles: buildVehicles(rng, customer.id),
    addresses: buildAddresses(rng, customer, customer.id, isUk),
    facts: buildFacts(rng, customer, isUk),
    interests: buildInterests(rng, customer.id, isUk),
    chatOrders: buildChatOrders(rng, customer.id, isUk),
    tags: rng.chance(0.5) ? [rng.pick(DEMO_TAGS)] : [],
    notes: buildNotes(rng, customer.id),
    phoneDigits,
    email: customer.email,
  };
}

function buildProfiles(): DemoProfile[] {
  const rng = createRng(CUSTOMER_SEED);
  return DEMO_CUSTOMERS.map((customer) => buildProfile(customer, rng));
}

export const DEMO_PROFILES: DemoProfile[] = buildProfiles();
