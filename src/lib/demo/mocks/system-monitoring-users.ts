// Sistem İzleme > Kullanıcılar: aktivite akışı, oturumlar ve sayfa kullanımı.
import type { ActivityEntryDto, PageUsageDto, SessionStatus, UserActivitySummaryDto, UserSessionDto } from '../../api/monitoring-users';
import { inDateRange } from '../data/system-logs';
import { DEMO_MANAGED_USERS } from '../data/system-people';
import { get, type DemoRoute } from '../router';
import { ago, createRng, matchesSearch, paginate } from '../seed';

const ACTIVITY_COUNT = 120;
const SESSION_COUNT = 90;
const MINUTES_PER_DAY = 24 * 60;
const ACTIVITY_SPAN_DAYS = 10;
const SESSION_SPAN_DAYS = 14;
const ONLINE_SESSION_COUNT = 3;
const SECONDS_PER_MINUTE = 60;
const DEFAULT_RANGE_DAYS = 7;
const TEST_NET_IP_PREFIX = '203.0.113.';
const DEVICES = ['Chrome · Windows', 'Safari · macOS', 'Chrome · Android', 'Edge · Windows', 'Safari · iOS'];

const rng = createRng(31337);
const employees = DEMO_MANAGED_USERS.filter((user) => user.isActive);
const fullName = (user: { firstName: string; lastName: string }): string => `${user.firstName} ${user.lastName}`;

// [alan, olay türü, özet, hedef türü, hedef etiketi öneki]
type ActivitySeed = [domain: string, eventType: string, summary: string, targetType: string, targetPrefix: string];

const ACTIVITY_SEEDS: ActivitySeed[] = [
  ['Siparişler', 'OrderStatusChanged', 'sipariş durumunu "Kargoya verildi" yaptı', 'Order', 'SP-'],
  ['Siparişler', 'ManualOrderCreated', 'manuel sipariş oluşturdu', 'Order', 'MS-'],
  ['Ürünler', 'ProductPriceUpdated', 'ürün satış fiyatını güncelledi', 'Product', 'DM-'],
  ['Ürünler', 'ProductCostUpdated', 'alış fiyatını onayladı', 'Product', 'DM-'],
  ['Finans', 'ExpenseCreated', 'gider kaydı ekledi', 'Expense', 'GD-'],
  ['Lojistik', 'ShipmentCreated', 'sevkiyat oluşturdu', 'Shipment', 'SV-'],
  ['Müşteriler', 'CustomerNoteAdded', 'müşteri notu ekledi', 'Customer', 'MT-'],
  ['İadeler', 'ReturnApproved', 'iade talebini onayladı', 'Return', 'IA-'],
];

const ACTIVITY_DOMAINS = [...new Set(ACTIVITY_SEEDS.map(([domain]) => domain))];

const activityEntries: ActivityEntryDto[] = Array.from({ length: ACTIVITY_COUNT }, (_, index) => {
  const [domain, eventType, summary, targetType, targetPrefix] = ACTIVITY_SEEDS[index % ACTIVITY_SEEDS.length];
  const actor = employees[rng.int(0, employees.length - 1)];
  const targetId = String(rng.int(1000, 9999));
  return {
    id: ACTIVITY_COUNT - index,
    createdAt: ago(0, 0, Math.round((index / ACTIVITY_COUNT) * ACTIVITY_SPAN_DAYS * MINUTES_PER_DAY) + rng.int(0, 60)),
    actorUserId: actor.id,
    actorName: fullName(actor),
    actorEmail: actor.email,
    domain,
    eventType,
    summary: `${actor.firstName} ${summary}`,
    targetType,
    targetId,
    targetLabel: `${targetPrefix}${targetId}`,
    changes: eventType === 'ProductPriceUpdated'
      ? [{ field: 'price', label: 'Satış fiyatı', old: '₺649', new: '₺689' }]
      : [],
    correlationId: null,
  };
});

