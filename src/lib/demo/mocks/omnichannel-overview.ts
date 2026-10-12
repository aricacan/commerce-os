// Genel Bakış ve İzleme: özet, grafik, huni, kalite trendi, hesap sağlığı ve bot izleme uçları.
import type {
  AccountHealthDto, BotLearningReportDto, OmnichannelOverviewDto, OrderFunnelDto, OverviewInsightsDto,
  OverviewSummaryDto, QualityTrendDto,
} from '../../api/omnichannel';
import type {
  BotHealthDto, MonitoringDeliveryDto, MonitoringHandoffDto, MonitoringOrderDto,
} from '../../api/omnichannel-monitoring';
import { listRecords } from '../data/omnichannel-conversations';
import { DEMO_CHANNELS } from '../data/omnichannel-core';
import { ago, createRng, dayAgo, lastDays } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { daysQuery } from './omnichannel-http';

const DEFAULT_DAYS = 30;
const HOURS_PER_DAY = 24;
const MS_PER_DAY = 86_400_000;
const WEEKDAY_BOOST = 1.25;
const QUALITY_TARGET_SCORE = 8.4;
const RNG_SEED = 4242;

/** İstekten dönem uzunluğu: from/to verildiyse takvim aralığı, yoksa "days". */
function periodDays(request: DemoRequest): number {
  const from = request.query.get('from');
  const to = request.query.get('to');
  if (from && to) {
    const span = Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY) + 1;
    if (Number.isFinite(span) && span > 0) return Math.min(span, 120);
  }
  return daysQuery(request, DEFAULT_DAYS);
}

function dailyActivity(days: number) {
  const rng = createRng(RNG_SEED);
  return lastDays(days, (date) => {
    const weekday = new Date(date).getDay();
    const boost = weekday === 0 || weekday === 6 ? 0.7 : WEEKDAY_BOOST;
    const inbound = Math.round(rng.int(38, 72) * boost);
    const botReplies = Math.round(inbound * rng.float(0.55, 0.72, 2));
    const agentReplies = Math.round(inbound * rng.float(0.2, 0.34, 2));
    return { date, inbound, botReplies, agentReplies };
  });
}

function dashboardOverview(request: DemoRequest): OmnichannelOverviewDto {
  const days = periodDays(request);
  const daily = dailyActivity(days);
  const total = daily.reduce((sum, day) => sum + day.inbound + day.botReplies + day.agentReplies, 0);
  return {
    from: request.query.get('from') ?? dayAgo(days - 1),
    to: request.query.get('to') ?? dayAgo(0),
    connectedChannelCount: DEMO_CHANNELS.length,
    totalMessageCount: total,
    botHandledRatePercent: 71.4,
    avgResponseTimeSeconds: 94,
    openConversationCount: listRecords().filter((record) => record.summary.status < 2).length,
    dailyTrend: daily.map((day) => ({ date: day.date, botMessageCount: day.botReplies, humanMessageCount: day.agentReplies })),
  };
}

function hourlyInbound(): number[] {
  const peak = [9, 10, 11, 14, 15, 16, 20, 21];
  return Array.from({ length: HOURS_PER_DAY }, (_, hour) => {
    if (hour < 7) return 4 + hour;
    return peak.includes(hour) ? 62 + hour : 28 + hour;
  });
}

function overviewSummary(request: DemoRequest): OverviewSummaryDto {
  const days = periodDays(request);
  const daily = dailyActivity(days);
  const records = listRecords();
  const inbound = daily.reduce((sum, day) => sum + day.inbound, 0);
  const stageCounts = new Map<number, number>();
  records.forEach((record) => stageCounts.set(record.summary.stage ?? 0, (stageCounts.get(record.summary.stage ?? 0) ?? 0) + 1));
  const topicCounts = new Map<number, number>();
  records.forEach((record) => topicCounts.set(record.summary.topic ?? 0, (topicCounts.get(record.summary.topic ?? 0) ?? 0) + 1));
  return {
    days,
    kpis: {
      conversations: Math.round(inbound / 4.2), inboundMessages: inbound, botSharePercent: 71.4, handoffRatePercent: 12.8,
      handoffCount: Math.round(inbound / 33), waitingForReply: records.filter((r) => r.summary.stage === 3 || r.summary.stage === 4).length,
      slaBreached: 2,
    },
    daily,
    stages: [...stageCounts.entries()].map(([stage, count]) => ({ stage: stage as OverviewSummaryDto['stages'][number]['stage'], count })),
    hourlyInbound: hourlyInbound(),
    channels: DEMO_CHANNELS.map((channel, index) => ({
      channelId: channel.id, name: channel.displayName, type: channel.type, conversations: Math.round((days * (14 - index * 2)) / 2),
    })),
    handoffReasons: [{ reason: 1, count: 42 }, { reason: 2, count: 28 }, { reason: 3, count: 19 }, { reason: 0, count: 15 }, { reason: 7, count: 6 }],
    topics: [...topicCounts.entries()].map(([topic, count]) => ({ topic: topic as OverviewSummaryDto['topics'][number]['topic'], count: count * 9 })),
  };
}

