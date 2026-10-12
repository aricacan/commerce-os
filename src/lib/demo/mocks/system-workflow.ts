// Sistem ayarları: bildirim tercihleri, Slack yönlendirmeleri, yapay zekâ özeti, otomasyon ve ERP içe aktarma.
import type {
  AutomationCatalog,
  AutomationRule,
  AutomationRun,
} from '../../api/automation';
import type { ErpImportBatch, ErpImportColumn } from '../../api/erp-import';
import type { NotificationTypeSetting, UserNotificationPreference } from '../../api/notification';
import type {
  NotificationEventType,
  NotificationRoute,
  SlackDeliveryLog,
  SlackMessagePreview,
} from '../../api/notification-routes';
import { DEMO_MANAGED_USERS } from '../data/system-people';
import { get, type DemoRoute } from '../router';
import { ago } from '../seed';

const ACTIVE_USER_IDS = DEMO_MANAGED_USERS.filter((user) => user.isActive).map((user) => user.id);
const SLACK_DELIVERY_SENT = 0;
const WORKDAY_HOUR = 9;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DEFAULT_LOG_LIMIT = 100;

// ─── Bildirim tercihleri ─────────────────────────────────────────────────────
// [anahtar, ad, açıklama, alıcı modu]
type NotificationTypeSeed = [string, string, string, NotificationTypeSetting['recipientMode']];

const NOTIFICATION_TYPES: NotificationTypeSeed[] = [
  ['stock_critical', 'Kritik stok', 'Stok kritik seviyeye düştüğünde bildirir.', 'Managed'],
  ['Anomaly', 'Satış anomalisi', 'Satışlarda beklenmeyen sapma bulunduğunda bildirir.', 'Managed'],
  ['OrderStatus', 'Sipariş durumu', 'Sipariş durumu değiştiğinde ilgili kişiye bildirir.', 'Personal'],
  ['omnichannel', 'Müşteri mesajı', 'Temsilci devri bekleyen konuşmaları bildirir.', 'Personal'],
  ['OperationsDailyDigest', 'Günlük operasyon özeti', 'Her sabah operasyon özetini gönderir.', 'Managed'],
  ['Automation', 'Otomasyon sonuçları', 'Otomasyon kuralları çalıştığında bildirir.', 'Managed'],
];

const NOTIFICATION_SETTINGS: NotificationTypeSetting[] = NOTIFICATION_TYPES.map(([key, label, description, recipientMode]) => ({
  key,
  label,
  description,
  recipientMode,
  isEnabled: true,
  pushEnabled: recipientMode === 'Personal',
  recipientUserIds: recipientMode === 'Managed' ? ACTIVE_USER_IDS.slice(0, 3) : [],
}));

const USER_PREFERENCES: UserNotificationPreference[] = NOTIFICATION_TYPES.map(([typeKey, label, , mode]) => ({
  typeKey,
  label,
  category: mode === 'Personal' ? 'Kişisel' : 'Yönetim',
  inApp: true,
  push: mode === 'Personal',
}));

// ─── Slack yönlendirmeleri ───────────────────────────────────────────────────
const EVENT_TYPES: NotificationEventType[] = [
  { key: 'stock.critical', description: 'Kritik stok uyarısı', availableVariables: [{ key: 'sku', description: 'Ürün kodu' }, { key: 'stock', description: 'Kalan adet' }] },
  { key: 'order.daily-summary', description: 'Günlük sipariş özeti', availableVariables: [{ key: 'orderCount', description: 'Sipariş adedi' }, { key: 'revenue', description: 'Ciro' }] },
  { key: 'omnichannel.handoff', description: 'Temsilci devri', availableVariables: [{ key: 'customer', description: 'Müşteri adı' }] },
];

