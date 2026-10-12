// Sistem İzleme: sağlık kontrolleri, hata grupları, uç performansı ve kayıt listeleri.
import type {
  AppEventGroupDto,
  HealthCheckResultDto,
  OperationsSummaryDto,
  RoutePerformanceDto,
} from '../../api/monitoring';
import { DEMO_AUDIT_LOG, DEMO_BUSINESS_EVENTS, DEMO_EXCEPTIONS, DEMO_SECURITY_LOG, inDateRange } from '../data/system-logs';
import { get, post, type DemoRoute } from '../router';
import { ago, createRng, matchesSearch, paginate } from '../seed';

const DEFAULT_GROUP_LIMIT = 50;

// [anahtar, ad, grup, durum, mesaj]
type HealthSeed = [string, string, string, HealthCheckResultDto['state'], string | null];

const HEALTH_SEEDS: HealthSeed[] = [
  ['database', 'Veritabanı', 'Altyapı', 'Ok', null],
  ['cache', 'Önbellek', 'Altyapı', 'Ok', null],
  ['hangfire', 'Arka plan işçisi', 'Altyapı', 'Ok', null],
  ['disk', 'Disk alanı', 'Altyapı', 'Ok', 'Kullanım %41'],
  ['erp-sentos', 'Sentos bağlantısı', 'Entegrasyon', 'Ok', null],
  ['erp-base', 'Base bağlantısı', 'Entegrasyon', 'Ok', null],
  ['marketplace-trendyol', 'Trendyol API', 'Entegrasyon', 'Ok', null],
  ['marketplace-hepsiburada', 'Hepsiburada API', 'Entegrasyon', 'Ok', null],
  ['marketplace-amazon', 'Amazon API', 'Entegrasyon', 'Ok', null],
  ['carrier-api', 'Kargo servisi', 'Entegrasyon', 'Ok', null],
  ['smtp', 'E-posta gönderimi', 'İletişim', 'Ok', null],
  ['whatsapp', 'WhatsApp kanalı', 'İletişim', 'Passive', 'Bu demo ortamında bağlı değil.'],
  ['ai-provider', 'Yapay zekâ sağlayıcısı', 'Yapay Zekâ', 'Ok', null],
  ['visual-search', 'Görsel arama servisi', 'Yapay Zekâ', 'Passive', 'Bu demo ortamında kapalı.'],
];

const buildHealthChecks = (): HealthCheckResultDto[] => {
  const rng = createRng(4401);
  return HEALTH_SEEDS.map(([key, name, groupName, state, message]) => ({
    key,
    name,
    groupName,
    state,
    message,
    lastRunUtc: ago(0, 0, rng.int(1, 9)),
    durationMs: state === 'Passive' ? 0 : rng.int(8, 240),
    consecutiveFailures: 0,
  }));
};

const EXCEPTION_GROUPS: AppEventGroupDto[] = [
  { fingerprint: 'fp-market-timeout', level: 'Error', category: 'MarketplaceSync', sampleMessage: 'Pazaryeri API isteği zaman aşımına uğradı.', requestPath: '/api/integration-connections/6/discover', count: 14, firstSeenUtc: ago(0, 20), lastSeenUtc: ago(0, 2), lastCorrelationId: 'c4f1a29e3' },
  { fingerprint: 'fp-db-pool', level: 'Error', category: 'Database', sampleMessage: 'Bağlantı havuzu geçici olarak doldu; istek yeniden denendi.', requestPath: '/api/products', count: 6, firstSeenUtc: ago(0, 14), lastSeenUtc: ago(0, 5), lastCorrelationId: 'c91b7d012' },
  { fingerprint: 'fp-carrier', level: 'Critical', category: 'ExternalService', sampleMessage: 'Kargo servisi 3 denemede de yanıt vermedi.', requestPath: '/api/shipping/rates', count: 3, firstSeenUtc: ago(0, 9), lastSeenUtc: ago(0, 8), lastCorrelationId: 'c0a8e5547' },
  { fingerprint: 'fp-date-range', level: 'Warning', category: 'Validation', sampleMessage: 'Geçersiz tarih aralığı gönderildi.', requestPath: '/api/dashboard/summary', count: 22, firstSeenUtc: ago(0, 23), lastSeenUtc: ago(0, 1), lastCorrelationId: 'c7d20bb18' },
  { fingerprint: 'fp-slow-orders', level: 'Warning', category: 'SlowRequest', sampleMessage: 'İstek 3,4 sn sürdü (bütçe 1,5 sn).', requestPath: '/api/orders', count: 31, firstSeenUtc: ago(0, 22), lastSeenUtc: ago(0, 0, 18), lastCorrelationId: 'c5513fa90' },
];

