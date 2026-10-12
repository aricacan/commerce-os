// Hesap/kanal ayarlarının sabit demo içeriği: menü, bot metinleri, ödeme, katalog kaynakları, devir kuralları.
import type {
  BotMenuOptionDto, BotSettingsDto, BotTextEntryDto, CrossSellRuleDto, IgnoredContactDto, PaymentOptionDto, AliasDto,
  AliasSuggestionDto,
} from '../../api/omnichannel';
import type {
  CatalogProfileDto, CatalogSiteSourceDto, CatalogSourceDto, CatalogPriceRuleDto,
} from '../../api/omnichannel-catalog';
import type { HandoffRouteDto } from '../../api/omnichannel-handoff-routes';
import type { OrderDestinationRuleDto } from '../../api/omnichannel-order-destinations';
import { DEMO_CHANNELS } from './omnichannel-core';
import { ago } from '../seed';

const FICTIONAL_TR_IBAN = 'TR00 0000 0000 0000 0000 0000 00';
const FICTIONAL_UK_IBAN = 'GB00 DEMO 0000 0000 0000 00';

export const BOT_SETTINGS: BotSettingsDto = {
  autoAnswerThreshold: 0.78, ambiguityThreshold: 0.45, ambiguityGap: 0.12, workingHoursStart: 9, workingHoursEnd: 19,
  maxConsecutiveReplies: 6, sessionGapDays: 3, debounceQuietSeconds: 10, debounceMaxSeconds: 20,
  sendProductPhoto: true, escalateWhenOutOfStock: false, showMenuOnFirstContact: true, enableAi: true,
  enableStock: true, enablePrice: true, enableShipping: true, enableFitment: true, enableOrders: true,
  enableBotReturn: true, enableFollowUps: true, followUpAutoSend: false, enableCrossSell: true, enableBankMatch: true,
  enableMediaUnderstanding: true, enableAgentConsult: false, photoMatchThreshold: 0.85, pilotMode: false,
};

export const BOT_MENU: BotMenuOptionDto[] = [
  { action: 1, order: 1, labelTr: 'Stok sorgula', labelEn: 'Check stock', triggersTr: ['stok', 'var mı'], triggersEn: ['stock', 'available'], isActive: true, id: 'stock' },
  { action: 2, order: 2, labelTr: 'Araç uyumluluğu', labelEn: 'Vehicle fitment', triggersTr: ['uyar mı', 'uyumlu'], triggersEn: ['fit', 'compatible'], isActive: true, id: 'fitment' },
  { action: 3, order: 3, labelTr: 'Kargo bilgisi', labelEn: 'Shipping info', triggersTr: ['kargo', 'sipariş nerede'], triggersEn: ['delivery', 'tracking'], isActive: true, id: 'shipping' },
  { action: 4, order: 4, labelTr: 'Fiyat öğren', labelEn: 'Get a price', triggersTr: ['fiyat', 'kaç para'], triggersEn: ['price', 'how much'], isActive: true, id: 'price' },
  { action: 6, order: 5, labelTr: 'İade ve değişim', labelEn: 'Returns', triggersTr: ['iade', 'değişim'], triggersEn: ['return', 'refund'], isActive: true, id: 'returns', replyTr: 'Kullanılmamış ürünleri 14 gün içinde iade edebilirsiniz.', replyEn: 'Unused items can be returned within 30 days.' },
  { action: 5, order: 6, labelTr: 'Temsilciyle görüş', labelEn: 'Talk to an agent', triggersTr: ['temsilci', 'yetkili'], triggersEn: ['agent', 'human'], isActive: true, id: 'human' },
];