function overviewInsights(request: DemoRequest): OverviewInsightsDto {
  const days = periodDays(request);
  const rng = createRng(RNG_SEED + 1);
  return {
    firstResponse: {
      averageMinutes: 6.4, medianMinutes: 3.2, answeredCount: days * 9, agentAverageMinutes: 14.8, agentAnsweredCount: days * 3,
      daily: lastDays(days, (date) => ({ date, averageMinutes: rng.float(3.5, 9.5, 1), agentAverageMinutes: rng.float(9, 22, 1) })),
    },
    orders: {
      confirmedCount: Math.round(days * 1.6),
      revenue: [
        { currency: 'TRY', count: Math.round(days * 1.2), total: Math.round(days * 1.2 * 1380) },
        { currency: 'GBP', count: Math.round(days * 0.4), total: Math.round(days * 0.4 * 46) },
      ],
    },
    countries: [{ country: 'TR', conversations: days * 11 }, { country: 'UK', conversations: days * 4 }],
    brands: [
      { brandId: 1, name: 'Demo Oto Aksesuar', conversations: days * 11 },
      { brandId: 2, name: 'Demo Auto UK', conversations: days * 4 },
    ],
  };
}

function orderFunnel(request: DemoRequest): OrderFunnelDto {
  const days = periodDays(request);
  const steps = [
    { step: 1, count: days * 15 }, { step: 2, count: days * 5 }, { step: 3, count: Math.round(days * 3.2) },
    { step: 4, count: Math.round(days * 2.1) }, { step: 5, count: Math.round(days * 1.8) }, { step: 6, count: Math.round(days * 1.5) },
  ] as OrderFunnelDto['steps'];
  return {
    days, steps,
    brands: [
      { brandId: 1, brandName: 'Demo Oto Aksesuar', steps: steps.map((s) => ({ ...s, count: Math.round(s.count * 0.75) })) },
      { brandId: 2, brandName: 'Demo Auto UK', steps: steps.map((s) => ({ ...s, count: Math.round(s.count * 0.25) })) },
    ],
    followUps: { sent: days * 2, customerRepliedAfter: Math.round(days * 0.9), waitingForAgent: 3 },
    crossSell: { offered: days, accepted: Math.round(days * 0.28), declined: Math.round(days * 0.4) },
  };
}

function qualityTrend(request: DemoRequest): QualityTrendDto {
  const days = daysQuery(request, DEFAULT_DAYS);
  const rng = createRng(RNG_SEED + 2);
  const daily = lastDays(days, (day) => ({ day, average: rng.float(7.6, 9.2, 1), count: rng.int(6, 14) }));
  const item = (conversationId: number, score: number, rationale: string, name: string) => ({
    conversationId, score, rationale, auditDay: dayAgo(1), contactName: name,
  });
  return {
    days,
    average: QUALITY_TARGET_SCORE,
    auditedCount: daily.reduce((sum, d) => sum + d.count, 0),
    daily,
    lowest: [item(3, 4.5, 'Şikâyet sonrası devir geç yapıldı.', 'Kaan Özkan'), item(14, 5.5, 'Stok tarihi net söylenmedi.', 'Serkan Uçar')],
    needsReview: [item(10, 6, 'İade koşulları eksik anlatıldı.', 'Volkan Doğan')],
  };
}

const accountHealth = (): AccountHealthDto => ({
  checksTotal: 18,
  checksFailed: 2,
  findings: [
    { ruleId: 'fb-webhook-stale', severity: 2, title: 'Facebook kanalında webhook gecikmesi', detail: 'Son webhook 38 dakika önce geldi; kanal bağlantısını test edin.', actionTab: 'channels', actionHref: null },
    { ruleId: 'handoff-slack-missing', severity: 3, title: 'Devir bildirimi için Slack bağlı değil', detail: 'Devirler yalnız e-posta ile bildiriliyor.', actionTab: 'account', actionHref: null },
  ],
});

const learningReport = (request: DemoRequest): BotLearningReportDto => ({
  days: daysQuery(request, 7),
  handoffCount: 63,
  handoffReasons: [{ reason: 1, count: 24 }, { reason: 2, count: 14 }, { reason: 3, count: 11 }, { reason: 0, count: 9 }, { reason: 7, count: 5 }],
  unansweredQuestions: [
    { example: 'Tavan barı kilitli mi geliyor?', count: 6, lastAskedAt: ago(0, 5) },
    { example: 'Taksit yapabiliyor musunuz?', count: 5, lastAskedAt: ago(0, 9) },
    { example: 'Do you ship to Ireland?', count: 3, lastAskedAt: ago(1) },
  ],
  unknownTerms: [
    { term: 'pasbas', occurrences: 7, lastSeenAt: ago(0, 4), suggestedCorrections: ['paspas'] },
    { term: 'bagaj havuzzu', occurrences: 4, lastSeenAt: ago(1), suggestedCorrections: ['bagaj havuzu'] },
  ],
});

