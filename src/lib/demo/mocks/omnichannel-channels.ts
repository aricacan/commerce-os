// Kanallar ve profiller: kanal listesi/ekip, teşhis, etkin ayarlar, kanala özel bot, bağlantı yapılandırmaları, test alanı.
import type {
  ChannelDiagnosisDto, EmbeddedSignupConfigDto, HistoryImportJobStatusDto, MetaPagesConfigDto, SandboxSessionDto,
  BotTestScenarioDto, BotCatalogQualityDto,
} from '../../api/omnichannel';
import type { ChannelBotOverrideDto, BotThresholdValues } from '../../api/omnichannel-channel-bot';
import type { ChannelEffectiveSettingsDto, ChannelFlagDto } from '../../api/omnichannel-channel-settings';
import type { FeatureFlagMatrixDto } from '../../api/omnichannel-flags';
import type { BotPipelineChannelDto, BotSkillsDto } from '../../api/omnichannel-pipelines';
import type { BotPipelinesDto } from '../../api/omnichannel-eval';
import {
  BOT_MENU, BOT_SETTINGS, BOT_TEXTS, CATALOG_PROFILES, CATALOG_SOURCES, CROSS_SELL_RULES, HANDOFF_ROUTES, PAYMENT_OPTIONS,
} from '../data/omnichannel-settings-data';
import { DEMO_BRANDS, DEMO_CHANNELS, DEMO_COUNTRIES } from '../data/omnichannel-core';
import { channelMembers, memberCandidates } from '../data/omnichannel-teams';
import { ago } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { idParam, notFound } from './omnichannel-http';

const FLAG_NAMES = [
  'EnableOrders', 'EnableFollowUps', 'FollowUpAutoSend', 'PilotMode', 'EnableCrossSell', 'EnableBankMatch',
  'EnableMediaUnderstanding', 'EnableAgentConsult',
] as const;
const FLAG_VALUES: Record<(typeof FLAG_NAMES)[number], boolean> = {
  EnableOrders: true, EnableFollowUps: true, FollowUpAutoSend: false, PilotMode: false, EnableCrossSell: true,
  EnableBankMatch: true, EnableMediaUnderstanding: true, EnableAgentConsult: false,
};
const TENANT_WIDE_FLAGS = new Set<string>(['EnableBankMatch']);

function featureFlagMatrix(): FeatureFlagMatrixDto {
  return {
    flags: FLAG_NAMES.map((flag) => ({ flag, globalValue: FLAG_VALUES[flag], overridable: !TENANT_WIDE_FLAGS.has(flag) })),
    scopes: [
      { brandId: 1, brandName: 'Demo Oto Aksesuar', country: 'TR' },
      { brandId: 2, brandName: 'Demo Auto UK', country: 'UK' },
    ],
    overrides: [{ id: 1, flag: 'FollowUpAutoSend', brandId: 2, country: 'UK', enabled: true }],
  };
}

function effectiveFlags(): ChannelFlagDto[] {
  return FLAG_NAMES.map((flag) => ({
    flag, globalValue: FLAG_VALUES[flag], value: FLAG_VALUES[flag], scope: 'Global', overridable: !TENANT_WIDE_FLAGS.has(flag), overrideId: null,
  }));
}

function thresholds(): BotThresholdValues {
  return {
    autoAnswerThreshold: BOT_SETTINGS.autoAnswerThreshold, ambiguityThreshold: BOT_SETTINGS.ambiguityThreshold,
    ambiguityGap: BOT_SETTINGS.ambiguityGap, photoMatchThreshold: BOT_SETTINGS.photoMatchThreshold ?? 0.85,
    maxConsecutiveReplies: BOT_SETTINGS.maxConsecutiveReplies, sessionGapDays: BOT_SETTINGS.sessionGapDays ?? 3,
  };
}

const NO_OVERRIDES = {
  autoAnswerThreshold: null, ambiguityThreshold: null, ambiguityGap: null, photoMatchThreshold: null,
  maxConsecutiveReplies: null, sessionGapDays: null,
};

