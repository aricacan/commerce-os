// Hesap geneli ayarlar: bot, menü/metin, sözlük, ödeme, katalog, banka, devir bildirimi, sipariş hedefi, e-posta, AI kullanımı.
import type {
  BankImportTemplateDto, BankTransactionDto, BankTransactionPageDto,
} from '../../api/omnichannel-bank';
import type { CatalogCoverageDto } from '../../api/omnichannel-catalog';
import type { BankMailboxSettingsDto } from '../../api/omnichannel-bank-mailbox';
import type { HandoffDeliverySettingsDto } from '../../api/omnichannel-handoff-delivery';
import type { OrderDestinationEffectiveDto, OrderDestinationOptionDto } from '../../api/omnichannel-order-destinations';
import type { OutboundEmailDto, OutboundEmailPageDto } from '../../api/omnichannel-email-outbound';
import type { CatchupPreviewDto } from '../../api/handoff-catchup';
import {
  ALIASES, ALIAS_SUGGESTIONS, BOT_MENU, BOT_SETTINGS, BOT_TEXTS, CATALOG_PROFILES, CATALOG_SITE_SOURCES, CATALOG_SOURCES,
  CROSS_SELL_RULES, HANDOFF_ROUTES, IGNORED_CONTACTS, ORDER_DESTINATION_RULES, PAYMENT_OPTIONS, PRICE_RULES,
} from '../data/omnichannel-settings-data';
import { DEMO_AGENTS, DEMO_CHANNELS } from '../data/omnichannel-core';
import { listRecords } from '../data/omnichannel-conversations';
import { ago, createRng } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { numberQuery, slicePage } from './omnichannel-http';

const BANK_PAGE_SIZE = 20;
const EMAIL_PAGE_SIZE = 25;
const BANK_RNG_SEED = 77;
const EMAIL_RNG_SEED = 88;
const BANK_ROW_COUNT = 14;
const EMAIL_ROW_COUNT = 40;
const CATCHUP_WINDOW_HOURS = 20;

const BANK_STATUS = { Unmatched: 0, Suggested: 1, Matched: 2, Ignored: 3 } as const;
const BANK_SENDERS = ['Ahmet Y.', 'Elif K.', 'Mehmet D.', 'Zeynep Ç.', 'Burak Ş.', 'Selin A.'];

function bankTransactions(): BankTransactionDto[] {
  const rng = createRng(BANK_RNG_SEED);
  return Array.from({ length: BANK_ROW_COUNT }, (_, index): BankTransactionDto => {
    const status = (index % 4) as BankTransactionDto['status'];
    const amount = rng.int(300, 2400);
    const order = { id: index + 1, publicNo: `EV-${10_400 + index * 7}`, fullName: BANK_SENDERS[index % BANK_SENDERS.length], total: amount, currency: 'TRY', status: 3 as const };
    return {
      id: index + 1, bookingDate: ago(index % 9), amount, currency: 'TRY',
      description: `EFT ${BANK_SENDERS[index % BANK_SENDERS.length]} ${status === BANK_STATUS.Matched ? order.publicNo : 'sipariş'}`,
      senderName: BANK_SENDERS[index % BANK_SENDERS.length], status,
      matchKind: (status === BANK_STATUS.Matched ? 1 : status === BANK_STATUS.Suggested ? 2 : 0) as BankTransactionDto['matchKind'],
      attentionNote: null,
      matchedOrder: status === BANK_STATUS.Matched ? order : null,
      suggestions: status === BANK_STATUS.Suggested ? [order] : [],
    };
  });
}

function bankPage(request: DemoRequest): BankTransactionPageDto {
  const all = bankTransactions();
  const status = numberQuery(request, 'status') ?? BANK_STATUS.Unmatched;
  const rows = all.filter((row) => row.status === status);
  const paged = slicePage(rows, request, BANK_PAGE_SIZE);
  const countOf = (value: number) => all.filter((row) => row.status === value).length;
  return {
    items: paged.items, total: rows.length, page: paged.page, pageSize: paged.pageSize,
    counts: { unmatched: countOf(0), suggested: countOf(1), matched: countOf(2), ignored: countOf(3) },
  };
}