const ROUTES: NotificationRoute[] = EVENT_TYPES.map((event, index) => ({
  id: index + 1,
  eventType: event.key,
  webhookUrl: event.key === 'omnichannel.handoff' ? null : 'https://hooks.example.com/services/demo',
  slackChannelId: event.key === 'omnichannel.handoff' ? 'C0DEMO0001' : null,
  label: event.description,
  isActive: true,
  scheduleDays: WEEKDAYS,
  scheduleHour: WORKDAY_HOUR,
  createdAt: ago(40 - index * 8),
}));

const SLACK_LOGS: SlackDeliveryLog[] = Array.from({ length: 12 }, (_, index) => ({
  id: 12 - index,
  eventType: EVENT_TYPES[index % EVENT_TYPES.length].key,
  target: '#demo-operasyon',
  summary: index % 3 === 0 ? 'Günlük sipariş özeti gönderildi.' : 'Kritik stok uyarısı gönderildi.',
  sentAtUtc: ago(index, 2),
  status: SLACK_DELIVERY_SENT,
  errorMessage: null,
  isManualTest: false,
}));

function slackPreview(eventType: string): SlackMessagePreview {
  return {
    eventType,
    fallbackText: 'Demo bildirim önizlemesi',
    isLiveData: false,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: 'Günlük Operasyon Özeti' } },
      { type: 'section', fields: [{ type: 'mrkdwn', text: '*Sipariş*\n128' }, { type: 'mrkdwn', text: '*Ciro*\n₺184.620' }] },
      { type: 'context', elements: [{ type: 'mrkdwn', text: 'Demo verisiyle üretilmiş örnektir.' }] },
    ],
  };
}

// ─── Yapay zekâ kullanım özeti ───────────────────────────────────────────────
const AI_USAGE = {
  todayTokens: 48200,
  monthTokens: 1_184_500,
  byModel: [
    { model: 'demo-chat-large', provider: 'DeepSeek', totalTokens: 812_400, callCount: 1960 },
    { model: 'demo-chat-fast', provider: 'DeepSeek', totalTokens: 372_100, callCount: 4120 },
  ],
  byPanel: [
    { panelType: 'Omnichannel bot', provider: 'DeepSeek', model: 'demo-chat-large', totalTokens: 604_000, callCount: 1420 },
    { panelType: 'Kategori eşleştirme', provider: 'DeepSeek', model: 'demo-chat-fast', totalTokens: 301_300, callCount: 3380 },
    { panelType: 'AI Copilot', provider: 'DeepSeek', model: 'demo-chat-large', totalTokens: 208_400, callCount: 540 },
    { panelType: 'Sistem öneri özeti', provider: 'DeepSeek', model: 'demo-chat-fast', totalTokens: 70_800, callCount: 740 },
  ],
};

// ─── Otomasyon ───────────────────────────────────────────────────────────────
const AUTOMATION_CATALOG: AutomationCatalog = {
  events: [
    { event: 'order.created', subjectType: 'Order', fields: ['total', 'platform', 'city', 'itemCount'] },
    { event: 'stock.changed', subjectType: 'Product', fields: ['sku', 'stock', 'category'] },
    { event: 'return.requested', subjectType: 'Return', fields: ['reason', 'total'] },
  ],
  operators: ['eq', 'neq', 'gt', 'lt', 'contains'],
  actions: ['notify', 'tag', 'assign', 'webhook'],
};

const AUTOMATION_RULES: AutomationRule[] = [
  { id: 1, name: 'Yüksek tutarlı siparişi yöneticiye bildir', triggerEvent: 'order.created', isActive: true, priority: 1, conditions: [{ field: 'total', op: 'gt', value: '5000' }], actions: [{ type: 'notify', params: { target: 'managers' } }], lastRunAt: ago(0, 3), lastErrorMessage: null },
  { id: 2, name: 'Kritik stokta etiketle', triggerEvent: 'stock.changed', isActive: true, priority: 2, conditions: [{ field: 'stock', op: 'lt', value: '5' }], actions: [{ type: 'tag', params: { tag: 'kritik-stok' } }], lastRunAt: ago(0, 6), lastErrorMessage: null },
  { id: 3, name: 'Yurt dışı iade talebini ata', triggerEvent: 'return.requested', isActive: false, priority: 3, conditions: [{ field: 'reason', op: 'contains', value: 'hasar' }], actions: [{ type: 'assign', params: { role: 'Moderator' } }], lastRunAt: null, lastErrorMessage: null },
];

