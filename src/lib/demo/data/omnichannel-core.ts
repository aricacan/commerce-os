// Omnichannel demo verisinin sabit çekirdeği: kanallar, markalar, ekip, ülkeler, müşteri kişileri.
// Yalnız tip import edilir (değer import'u api -> demo döngüsü yaratır); enum değerleri sayı olarak yazılır.
import type { BrandDto, ChannelDto, CountryDto, TeamCandidateDto } from '../../api/omnichannel';
import { ago } from '../seed';

export const CHANNEL_KIND = { WhatsApp: 1, Instagram: 2, Facebook: 3, Email: 5 } as const;
const STATUS_CONNECTED = 3;
const POLICY_ROUND_ROBIN = 2;
const POLICY_LEAST_LOADED = 3;
export const DEMO_BRAND_TR = 1;
export const DEMO_BRAND_UK = 2;
const SLA_MINUTES = 30;
const DEMO_CREATED_DAYS_AGO = 120;

export const DEMO_BRANDS: BrandDto[] = [
  { id: DEMO_BRAND_TR, name: 'Demo Oto Aksesuar', slug: 'demo-oto', defaultCountry: 'TR', isActive: true, sortOrder: 1, channelCount: 4 },
  { id: DEMO_BRAND_UK, name: 'Demo Auto UK', slug: 'demo-auto-uk', defaultCountry: 'UK', isActive: true, sortOrder: 2, channelCount: 2 },
];

interface ChannelSeed {
  id: number;
  type: ChannelDto['type'];
  name: string;
  external: string;
  storeCode: string;
  country: 'TR' | 'UK';
  brandId: number;
  lastWebhookMinutes: number | null;
  agentCount: number;
}

const CHANNEL_SEEDS: ChannelSeed[] = [
  { id: 1, type: CHANNEL_KIND.WhatsApp, name: 'WhatsApp Türkiye', external: '+90 500 000 00 01', storeCode: 'store-a', country: 'TR', brandId: DEMO_BRAND_TR, lastWebhookMinutes: 2, agentCount: 4 },
  { id: 2, type: CHANNEL_KIND.WhatsApp, name: 'WhatsApp UK', external: '+44 7700 900001', storeCode: 'store-c', country: 'UK', brandId: DEMO_BRAND_UK, lastWebhookMinutes: 11, agentCount: 2 },
  { id: 3, type: CHANNEL_KIND.Instagram, name: 'Instagram @demo.oto.aksesuar', external: 'demo.oto.aksesuar', storeCode: 'store-a', country: 'TR', brandId: DEMO_BRAND_TR, lastWebhookMinutes: 6, agentCount: 3 },
  { id: 4, type: CHANNEL_KIND.Facebook, name: 'Facebook Demo Oto Aksesuar', external: 'demo-oto-aksesuar', storeCode: 'store-b', country: 'TR', brandId: DEMO_BRAND_TR, lastWebhookMinutes: 38, agentCount: 3 },
  { id: 5, type: CHANNEL_KIND.Email, name: 'E-posta destek', external: 'destek@example.com', storeCode: 'store-a', country: 'TR', brandId: DEMO_BRAND_TR, lastWebhookMinutes: 15, agentCount: 3 },
  { id: 6, type: CHANNEL_KIND.Email, name: 'E-posta UK support', external: 'support@example.co.uk', storeCode: 'store-c', country: 'UK', brandId: DEMO_BRAND_UK, lastWebhookMinutes: 54, agentCount: 2 },
];

export const DEMO_CHANNELS: ChannelDto[] = CHANNEL_SEEDS.map((seed) => ({
  id: seed.id,
  type: seed.type,
  displayName: seed.name,
  externalIdentifier: seed.external,
  storeCode: seed.storeCode,
  country: seed.country,
  catalogProfileId: seed.country === 'TR' ? 1 : 2,
  brandId: seed.brandId,
  brandName: DEMO_BRANDS.find((brand) => brand.id === seed.brandId)?.name ?? null,
  status: STATUS_CONNECTED,
  lastError: null,
  lastHeartbeatAt: ago(0, 0, 3),
  lastWebhookAt: seed.lastWebhookMinutes === null ? null : ago(0, 0, seed.lastWebhookMinutes),
  botEnabled: true,
  welcomeMessageTr: 'Merhaba! Demo Oto Aksesuar\'a hoş geldiniz. Size nasıl yardımcı olabilirim?',
  welcomeMessageEn: 'Hello! Welcome to Demo Auto. How can I help you today?',
  welcomeMessageSq: null,
  assignmentPolicy: seed.country === 'TR' ? POLICY_ROUND_ROBIN : POLICY_LEAST_LOADED,
  fixedAgentUserId: null,
  fixedAgentFallback: 0,
  firstResponseSlaMinutes: SLA_MINUTES,
  isActive: true,
  hasCredentials: true,
  agentCount: seed.agentCount,
  createdAt: ago(DEMO_CREATED_DAYS_AGO),
  updatedAt: ago(3),
}));