const TEXT_DEFS: [number, string, string, string, string][] = [
  [1, 'İlk karşılama', 'Müşteri ilk yazdığında gönderilir.', 'Merhaba! Demo Oto Aksesuar\'a hoş geldiniz.', 'Hello! Welcome to Demo Auto.'],
  [2, 'Menü ipucu', 'Menünün altındaki yönlendirme cümlesi.', 'Aşağıdaki seçeneklerden birini yazabilirsiniz.', 'You can type one of the options below.'],
  [3, 'Temsilci talebi', 'Müşteri temsilci istediğinde.', 'Sizi bir temsilcimize aktarıyorum.', 'I am passing you to a team member.'],
  [4, 'Şikâyet devri', 'Şikâyet algılandığında.', 'Yaşadığınız sorun için üzgünüz, hemen ilgileniyoruz.', 'We are sorry to hear that, we will look into it right away.'],
  [5, 'Diğer devirler', 'Diğer nedenlerle devirde.', 'Talebinizi ekibimize ilettim.', 'I have passed your request to our team.'],
  [8, 'Sipariş yönlendirme', 'Sohbetten sipariş başlarken.', 'Siparişiniz için birkaç bilgiye ihtiyacım var.', 'I need a few details for your order.'],
  [9, 'Devir bildirimi', 'Talep numarası ve süre.', 'Talebiniz alındı, ortalama 30 dakika içinde dönüş yapılır.', 'Your request is logged; we usually reply within 30 minutes.'],
  [10, 'Mesai dışı devir', 'Mesai dışında devirde.', 'Mesai saatlerimiz dışındayız; sabah ilk iş dönüş yapacağız.', 'We are outside working hours; we will reply first thing.'],
  [11, 'Bekleme notu', 'Müşteri beklerken.', 'Notunuzu aldık, ekibimiz kısa sürede yazacak.', 'Noted - our team will write to you shortly.'],
];

export const BOT_TEXTS: BotTextEntryDto[] = TEXT_DEFS.map(([key, title, description, tr, en]) => ({
  key: key as BotTextEntryDto['key'], title, description, defaultTr: tr, defaultEn: en, defaultSq: '', tr: null, en: null, sq: null,
}));

export const ALIASES: AliasDto[] = [
  { id: 1, wrongTerm: 'pasbas', correctTerm: 'paspas', source: 1, timesUsed: 38, lastUsedAt: ago(0, 6), isActive: true, createdAt: ago(40) },
  { id: 2, wrongTerm: 'bagaj havuzzu', correctTerm: 'bagaj havuzu', source: 2, timesUsed: 12, lastUsedAt: ago(2), isActive: true, createdAt: ago(21) },
  { id: 3, wrongTerm: 'silesör', correctTerm: 'silecek', source: 0, timesUsed: 9, lastUsedAt: ago(5), isActive: true, createdAt: ago(60) },
  { id: 4, wrongTerm: 'koltuk kilifi', correctTerm: 'koltuk kılıfı', source: 2, timesUsed: 17, lastUsedAt: ago(1), isActive: true, createdAt: ago(18) },
];

export const ALIAS_SUGGESTIONS: AliasSuggestionDto[] = [
  { term: 'tavan barı', occurrences: 5, lastSeenAt: ago(0, 9), suggestedCorrections: ['tavan taşıyıcı'] },
  { term: 'far ampülü', occurrences: 4, lastSeenAt: ago(1), suggestedCorrections: ['LED far ampulü'] },
];

export const IGNORED_CONTACTS: IgnoredContactDto[] = [
  { id: 1, phoneNumber: '+90 500 000 99 01', label: 'Depo hattı', createdAt: ago(50) },
  { id: 2, phoneNumber: '+90 500 000 99 02', label: 'Kurye', createdAt: ago(32) },
];

export const PAYMENT_OPTIONS: PaymentOptionDto[] = [
  { id: 1, brandId: 1, country: 'TR', method: 1, isActive: true, sortOrder: 1, bankName: 'Demo Banka', accountHolder: 'Demo Oto Aksesuar', iban: FICTIONAL_TR_IBAN },
  { id: 2, brandId: 1, country: 'TR', method: 2, isActive: true, sortOrder: 2, bankName: null, accountHolder: null, iban: null },
  { id: 3, brandId: 2, country: 'UK', method: 1, isActive: true, sortOrder: 1, bankName: 'Demo Bank UK', accountHolder: 'Demo Auto UK', iban: FICTIONAL_UK_IBAN },
  { id: 4, brandId: null, country: '*', method: 3, isActive: false, sortOrder: 9, bankName: null, accountHolder: null, iban: null, websiteUrl: 'https://example.com', messageTemplate: 'Siparişiniz için: {link}' },
];

export const CROSS_SELL_RULES: CrossSellRuleDto[] = [
  { id: 1, brandId: null, fromCategoryId: 1, toCategoryId: 3, isActive: true, sortOrder: 1 },
  { id: 2, brandId: 1, fromCategoryId: 2, toCategoryId: 6, isActive: true, sortOrder: 2 },
];