function effectiveSettings(request: DemoRequest): ChannelEffectiveSettingsDto | ReturnType<typeof notFound> {
  const channel = DEMO_CHANNELS.find((candidate) => candidate.id === idParam(request));
  if (!channel) return notFound();
  const profile = CATALOG_PROFILES.find((candidate) => candidate.id === channel.catalogProfileId) ?? CATALOG_PROFILES[0];
  const rows = PAYMENT_OPTIONS.filter((option) => option.country === channel.country || option.country === '*');
  return {
    channelId: channel.id,
    brandId: channel.brandId ?? null,
    brandName: channel.brandName ?? null,
    country: channel.country,
    flags: { items: effectiveFlags(), otherChannelsInScope: DEMO_CHANNELS.filter((c) => c.id !== channel.id && c.brandId === channel.brandId).map((c) => c.displayName) },
    payment: { level: 'BrandCountry', rows: rows.map((option) => ({ option, presented: option.isActive })), channelRowIds: [], profileRowIds: [] },
    catalog: {
      profileId: profile.id, profileName: profile.name, profileCountry: profile.country, isCountryDefault: true,
      sources: CATALOG_SOURCES.filter((source) => profile.productSourceIds.includes(source.id)).map((source) => ({
        id: source.id, name: source.displayName, kind: source.kind, country: source.country,
        role: source.id === profile.priceSourceId ? 'Fiyat' : 'Ürün', isActive: source.isActive, lastSyncAt: source.lastSyncAt,
        syncStatus: source.syncStatus, lastError: source.lastError, isWebsite: source.kind === 'Shopify',
      })),
    },
    rules: {
      crossSell: CROSS_SELL_RULES,
      handoff: HANDOFF_ROUTES.map((route) => ({
        id: route.id, name: route.name, eventType: route.eventType ?? 0, isActive: route.isActive,
        targetCount: route.userIds.length + route.emails.length,
      })),
    },
    bot: { hasAny: false, thresholds: { account: thresholds(), overrides: NO_OVERRIDES, effective: thresholds() }, menuIsCustom: false, menuOptionCount: BOT_MENU.length, customTextCount: 0 },
  };
}

function botOverride(request: DemoRequest): ChannelBotOverrideDto {
  return {
    channelId: idParam(request), hasAny: false, version: 1, updatedAt: null,
    thresholds: { account: thresholds(), overrides: NO_OVERRIDES, effective: thresholds() },
    menu: { isCustom: false, options: BOT_MENU, accountMenu: BOT_MENU },
    texts: { customCount: 0, entries: BOT_TEXTS },
    liveVersion: null, shadowVersion: null,
  };
}

function diagnosis(request: DemoRequest): ChannelDiagnosisDto | ReturnType<typeof notFound> {
  const channel = DEMO_CHANNELS.find((candidate) => candidate.id === idParam(request));
  if (!channel) return notFound();
  const check = (key: string, title: string, summary: string) => ({
    key, title, status: 0 as const, summary, whatHappened: null, why: null, whatToDo: [], technicalDetail: null,
  });
  return {
    channelId: channel.id, channelName: channel.displayName, channelType: channel.type, verdict: 0,
    headline: 'Kanal sağlıklı çalışıyor', explanation: 'Tüm kontroller başarılı; mesajlar alınıyor ve gönderiliyor.',
    checks: [
      check('token', 'Erişim anahtarı', 'Anahtar geçerli.'),
      check('webhook', 'Webhook aboneliği', 'Son webhook birkaç dakika önce geldi.'),
      check('send', 'Mesaj gönderimi', 'Test gönderimi başarılı.'),
    ],
    checkedAt: new Date().toISOString(),
  };
}

const importStatus = (request: DemoRequest): HistoryImportJobStatusDto => ({
  state: 'Completed', errorMessage: null, progress: null,
  result: {
    channelId: idParam(request), conversationsScanned: 42, conversationsImported: 38, messagesImported: 611,
    messagesSkippedDuplicate: 12, attachmentsImported: 17, warnings: [], completedAt: ago(0, 1),
  },
});

const embeddedSignupConfig = (): EmbeddedSignupConfigDto => ({ appId: 'demo-app', configurationId: 'demo-config', configured: true, missingSettings: [] });
const metaPagesConfig = (): MetaPagesConfigDto => ({ appId: 'demo-app', graphApiVersion: 'v21.0', configured: true, configurationId: null, missingSettings: [] });

function pipelines(): BotPipelinesDto {
  return { versions: ['v3', 'v4'], default: 'v3', tenantDefault: 'v3', tenantDefaultShadow: 'v4', effectiveDefault: 'v3' };
}

function pipelineChannels(): BotPipelineChannelDto[] {
  return DEMO_CHANNELS.map((channel) => ({
    channelId: channel.id, name: channel.displayName, liveVersion: null, shadowVersion: channel.id === 1 ? 'v4' : null,
    effectiveLive: 'v3', effectiveShadow: channel.id === 1 ? 'v4' : 'v4',
  }));
}