const AUTOMATION_RUNS: AutomationRun[] = Array.from({ length: 10 }, (_, index) => {
  const rule = AUTOMATION_RULES[index % 2];
  return {
    id: 10 - index,
    ruleId: rule.id,
    ruleName: rule.name,
    triggerEvent: rule.triggerEvent,
    subjectType: rule.id === 1 ? 'Order' : 'Product',
    subjectId: 1000 + index * 13,
    matched: index % 3 !== 2,
    isSimulation: false,
    outcome: index % 3 !== 2 ? 'Executed' : 'NotMatched',
    detail: index % 3 !== 2 ? 'Aksiyon uygulandı.' : 'Koşullar sağlanmadı.',
    errorMessage: null,
    createdAt: ago(0, index * 3),
  };
});

// ─── ERP Excel içe aktarma ───────────────────────────────────────────────────
const IMPORT_COLUMNS: ErpImportColumn[] = [
  { key: 'orderNumber', label: 'Sipariş No', type: 'text', required: true },
  { key: 'orderDate', label: 'Sipariş Tarihi', type: 'date', required: true },
  { key: 'sku', label: 'Stok Kodu', type: 'text', required: true },
  { key: 'quantity', label: 'Adet', type: 'number', required: true },
  { key: 'unitPrice', label: 'Birim Fiyat', type: 'number', required: false },
];

const IMPORT_BATCHES: ErpImportBatch[] = [
  { id: 2, entityType: 'Order', fileName: 'siparisler-eylul.xlsx', storeName: 'Mağaza A', sourceName: 'Mağaza A', totalRows: 184, createdCount: 171, updatedCount: 9, skippedCount: 4, uploadedAt: ago(6), uploadedBy: 'Elif Yılmaz', undoneAt: null, undoneBy: null },
  { id: 1, entityType: 'Order', fileName: 'siparisler-agustos.xlsx', storeName: 'Mağaza B', sourceName: 'Mağaza B', totalRows: 96, createdCount: 90, updatedCount: 2, skippedCount: 4, uploadedAt: ago(38), uploadedBy: 'Burak Kaya', undoneAt: ago(37), undoneBy: 'Elif Yılmaz' },
];

export const systemWorkflowRoutes: DemoRoute[] = [
  get('/notification-settings/users/:userId', () => USER_PREFERENCES),
  get('/notification-settings', () => NOTIFICATION_SETTINGS),
  get('/my-notification-preferences', () => USER_PREFERENCES),

  get('/notification-routes/event-types', () => EVENT_TYPES),
  get('/notification-routes/logs', (req) => SLACK_LOGS.slice(0, Number(req.query.get('limit') ?? DEFAULT_LOG_LIMIT))),
  get('/notification-routes/preview/:eventType', (req) => slackPreview(req.params.eventType)),
  get('/notification-routes', () => ROUTES),

  get('/ai-settings/usage-summary', () => AI_USAGE),
  get('/ai-settings/category-ai-provider', () => ({ provider: 'DeepSeek' })),

  get('/automation/catalog', () => AUTOMATION_CATALOG),
  get('/automation/rules', () => AUTOMATION_RULES),
  get('/automation/runs', (req) => {
    const subjectType = req.query.get('subjectType');
    return AUTOMATION_RUNS.filter((run) => !subjectType || run.subjectType === subjectType);
  }),

  get('/erp-import/orders/columns', () => IMPORT_COLUMNS),
  get('/erp-import/batches', () => IMPORT_BATCHES),
];