export const CATALOG_SOURCES: CatalogSourceDto[] = [
  { id: 1, code: 'demo-erp-tr', displayName: 'Demo ERP Türkiye', kind: 'Erp', country: 'TR', brandName: 'Demo Oto Aksesuar', isActive: true, lastSyncAt: ago(0, 1), syncStatus: 'Başarılı', lastError: null, activeProducts: 1696 },
  { id: 2, code: 'demo-shop-tr', displayName: 'Demo Mağaza (TR)', kind: 'Shopify', country: 'TR', brandName: 'Demo Oto Aksesuar', isActive: true, lastSyncAt: ago(0, 3), syncStatus: 'Başarılı', lastError: null, activeProducts: 1420 },
  { id: 3, code: 'demo-erp-uk', displayName: 'Demo ERP UK', kind: 'Erp', country: 'UK', brandName: 'Demo Auto UK', isActive: true, lastSyncAt: ago(0, 2), syncStatus: 'Başarılı', lastError: null, activeProducts: 812 },
  { id: 4, code: 'demo-shop-uk', displayName: 'Demo Store (UK)', kind: 'Shopify', country: 'UK', brandName: 'Demo Auto UK', isActive: false, lastSyncAt: ago(4), syncStatus: 'Hata', lastError: 'Kimlik doğrulama başarısız (demo).', activeProducts: 0 },
];

const channelsOf = (country: string) => DEMO_CHANNELS.filter((channel) => channel.country === country)
  .map((channel) => ({ id: channel.id, displayName: channel.displayName, type: channel.type }));

export const CATALOG_PROFILES: CatalogProfileDto[] = [
  { id: 1, name: 'Türkiye varsayılan', country: 'TR', productSourceIds: [1, 2], priceSourceId: 2, stockMode: 0, stockSourceId: null, linkMode: 0, linkSourceId: null, unlistedPriceMode: 0, channels: channelsOf('TR') },
  { id: 2, name: 'UK varsayılan', country: 'UK', productSourceIds: [3], priceSourceId: 3, stockMode: 1, stockSourceId: 3, linkMode: 2, linkSourceId: null, unlistedPriceMode: 1, channels: channelsOf('UK') },
];

export const CATALOG_SITE_SOURCES: CatalogSiteSourceDto[] = [
  {
    id: 1, name: 'Demo Mağaza Sitesi', country: 'TR', kind: 'Shopify', baseUrl: 'https://shop.example.com', currency: 'TRY',
    syncIntervalHours: 6, isActive: true, lastSyncAt: ago(0, 2), syncStatus: 'Başarılı', lastError: null, lastItemCount: 1420,
    lastSkippedCount: 12, activeItems: 1420, useForUnprofiledChannels: false,
  },
];

export const PRICE_RULES: CatalogPriceRuleDto[] = [
  { id: 1, keywords: 'tavan barı', price: 1850, sortOrder: 1, isActive: true },
  { id: 2, keywords: 'oto kokusu', price: 79, sortOrder: 2, isActive: true },
];

export const HANDOFF_ROUTES: HandoffRouteDto[] = [
  {
    id: 1, name: 'Şikâyetler → Operasyon', eventType: 0, country: '*', reasons: [2], hours: 0, slackChannelIds: [], userIds: [2, 3],
    emails: ['ops@example.com'], isActive: true, lastDeliveryAt: ago(0, 4), lastError: null,
  },
  {
    id: 2, name: 'Yeni siparişler → Lojistik', eventType: 1, country: 'TR', reasons: [], paymentMethods: [1, 2], hours: 1, slackChannelIds: [],
    userIds: [5], emails: [], isActive: true, lastDeliveryAt: ago(0, 1), lastError: null,
  },
  {
    id: 3, name: 'Cevap bekleyenler (mesai dışı)', eventType: 2, country: '*', reasons: [], hours: 2, slackChannelIds: [],
    userIds: [1], emails: ['nobet@example.com'], isActive: false, lastDeliveryAt: null, lastError: null,
  },
];

export const ORDER_DESTINATION_RULES: OrderDestinationRuleDto[] = [
  { id: 1, channelId: null, catalogProfileId: null, brandId: 1, country: 'TR', kind: 1, targetId: 2, targetLabel: 'Demo Mağaza (TR)', updatedAt: ago(14) },
  { id: 2, channelId: null, catalogProfileId: null, brandId: 2, country: 'UK', kind: 0, targetId: null, targetLabel: 'Yalnız panelde tut', updatedAt: ago(14) },
];