const BANK_TEMPLATES: BankImportTemplateDto[] = [{
  id: 1, bankName: 'Demo Banka',
  mapping: {
    skipRows: 1, dateColumn: 0, amountColumn: 2, currencyColumn: 3, descriptionColumn: 1, senderColumn: 4,
    defaultCurrency: 'TRY', dateFormat: 0, decimalSeparator: 0, amountSign: 0,
  },
}];

const mailboxSettings = (): BankMailboxSettingsDto => ({
  isEnabled: true, imapHost: 'imap.example.com', imapPort: 993, security: 0, username: 'banka@example.com', hasPassword: true,
  allowedSenders: ['ekstre@example.com'], importTemplateId: 1, lastRunAt: ago(0, 0, 4), lastSuccessAt: ago(0, 0, 4),
  lastError: null, lastImportedCount: 3,
});

const deliverySettings = (): HandoffDeliverySettingsDto => ({
  smtpHost: 'smtp.example.com', smtpPort: 587, smtpSecurity: 0, smtpUsername: 'bildirim@example.com', hasSmtpPassword: true,
  smtpFromAddress: 'bildirim@example.com', smtpFromName: 'Demo Oto Aksesuar', smtpTrustedCertificateSha256: null,
  hasSlackToken: false, slackDefaultChannelId: null, usesCustomSmtp: true, usesCustomSlack: false,
});

function destinationOptions(): OrderDestinationOptionDto[] {
  return [
    { kind: 0, id: null, label: 'Yalnız panelde tut', country: null, brandName: null, selectable: true, disabledReason: null, warnings: [] },
    { kind: 1, id: 2, label: 'Demo Mağaza (TR)', country: 'TR', brandName: 'Demo Oto Aksesuar', selectable: true, disabledReason: null, warnings: [] },
    { kind: 1, id: 4, label: 'Demo Store (UK)', country: 'UK', brandName: 'Demo Auto UK', selectable: false, disabledReason: 'Mağaza bağlantısı pasif.', warnings: [] },
    { kind: 2, id: 1, label: 'Demo ERP Türkiye', country: 'TR', brandName: 'Demo Oto Aksesuar', selectable: false, disabledReason: 'ERP gönderimi test aşamasında.', warnings: [] },
  ];
}

function effectiveDestination(request: DemoRequest): OrderDestinationEffectiveDto {
  const channel = DEMO_CHANNELS.find((candidate) => candidate.id === numberQuery(request, 'channelId'));
  const rule = ORDER_DESTINATION_RULES.find((candidate) => candidate.brandId === channel?.brandId);
  return {
    level: 'BrandCountry', kind: rule?.kind ?? 0, targetId: rule?.targetId ?? null, label: rule?.targetLabel ?? 'Yalnız panelde tut',
    ruleId: rule?.id ?? null, notice: null,
  };
}

function outboundEmails(): OutboundEmailDto[] {
  const rng = createRng(EMAIL_RNG_SEED);
  const kinds = ['handoff', 'order', 'notification', 'reply'] as const;
  return Array.from({ length: EMAIL_ROW_COUNT }, (_, index): OutboundEmailDto => {
    const failed = index % 17 === 0;
    return {
      id: index + 1, channelId: index % 3 === 0 ? 5 : null, conversationId: rng.int(1, 36), kind: kinds[index % kinds.length],
      toAddress: index % 2 === 0 ? 'ops@example.com' : `musteri${index}@example.com`,
      subject: index % 4 === 1 ? 'Siparişiniz hazırlanıyor' : index % 4 === 0 ? 'Yeni devir: müşteri temsilci istiyor' : 'Mesajınıza yanıt',
      messageId: `<demo-${index}@example.com>`, status: failed ? 'failed' : 'sent',
      errorSummary: failed ? 'Alıcı sunucusu geçici olarak reddetti.' : null, sentAtUtc: ago(0, index * 3),
    };
  });
}