function buildSessions(): UserSessionDto[] {
  return Array.from({ length: SESSION_COUNT }, (_, index) => {
    const user = employees[index % employees.length];
    const startedMinutesAgo = Math.round((index / SESSION_COUNT) * SESSION_SPAN_DAYS * MINUTES_PER_DAY) + rng.int(5, 120);
    const durationMinutes = rng.int(8, 190);
    const isOpen = index < ONLINE_SESSION_COUNT;
    const status: SessionStatus = isOpen ? 'Open' : rng.chance(0.7) ? 'Logout' : 'Timeout';
    return {
      id: SESSION_COUNT - index,
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      startedAt: ago(0, 0, startedMinutesAgo),
      lastSeenAt: ago(0, 0, isOpen ? rng.int(0, 4) : Math.max(1, startedMinutesAgo - durationMinutes)),
      endedAt: isOpen ? null : ago(0, 0, Math.max(1, startedMinutesAgo - durationMinutes)),
      status,
      activeSeconds: durationMinutes * SECONDS_PER_MINUTE * 0.7,
      pageViews: rng.int(6, 140),
      actions: rng.int(1, 60),
      ipAddress: `${TEST_NET_IP_PREFIX}${rng.int(2, 120)}`,
      device: rng.pick(DEVICES),
    };
  });
}

const sessions = buildSessions();

function summarizeUsers(days: number): UserActivitySummaryDto[] {
  const since = ago(days);
  return employees.map((user) => {
    const own = sessions.filter((session) => session.userId === user.id && session.startedAt >= since);
    return {
      userId: user.id,
      userName: fullName(user),
      userEmail: user.email,
      isOnline: own.some((session) => session.status === 'Open'),
      lastSeenAt: own[0]?.lastSeenAt ?? null,
      sessions: own.length,
      activeSeconds: own.reduce((sum, session) => sum + session.activeSeconds, 0),
      pageViews: own.reduce((sum, session) => sum + session.pageViews, 0),
      actions: own.reduce((sum, session) => sum + session.actions, 0),
      businessActions: activityEntries.filter((entry) => entry.actorUserId === user.id && entry.createdAt >= since).length,
    };
  });
}

// [yol, görüntülenme, tekil kullanıcı, ortalama süre ms, istemci hatası]
const PAGE_USAGE_SEEDS: Array<[string, number, number, number, number]> = [
  ['/dashboard', 940, 8, 64000, 0],
  ['/orders', 1210, 8, 91000, 1],
  ['/orders/[id]', 760, 7, 52000, 0],
  ['/products', 680, 7, 78000, 0],
  ['/products/[id]', 410, 6, 47000, 0],
  ['/finance/pnl', 230, 4, 118000, 0],
  ['/omnichannel', 620, 6, 143000, 0],
  ['/logistics', 340, 5, 66000, 0],
  ['/customers', 280, 5, 59000, 0],
  ['/system/users', 36, 2, 38000, 0],
  ['/monitoring', 74, 3, 85000, 0],
  ['/accounting/customers', 120, 3, 72000, 1],
];

const pageUsage = (days: number): PageUsageDto[] =>
  PAGE_USAGE_SEEDS.map(([path, views, uniqueUsers, avgDurationMs, clientErrors], index) => ({
    path,
    views: Math.max(1, Math.round((views * days) / DEFAULT_RANGE_DAYS)),
    uniqueUsers,
    avgDurationMs,
    lastViewedAt: ago(0, 0, index * 7 + 2),
    clientErrors,
  }));

export const systemMonitoringUsersRoutes: DemoRoute[] = [
  get('/monitoring/activity/domains', () => ACTIVITY_DOMAINS),
  get('/monitoring/activity', (req) => {
    const actorUserId = req.query.get('actorUserId');
    const domain = req.query.get('domain');
    const entries = activityEntries.filter(
      (entry) =>
        (!actorUserId || entry.actorUserId === Number(actorUserId))
        && (!domain || entry.domain === domain)
        && matchesSearch(entry, req.query.get('search'), ['summary', 'actorName', 'targetLabel'])
        && inDateRange(entry.createdAt, req.query.get('from'), req.query.get('to')),
    );
    return paginate(entries, req.query);
  }),

  get('/monitoring/sessions', (req) => {
    const userId = req.query.get('userId');
    const since = ago(Number(req.query.get('days') ?? DEFAULT_RANGE_DAYS));
    const entries = sessions.filter((session) => (!userId || session.userId === Number(userId)) && session.startedAt >= since);
    return paginate(entries, req.query);
  }),

  get('/monitoring/users-activity', (req) => summarizeUsers(Number(req.query.get('days') ?? DEFAULT_RANGE_DAYS))),
  get('/monitoring/page-usage', (req) => pageUsage(Number(req.query.get('days') ?? DEFAULT_RANGE_DAYS))),
];
