// SiteHub: bağlı web siteleri, teklif/mesaj kutusu, panel özetleri, senkron geçmişi ve blog.
import type {
  SiteAnalyticsDto, SiteBlogPostDto, SiteConnectionDto, SiteDetailDto, SiteHubWidgetSummaryDto, SiteOverviewDto,
  SiteRequestDetailDto, SiteRequestListItemDto, SiteRequestPageDto, SiteStatDto, SiteSyncRunDto,
} from '../../api/sitehub';
import { ago, createRng, dayAgo, lastDays } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { daysQuery, idParam, notFound, numberQuery, slicePage } from './omnichannel-http';

const SITE_PERIOD_DAYS = 30;
const INBOX_PAGE_SIZE = 20;
const RNG_SEED = 515;
const REQUEST_COUNT = 18;

const SITES: SiteConnectionDto[] = [
  {
    id: 1, provider: 1, providerLabel: 'Mağaza sitesi', displayName: 'Demo Oto Aksesuar (TR)', websiteUrl: 'https://tr.example.com',
    baseUrl: 'https://tr.example.com/api', adapterConfigJson: null, storeCode: 'store-a', contentLanguage: 'tr', statsPeriodDays: SITE_PERIOD_DAYS,
    isActive: true, isPaused: false, pausedReason: null, status: 1, lastError: null, lastCheckedAt: ago(0, 0, 8), lastSyncedAt: ago(0, 0, 8),
    hasApiKey: true, pendingRequestCount: 5, supportsBlog: true,
  },
  {
    id: 2, provider: 99, providerLabel: 'Genel adaptör', displayName: 'Demo Auto UK', websiteUrl: 'https://uk.example.com',
    baseUrl: 'https://uk.example.com/api', adapterConfigJson: null, storeCode: 'store-c', contentLanguage: 'en', statsPeriodDays: SITE_PERIOD_DAYS,
    isActive: true, isPaused: false, pausedReason: null, status: 1, lastError: null, lastCheckedAt: ago(0, 0, 14), lastSyncedAt: ago(0, 0, 14),
    hasApiKey: true, pendingRequestCount: 2, supportsBlog: true,
  },
];

const TR_SUBJECTS = ['Toptan fiyat teklifi', 'Paspas seti için teklif', 'Kargo süresi hakkında', 'Bayilik başvurusu', 'Ürün uyumluluğu sorusu', 'Fatura talebi'];
const EN_SUBJECTS = ['Trade price quote', 'Floor mats quote', 'Delivery question', 'Fitment question'];
const TR_NAMES = ['Murat Efe', 'Gizem Tan', 'Kaan Özkan', 'Derya Polat', 'Barış Yaman', 'Hande Sezer', 'Onur Karaca', 'Pınar Güneş'];
const EN_NAMES = ['James Whitaker', 'Olivia Hartley', 'Harry Pemberton', 'Chloe Ashworth'];
const MESSAGE_TR = 'Merhaba, ürünleriniz hakkında bilgi almak istiyorum. Fiyat ve teslimat süresini paylaşabilir misiniz?';
const MESSAGE_EN = 'Hello, could you share pricing and delivery times for your products? Thank you.';

function buildRequests(): SiteRequestDetailDto[] {
  const rng = createRng(RNG_SEED);
  return Array.from({ length: REQUEST_COUNT }, (_, index): SiteRequestDetailDto => {
    const isUk = index % 4 === 3;
    const subjects = isUk ? EN_SUBJECTS : TR_SUBJECTS;
    const names = isUk ? EN_NAMES : TR_NAMES;
    const site = isUk ? SITES[1] : SITES[0];
    const subject = subjects[index % subjects.length];
    const name = names[index % names.length];
    return {
      id: index + 1, siteConnectionId: site.id, siteName: site.displayName, sourceType: (index % 3 === 0 ? 1 : 2) as 1 | 2,
      typeLabel: index % 3 === 0 ? 'Teklif' : 'Mesaj', name,
      email: `${name.toLocaleLowerCase('en').replace(/[^a-z]+/g, '.')}@example.${isUk ? 'co.uk' : 'com'}`,
      phone: isUk ? `+44 7700 900${100 + index}` : `+90 500 000 ${10 + index} ${20 + index}`, subject,
      receivedAt: ago(0, index * 5 + 1), importedAt: ago(0, index * 5), status: (index < 5 ? 0 : index < 9 ? 1 : index < 12 ? 2 : index < 14 ? 3 : 5) as SiteRequestDetailDto['status'],
      assignedUserId: index < 5 ? null : (index % 4) + 1, sourceId: 9000 + index, message: isUk ? MESSAGE_EN : MESSAGE_TR,
      service: index % 3 === 0 ? 'Toptan satış' : null, ip: null, rawPayloadJson: null, ackedAt: ago(0, index * 5), internalNote: rng.chance(0.3) ? 'Geri arama yapıldı.' : null,
    };
  });
}