// [yöntem, uç, istek sayısı, ortalama ms, p95, p99, bütçe aşımı, başarısız]
type RouteSeed = [string, string, number, number, number, number, number, number];

const ROUTE_SEEDS: RouteSeed[] = [
  ['GET', '/api/finance/pnl', 420, 1320, 2800, 4100, 96, 0],
  ['GET', '/api/orders', 3180, 940, 2300, 3400, 410, 2],
  ['GET', '/api/dashboard/summary', 5240, 610, 1400, 2200, 188, 0],
  ['GET', '/api/products', 2760, 540, 1250, 1900, 120, 6],
  ['POST', '/api/integration-connections/{id}/discover', 38, 8900, 19000, 24000, 30, 14],
  ['GET', '/api/products/{id}', 1980, 210, 480, 760, 8, 0],
  ['GET', '/api/customers', 1120, 330, 720, 1100, 21, 0],
  ['GET', '/api/shipping/rates', 640, 480, 1900, 3100, 52, 3],
  ['GET', '/api/notification', 9300, 64, 150, 260, 0, 0],
  ['GET', '/api/auth/me', 6100, 18, 42, 80, 0, 0],
];

const ROUTE_PERFORMANCE: RoutePerformanceDto[] = ROUTE_SEEDS.map(
  ([method, route, requestCount, averageMs, p95Ms, p99Ms, overBudgetCount, failedCount]) => ({
    method, route, requestCount, averageMs, p95Ms, p99Ms, overBudgetCount, failedCount,
  }),
);

const OPERATIONS_SUMMARY = (): OperationsSummaryDto => ({
  stockSources: [
    { label: 'Mağaza A · Sentos stoku', criticalCount: 12, totalCount: 58, available: true },
    { label: 'Mağaza B · Sentos stoku', criticalCount: 7, totalCount: 33, available: true },
    { label: 'Store C · UK deposu', criticalCount: 4, totalCount: 21, available: true },
  ],
  categoryMismatchCount: 5,
  generatedAt: ago(0, 0, 3),
});

export const systemMonitoringRoutes: DemoRoute[] = [
  get('/monitoring/health-checks', buildHealthChecks),
  post('/monitoring/health-checks/run', buildHealthChecks),
  get('/monitoring/exception-groups', (req) =>
    EXCEPTION_GROUPS.slice(0, Number(req.query.get('limit') ?? DEFAULT_GROUP_LIMIT)),
  ),
  get('/monitoring/route-performance', () => ROUTE_PERFORMANCE),
  get('/monitoring/operations-summary', OPERATIONS_SUMMARY),

  get('/monitoring/security-log', (req) => {
    const action = req.query.get('action');
    const entries = DEMO_SECURITY_LOG.filter((entry) => !action || entry.action.startsWith(action));
    return paginate(entries, req.query);
  }),

  get('/monitoring/audit-log', (req) => {
    const entityTypes = req.query.get('entityTypes')?.split(',').filter(Boolean) ?? [];
    const userId = req.query.get('userId');
    const severity = req.query.get('severity');
    const from = req.query.get('from');
    const to = req.query.get('to');
    const entries = DEMO_AUDIT_LOG.filter(
      (entry) =>
        (!userId || entry.userId === Number(userId))
        && (!severity || entry.severity === severity)
        && (entityTypes.length === 0 || entityTypes.includes(entry.entityType))
        && matchesSearch(entry, req.query.get('action'), ['action'])
        && inDateRange(entry.createdAt, from, to),
    );
    return paginate(entries, req.query);
  }),

  get('/monitoring/business-events', (req) => {
    const eventType = req.query.get('eventType');
    const entries = DEMO_BUSINESS_EVENTS.filter(
      (entry) => (!eventType || entry.eventType === eventType) && inDateRange(entry.createdAt, req.query.get('from'), req.query.get('to')),
    );
    return paginate(entries, req.query);
  }),

  get('/monitoring/exceptions', (req) => {
    const level = req.query.get('level');
    const category = req.query.get('category');
    const entries = DEMO_EXCEPTIONS.filter(
      (entry) => (!level || entry.level === level) && (!category || entry.category === category),
    );
    return paginate(entries, req.query);
  }),
];