function botSkills(): BotSkillsDto {
  return {
    skills: [
      { key: 'stock', name: 'Stok ve fiyat', description: 'Ürün arar, stok ve fiyat bilgisini söyler.', intents: ['stock', 'price'], tools: ['search_products', 'get_price'], modelTier: 'standard' },
      { key: 'fitment', name: 'Araç uyumluluğu', description: 'Araç marka/model/yıl ile ürün uyumunu doğrular.', intents: ['fitment'], tools: ['check_fitment'], modelTier: 'standard' },
      { key: 'orders', name: 'Sohbetten sipariş', description: 'Bilgi toplar, özet çıkarır ve onay alır.', intents: ['order'], tools: ['create_order', 'confirm_order'], modelTier: 'strong' },
      { key: 'shipping', name: 'Kargo takibi', description: 'Sipariş durumunu ve kargo takibini söyler.', intents: ['shipping'], tools: ['order_status'], modelTier: 'standard' },
    ],
    commonTools: ['handoff', 'answer_faq'],
    standardModel: 'demo-model-standard', strongModel: 'demo-model-strong',
  };
}

const sandboxSession = (request: DemoRequest): SandboxSessionDto => ({
  conversationId: 0, country: request.query.get('country') ?? 'TR', isBotActive: true, messages: [],
  debug: {
    pendingAction: '', vehicleYear: null, brand: null, model: null, thicknessMm: null, color: null, bodyStyle: null,
    package: null, lastIntent: null, lastTools: null, lastAction: null, lastDurationMs: null, lastFailure: null,
  },
});

const SANDBOX_SCENARIOS: BotTestScenarioDto[] = [
  { id: 's1', suite: 'smoke', category: 'Stok', name: 'Stok sorgusu', steps: ['Passat B8 paspas var mı?'], expected: 'Stok ve fiyat bilgisi verilir.' },
  { id: 's2', suite: 'smoke', category: 'Devir', name: 'Şikâyet devri', steps: ['Ürün bozuk geldi'], expected: 'Konuşma temsilciye devredilir.' },
  { id: 's3', suite: 'full', category: 'Sipariş', name: 'Sipariş toplama', steps: ['2 adet sipariş vermek istiyorum'], expected: 'Adres ve ödeme sorulur.' },
];

const catalogQuality = (): BotCatalogQualityDto => ({
  totalProducts: 1696, missingBrand: 14, missingModel: 62, missingModelYear: 103, missingColor: 41, duplicateSkuGroups: 3, withoutThicknessInName: 27,
});

export const channelRoutes: DemoRoute[] = [
  get('/omnichannel/channels', () => DEMO_CHANNELS),
  get('/omnichannel/channels/:id/members', (request) => channelMembers(idParam(request))),
  get('/omnichannel/channels/:id/member-candidates', (request) => memberCandidates(idParam(request))),
  get('/omnichannel/channels/:id/diagnosis', diagnosis),
  get('/omnichannel/channels/:id/effective-settings', effectiveSettings),
  get('/omnichannel/channels/:id/bot-override', botOverride),
  get('/omnichannel/channels/:id/import-history/status/:jobId', importStatus),
  get('/omnichannel/whatsapp/embedded-signup/config', embeddedSignupConfig),
  get('/omnichannel/whatsapp/connections/:id/templates', () => [
    { id: 't1', name: 'siparis_hazir', status: 'APPROVED', language: 'tr', category: 'UTILITY' },
    { id: 't2', name: 'order_dispatched', status: 'APPROVED', language: 'en', category: 'UTILITY' },
  ]),
  get('/omnichannel/meta-pages/config', metaPagesConfig),
  get('/omnichannel/meta-pages/authorize-url', () => ({ url: 'https://example.com/oauth', state: 'demo' })),
  get('/omnichannel/brands', () => DEMO_BRANDS),
  get('/omnichannel/countries/access', () => ({ canEdit: true })),
  get('/omnichannel/countries', () => DEMO_COUNTRIES),
  get('/omnichannel/feature-flags', featureFlagMatrix),
  get('/omnichannel/bot-pipelines', pipelines),
  get('/omnichannel/bot-pipelines/channels', pipelineChannels),
  get('/omnichannel/bot-pipelines/skills', botSkills),
  get('/omnichannel/sandbox', sandboxSession),
  get('/omnichannel/sandbox/scenarios', () => SANDBOX_SCENARIOS),
  get('/omnichannel/sandbox/catalog-quality', catalogQuality),
];