const REQUESTS = buildRequests();

const PREVIEW_LENGTH = 70;
const toListItem = ({ message, sourceId: _s, service: _v, ip: _i, rawPayloadJson: _r, ackedAt: _a, internalNote: _n, ...rest }: SiteRequestDetailDto): SiteRequestListItemDto =>
  ({ ...rest, preview: (message ?? '').slice(0, PREVIEW_LENGTH) });

function inbox(request: DemoRequest): SiteRequestPageDto {
  const siteId = numberQuery(request, 'siteId');
  const type = numberQuery(request, 'type');
  const status = numberQuery(request, 'status');
  const search = request.query.get('search')?.toLocaleLowerCase('tr') ?? '';
  const rows = REQUESTS
    .filter((row) => siteId === null || row.siteConnectionId === siteId)
    .filter((row) => type === null || row.sourceType === type)
    .filter((row) => status === null || row.status === status)
    .filter((row) => !search || `${row.name} ${row.subject ?? ''}`.toLocaleLowerCase('tr').includes(search));
  const paged = slicePage(rows, request, INBOX_PAGE_SIZE);
  return { items: paged.items.map(toListItem), totalCount: rows.length, page: paged.page, pageSize: paged.pageSize };
}

function statFor(site: SiteConnectionDto): SiteStatDto {
  const factor = site.id === 1 ? 1 : 0.4;
  return {
    siteConnectionId: site.id, siteName: site.displayName, isPaused: site.isPaused, newRequestCount: site.pendingRequestCount,
    pageViewsPeriod: Math.round(48_200 * factor), uniqueVisitorsPeriod: Math.round(17_600 * factor), newsletterSubscribers: Math.round(830 * factor),
    productsPublished: site.id === 1 ? 1420 : 812, postsPublished: site.id === 1 ? 14 : 6, lastSyncedAt: site.lastSyncedAt,
  };
}

function overview(): SiteOverviewDto {
  const sites = SITES.map(statFor);
  return {
    siteCount: SITES.length, activeSiteCount: SITES.length, pausedSiteCount: 0,
    newRequestCount: REQUESTS.filter((row) => row.status === 0).length, openRequestCount: REQUESTS.filter((row) => row.status < 3).length,
    requestsLast24Hours: 4, pageViewsPeriod: sites.reduce((sum, s) => sum + s.pageViewsPeriod, 0),
    uniqueVisitorsPeriod: sites.reduce((sum, s) => sum + s.uniqueVisitorsPeriod, 0),
    newsletterSubscribers: sites.reduce((sum, s) => sum + s.newsletterSubscribers, 0), lastSyncedAt: ago(0, 0, 8), sites,
  };
}

function runs(): SiteSyncRunDto[] {
  return Array.from({ length: 12 }, (_, index): SiteSyncRunDto => {
    const site = SITES[index % SITES.length];
    const failed = index === 7;
    return {
      id: index + 1, siteConnectionId: site.id, siteName: site.displayName, startedAt: ago(0, index * 2), finishedAt: ago(0, index * 2, -1),
      success: !failed, error: failed ? 'Geçici bağlantı hatası (demo).' : null, fetchedCount: failed ? 0 : 2 + (index % 3),
      importedCount: failed ? 0 : 1 + (index % 3), ackedCount: failed ? 0 : 1 + (index % 3), ackFailedCount: 0,
    };
  });
}

function analytics(request: DemoRequest): SiteAnalyticsDto {
  const days = daysQuery(request, SITE_PERIOD_DAYS);
  const rng = createRng(RNG_SEED + 1);
  return {
    days,
    sites: SITES.map((site) => ({ siteConnectionId: site.id, siteName: site.displayName })),
    requestPoints: SITES.flatMap((site) => lastDays(days, (date) => ({ date, siteConnectionId: site.id, count: rng.int(0, site.id === 1 ? 5 : 2) }))),
    trafficPoints: SITES.flatMap((site) => lastDays(days, (date) => {
      const visitors = rng.int(site.id === 1 ? 420 : 160, site.id === 1 ? 760 : 280);
      return { date, siteConnectionId: site.id, pageViews: Math.round(visitors * rng.float(2.1, 3.0, 2)), uniqueVisitors: visitors };
    })),
    typeBreakdown: SITES.map((site) => ({
      siteConnectionId: site.id, siteName: site.displayName,
      offers: REQUESTS.filter((row) => row.siteConnectionId === site.id && row.sourceType === 1).length,
      messages: REQUESTS.filter((row) => row.siteConnectionId === site.id && row.sourceType === 2).length,
    })),
  };
}