function botHealth(request: DemoRequest): BotHealthDto {
  const days = periodDays(request);
  const from = request.query.get('from') ?? dayAgo(days - 1);
  const to = request.query.get('to') ?? dayAgo(0);
  const kpi = (turns: number, p95: number, handoff: number, failure: number) => ({
    botTurnCount: turns, p50DurationMs: Math.round(p95 / 2.6), p95DurationMs: p95, handoffRatePercent: handoff, sendFailureRatePercent: failure,
  });
  return {
    period: { from, to, previousFrom: dayAgo(days * 2 - 1), previousTo: dayAgo(days), clamped: false },
    current: kpi(days * 41, 6400, 12.8, 0.8), previous: kpi(days * 37, 7100, 14.2, 1.3),
    p95TargetMs: 8000, handoffTargetPercent: 15,
    botOutboundCount: days * 41, agentOutboundCount: days * 17,
    channels: DEMO_CHANNELS.map((channel, index) => ({
      channelId: channel.id, displayName: channel.displayName, type: channel.type, status: channel.status, lastError: null,
      lastWebhookAt: channel.lastWebhookAt, inboundCount: days * (14 - index * 2), outboundCount: days * (11 - index), failedCount: index === 3 ? 4 : 1,
      botTurnCount: days * (10 - index), p95DurationMs: 5200 + index * 400,
    })),
    topFailureReasons: [{ reason: '24 saatlik mesaj penceresi kapalı', count: 7 }, { reason: 'Geçici ağ hatası', count: 3 }],
  };
}

const monitoringHandoffs = (request: DemoRequest): MonitoringHandoffDto => {
  const days = periodDays(request);
  return {
    ticketCount: days * 2, resolvedCount: Math.round(days * 1.8), avgResolveMinutes: 42, medianResolveMinutes: 28,
    reasons: [
      { reason: 1, count: days, resolvedCount: days - 1, avgResolveMinutes: 31 },
      { reason: 2, count: Math.round(days * 0.5), resolvedCount: Math.round(days * 0.45), avgResolveMinutes: 77 },
      { reason: 3, count: Math.round(days * 0.3), resolvedCount: Math.round(days * 0.3), avgResolveMinutes: 20 },
    ],
    slaTrackedCount: days * 2, slaBreachedCount: Math.round(days * 0.15),
    slaChannels: DEMO_CHANNELS.slice(0, 4).map((channel) => ({ channelId: channel.id, displayName: channel.displayName, tracked: days, breached: channel.id === 4 ? 3 : 1 })),
  };
};

const monitoringDelivery = (): MonitoringDeliveryDto => ({
  emailByKind: [{ kind: 'handoff', sent: 118, failed: 2 }, { kind: 'order', sent: 64, failed: 0 }, { kind: 'reply', sent: 41, failed: 1 }],
  emailTopErrors: [{ reason: 'Alıcı adresi reddedildi', count: 2 }],
  mailboxes: DEMO_CHANNELS.filter((channel) => channel.type === 5).map((channel) => ({
    channelId: channel.id, displayName: channel.displayName, lastSuccessAt: ago(0, 0, 12), lastRunAt: ago(0, 0, 2), lastError: null,
  })),
  metaErrorCodes: [{ code: 131047, count: 7, sampleReason: 'Re-engagement mesajı: 24 saat penceresi dışında' }],
  failedWithoutCode: 3,
});

const monitoringOrders = (request: DemoRequest): MonitoringOrderDto => {
  const days = periodDays(request);
  return {
    startedCount: days * 5, confirmedCount: Math.round(days * 3.2), dispatchedCount: Math.round(days * 2.6), dispatchFailedCount: 2,
    byStatus: [{ status: 0, count: 4 }, { status: 1, count: 3 }, { status: 3, count: 6 }, { status: 5, count: 18 }, { status: 6, count: 34 }],
  };
};

export const overviewRoutes: DemoRoute[] = [
  get('/omnichannel/dashboard/overview', dashboardOverview),
  get('/omnichannel/dashboard/summary', overviewSummary),
  get('/omnichannel/dashboard/insights', overviewInsights),
  get('/omnichannel/dashboard/funnel', orderFunnel),
  get('/omnichannel/dashboard/quality', qualityTrend),
  get('/omnichannel/dashboard/account-health', accountHealth),
  get('/omnichannel/dashboard/learning', learningReport),
  get('/omnichannel/dashboard/bot-health', botHealth),
  get('/omnichannel/dashboard/monitoring/handoffs', monitoringHandoffs),
  get('/omnichannel/dashboard/monitoring/delivery', monitoringDelivery),
  get('/omnichannel/dashboard/monitoring/orders', monitoringOrders),
];