function emailPage(request: DemoRequest): OutboundEmailPageDto {
  const kind = request.query.get('kind');
  const status = request.query.get('status');
  const channelId = numberQuery(request, 'channelId');
  const rows = outboundEmails()
    .filter((row) => !kind || row.kind === kind)
    .filter((row) => !status || row.status === status)
    .filter((row) => channelId === null || row.channelId === channelId);
  const paged = slicePage(rows, request, EMAIL_PAGE_SIZE);
  return { items: paged.items, totalCount: rows.length, page: paged.page, pageSize: paged.pageSize };
}

function catchupPreview(): CatchupPreviewDto {
  const eligible = listRecords()
    .filter((record) => record.script.handoff && record.summary.channelType === 1 && record.lastCustomerAt)
    .slice(0, 3)
    .map((record) => ({
      conversationId: record.summary.id, contactName: record.summary.contactDisplayName, channelName: record.summary.channelName,
      country: record.summary.country ?? null, lastCustomerMessage: record.summary.lastMessagePreview,
      lastCustomerAt: record.lastCustomerAt ?? ago(0), windowEndsAt: ago(0, -CATCHUP_WINDOW_HOURS),
    }));
  return { eligible, skipped: [{ conversationId: 3, reason: 'window_closed' }] };
}

const coverage = (): CatalogCoverageDto => ({ products: 1696, withPrice: 1648, inStock: 1203, withLink: 1420 });

const AI_USAGE = [
  { feature: 'TopicTagging', enabled: true }, { feature: 'QualityAudit', enabled: true }, { feature: 'CorrectionDigest', enabled: true },
  { feature: 'FaqDrafts', enabled: false }, { feature: 'MonitoringInsights', enabled: true },
];

export const settingsRoutes: DemoRoute[] = [
  get('/omnichannel/bot-settings', () => BOT_SETTINGS),
  get('/omnichannel/bot-menu/texts', () => BOT_TEXTS),
  get('/omnichannel/bot-menu', () => BOT_MENU),
  get('/omnichannel/aliases/suggestions', () => ALIAS_SUGGESTIONS),
  get('/omnichannel/aliases', () => ALIASES),
  get('/omnichannel/ignored-contacts', () => IGNORED_CONTACTS),
  get('/omnichannel/payment-options', () => PAYMENT_OPTIONS),
  get('/omnichannel/cross-sell-rules', () => CROSS_SELL_RULES),
  get('/omnichannel/catalog-sources', () => CATALOG_SOURCES),
  get('/omnichannel/catalog-profiles', () => CATALOG_PROFILES),
  get('/omnichannel/catalog-profiles/:id/coverage', coverage),
  get('/omnichannel/catalog-profiles/:id/price-rules', () => PRICE_RULES),
  get('/omnichannel/catalog-profiles/:id/price-rules/preview', (request) => {
    const name = (request.query.get('name') ?? '').toLocaleLowerCase('tr');
    const rule = PRICE_RULES.find((candidate) => name.includes(candidate.keywords));
    return { matched: rule !== undefined, ruleId: rule?.id ?? null, keywords: rule?.keywords ?? null, price: rule?.price ?? null };
  }),
  get('/omnichannel/catalog-site-sources', () => CATALOG_SITE_SOURCES),
  get('/omnichannel/bank-transactions/templates', () => BANK_TEMPLATES),
  get('/omnichannel/bank-transactions', bankPage),
  get('/omnichannel/bank-mailbox', mailboxSettings),
  get('/omnichannel/handoff-delivery-settings', deliverySettings),
  get('/omnichannel/handoff-routes/users', () => DEMO_AGENTS.map((agent) => ({ userId: agent.userId, displayName: agent.displayName, email: agent.email }))),
  get('/omnichannel/handoff-routes', () => HANDOFF_ROUTES),
  get('/omnichannel/order-destinations/options', destinationOptions),
  get('/omnichannel/order-destinations/erp-send', () => ({ enabled: false, notice: 'ERP gönderimi test aşamasında; kapalı.' })),
  get('/omnichannel/order-destinations/effective', effectiveDestination),
  get('/omnichannel/order-destinations', () => ORDER_DESTINATION_RULES),
  get('/omnichannel/email/outbound', emailPage),
  get('/omnichannel/ai-usage', () => AI_USAGE),
  get('/omnichannel/handoff-catchup/preview', catchupPreview),
];