function siteDetail(request: DemoRequest): SiteDetailDto | ReturnType<typeof notFound> {
  const site = SITES.find((candidate) => candidate.id === idParam(request));
  if (!site) return notFound();
  const days = daysQuery(request, SITE_PERIOD_DAYS);
  const full = analytics(request);
  const rows = REQUESTS.filter((row) => row.siteConnectionId === site.id);
  return {
    site, latestStats: statFor(site), totalRequestCount: rows.length, pendingAckCount: 0,
    statusCounts: [0, 1, 2, 3, 4, 5].map((status) => ({ status: status as 0, count: rows.filter((row) => row.status === status).length })),
    offerCount: rows.filter((row) => row.sourceType === 1).length, messageCount: rows.filter((row) => row.sourceType === 2).length,
    requestPoints: full.requestPoints.filter((point) => point.siteConnectionId === site.id).slice(-days),
    trafficPoints: full.trafficPoints.filter((point) => point.siteConnectionId === site.id).slice(-days),
    recentRuns: runs().filter((run) => run.siteConnectionId === site.id).slice(0, 5),
    recentRequests: rows.slice(0, 6).map(toListItem),
  };
}

function widgetSummary(request: DemoRequest): SiteHubWidgetSummaryDto {
  const rng = createRng(RNG_SEED + 2);
  const days = 14;
  return {
    from: request.query.get('from') ?? dayAgo(days - 1), to: request.query.get('to') ?? dayAgo(0),
    connectedSiteCount: SITES.length, totalSiteCount: SITES.length, pausedSiteCount: 0, requestCount: REQUESTS.length,
    respondedRequestCount: REQUESTS.filter((row) => row.status >= 2).length, blogPostCount: 20,
    dailyTrend: lastDays(days, (date) => ({ date, requestCount: rng.int(0, 4) })),
  };
}

const BLOG_POSTS: SiteBlogPostDto[] = [
  { slug: 'arac-paspasi-secim-rehberi', title: 'Araç paspası seçim rehberi', excerpt: 'Doğru paspası seçmenin 5 kuralı.', content: 'Araç modeline özel kalıplar tercih edin...', titleEn: 'How to choose car floor mats', excerptEn: null, contentEn: null, coverImageUrl: null, lang: 'tr', published: true, publishedAt: ago(12), createdAt: ago(14), updatedAt: ago(12) },
  { slug: 'bagaj-havuzu-bakimi', title: 'Bagaj havuzu bakımı nasıl yapılır?', excerpt: 'Temizlik ve koruma ipuçları.', content: 'Havuzu ılık suyla yıkayın...', titleEn: null, excerptEn: null, contentEn: null, coverImageUrl: null, lang: 'tr', published: true, publishedAt: ago(6), createdAt: ago(7), updatedAt: ago(6) },
  { slug: 'kis-lastigi-oncesi-kontrol', title: 'Kış öncesi araç kontrol listesi', excerpt: null, content: 'Taslak içerik...', titleEn: null, excerptEn: null, contentEn: null, coverImageUrl: null, lang: 'tr', published: false, publishedAt: null, createdAt: ago(2), updatedAt: ago(1) },
];

export const sitehubRoutes: DemoRoute[] = [
  get('/sitehub/dashboard/widget-summary', widgetSummary),
  get('/sitehub/dashboard/overview', overview),
  get('/sitehub/dashboard/runs', () => runs()),
  get('/sitehub/dashboard/analytics', analytics),
  get('/sitehub/sites', () => SITES),
  get('/sitehub/sites/:id/detail', siteDetail),
  get('/sitehub/sites/:id/blog', () => BLOG_POSTS),
  get('/sitehub/sites/:id/blog/:slug', (request) => BLOG_POSTS.find((post) => post.slug === request.params.slug) ?? notFound()),
  get('/sitehub/inbox', inbox),
  get('/sitehub/inbox/:id', (request) => REQUESTS.find((row) => row.id === idParam(request)) ?? notFound()),
];