/** Demo hesabı (id 1) + kurgusal ekip arkadaşları. */
export const DEMO_AGENTS: TeamCandidateDto[] = [
  { userId: 1, displayName: 'Demo Kullanıcı', email: 'demo@demo.com' },
  { userId: 2, displayName: 'Ece Operasyon', email: 'ece@example.com' },
  { userId: 3, displayName: 'Burak Destek', email: 'burak@example.com' },
  { userId: 4, displayName: 'Zeynep Satış', email: 'zeynep@example.com' },
  { userId: 5, displayName: 'Emre Lojistik', email: 'emre@example.com' },
];

export const DEMO_USER_ID = 1;

export function agentName(userId: number | null): string | null {
  return DEMO_AGENTS.find((agent) => agent.userId === userId)?.displayName ?? null;
}

export function channelById(channelId: number): ChannelDto {
  return DEMO_CHANNELS.find((channel) => channel.id === channelId) ?? DEMO_CHANNELS[0];
}

export const DEMO_COUNTRIES: CountryDto[] = [
  {
    code: 'TR', name: 'Türkiye', defaultLanguage: 'tr', currencyCode: 'TRY', timeZone: 'Europe/Istanbul',
    phonePrefixes: ['+90'], aliases: ['Turkiye', 'Turkey'], flagEmoji: '🇹🇷', catalogStatus: 'Live', isActive: true, sortOrder: 1,
  },
  {
    code: 'UK', name: 'Birleşik Krallık', defaultLanguage: 'en', currencyCode: 'GBP', timeZone: 'Europe/London',
    phonePrefixes: ['+44'], aliases: ['United Kingdom', 'England'], flagEmoji: '🇬🇧', catalogStatus: 'Live', isActive: true, sortOrder: 2,
  },
  {
    code: 'KS', name: 'Kosova', defaultLanguage: 'sq', currencyCode: 'EUR', timeZone: 'Europe/Belgrade',
    phonePrefixes: ['+383'], aliases: ['Kosovo'], flagEmoji: '🇽🇰', catalogStatus: 'NotConfigured', isActive: false, sortOrder: 3,
  },
];

export interface DemoContact {
  name: string;
  lang: 'tr' | 'en';
  city: string;
  phone: string;
  email: string;
}

const TR_CONTACTS: [string, string][] = [
  ['Murat Efe', 'İstanbul'], ['Gizem Tan', 'Ankara'], ['Kaan Özkan', 'İzmir'], ['Derya Polat', 'Bursa'],
  ['Barış Yaman', 'Antalya'], ['Hande Sezer', 'Konya'], ['Onur Karaca', 'Adana'], ['Pınar Güneş', 'Gaziantep'],
  ['Tolga Erdem', 'İstanbul'], ['Sibel Aktaş', 'Eskişehir'], ['Volkan Doğan', 'Mersin'], ['Melis Bulut', 'İzmir'],
  ['Serkan Uçar', 'Kayseri'], ['İrem Yurt', 'İstanbul'], ['Cem Tuna', 'Ankara'], ['Aslı Kurt', 'Samsun'],
  ['Yusuf Sarı', 'Trabzon'], ['Buse Çınar', 'Bursa'], ['Gökhan Ateş', 'İstanbul'], ['Merve Aksu', 'Denizli'],
  ['Haluk Ergin', 'Antalya'], ['Nehir Balcı', 'İzmir'], ['Ozan Kılıç', 'Ankara'], ['Tuğba Yıldız', 'İstanbul'],
  ['Ferhat Duman', 'Diyarbakır'], ['Ceren Altın', 'Bursa'], ['Emir Taşkın', 'İstanbul'], ['Dilara Koçak', 'Ankara'],
];
const UK_CONTACTS: [string, string][] = [
  ['James Whitaker', 'London'], ['Olivia Hartley', 'Manchester'], ['Harry Pemberton', 'Leeds'], ['Chloe Ashworth', 'Bristol'],
  ['Daniel Fletcher', 'Birmingham'], ['Emily Rowntree', 'York'], ['Callum Brookes', 'Glasgow'], ['Isla Grantham', 'Leicester'],
  ['Rhys Llewellyn', 'Cardiff'], ['Poppy Hargreaves', 'Sheffield'],
];

const toAscii = (text: string): string =>
  text.toLocaleLowerCase('en').replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c] ?? c).replace(/\s+/g, '.');

function buildContacts(): DemoContact[] {
  const turkish = TR_CONTACTS.map(([name, city], index): DemoContact => ({
    name, city, lang: 'tr',
    phone: `+90 500 000 ${String(10 + index).padStart(2, '0')} ${String(20 + index).padStart(2, '0')}`,
    email: `${toAscii(name)}@example.com`,
  }));
  const british = UK_CONTACTS.map(([name, city], index): DemoContact => ({
    name, city, lang: 'en',
    phone: `+44 7700 900${String(100 + index)}`,
    email: `${toAscii(name)}@example.co.uk`,
  }));
  return [...turkish, ...british];
}

/** Sıra = müşteri profili / kişi (contact) kimliği - 1. */
export const DEMO_CONTACTS: DemoContact[] = buildContacts();
