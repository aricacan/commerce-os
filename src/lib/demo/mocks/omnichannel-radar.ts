// B2B Outreach (Radar): şirket havuzu, e-posta dizileri, hesaplar, SIC kodları, analiz ve uyarılar + PartnerHub.
import type { PartnerHubActivity, PartnerHubClient } from '../../api/partnerhub';
import type { RadarWidgetSummaryDto } from '../../api/radar';
import type {
  PaginatedResult, RadarAlert, RadarAnalytics, RadarCompanyDetail, RadarCompanyListItem, RadarEmailAccount,
  RadarEmailTemplate, RadarMessageThread, RadarRecentActivityItem, RadarScrapeRun, RadarSicCode, RadarStats,
} from '../../../types/api';
import { ago, createRng, dayAgo, lastDays } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { idParam, notFound, numberQuery, slicePage } from './omnichannel-http';

const RNG_SEED = 31337;
const COMPANY_COUNT = 48;
const DEFAULT_PAGE_SIZE = 25;
const TREND_DAYS = 14;

const NAME_PARTS = ['Northgate', 'Redline', 'Harbour', 'Summit', 'Bridgewater', 'Oakfield', 'Kingsway', 'Ashford', 'Stonebridge', 'Greenway', 'Millbrook', 'Eastfield'];
const NAME_KINDS = ['Motors', 'Auto Parts', 'Garage Services', 'Car Accessories', 'Vehicle Solutions', 'Trade Supplies'];
const CITIES = ['London', 'Manchester', 'Leeds', 'Bristol', 'Birmingham', 'Glasgow', 'Cardiff', 'Sheffield'];
const STATUSES = ['Pending', 'InSequence', 'InSequence', 'Replied', 'Completed', 'Bounced'];
const SIC_DEFS: [string, string][] = [['45320', 'Retail trade of motor vehicle parts'], ['45310', 'Wholesale trade of motor vehicle parts'], ['45200', 'Maintenance and repair of motor vehicles'], ['47300', 'Retail sale of automotive fuel']];

function buildCompanies(): RadarCompanyListItem[] {
  const rng = createRng(RNG_SEED);
  return Array.from({ length: COMPANY_COUNT }, (_, index): RadarCompanyListItem => {
    const name = `${NAME_PARTS[index % NAME_PARTS.length]} ${NAME_KINDS[index % NAME_KINDS.length]} Ltd`;
    const status = STATUSES[index % STATUSES.length];
    const slug = name.toLocaleLowerCase('en').replace(/[^a-z]+/g, '-');
    return {
      id: index + 1, companyNumber: String(10_000_000 + index * 137), companyName: name, category: SIC_DEFS[index % SIC_DEFS.length][0],
      country: 'UK', email: status === 'Bounced' ? null : `info@${slug}.example.com`, website: `https://${slug}.example.com`,
      city: CITIES[index % CITIES.length], district: null, companySizeLabel: index % 3 === 0 ? '11-50' : '1-10', tags: index % 4 === 0 ? ['trade'] : [],
      leadScore: rng.int(35, 95), leadCompanyType: index % 2 === 0 ? 'Retailer' : 'Garage', isActive: status !== 'Completed', status,
      currentStep: status === 'Pending' ? 0 : 1 + (index % 3), nextActionAt: status === 'InSequence' ? ago(0, -(index % 48)) : null, createdAt: ago(40 - (index % 30)),
    };
  });
}

const COMPANIES = buildCompanies();

function companyPage(request: DemoRequest): PaginatedResult<RadarCompanyListItem> {
  const search = request.query.get('search')?.toLocaleLowerCase('en') ?? '';
  const status = request.query.get('status');
  const category = request.query.get('category');
  const city = request.query.get('city');
  const tag = request.query.get('tag');
  const rows = COMPANIES
    .filter((company) => !search || company.companyName.toLocaleLowerCase('en').includes(search))
    .filter((company) => !status || company.status === status)
    .filter((company) => !category || company.category === category)
    .filter((company) => !city || company.city === city)
    .filter((company) => !tag || company.tags.includes(tag));
  const paged = slicePage(rows, request, DEFAULT_PAGE_SIZE);
  return { items: paged.items, totalCount: rows.length, page: paged.page, pageSize: paged.pageSize };
}

function companyDetail(request: DemoRequest): RadarCompanyDetail | ReturnType<typeof notFound> {
  const company = COMPANIES.find((candidate) => candidate.id === idParam(request));
  if (!company) return notFound();
  return {
    ...company, retryCount: 0, leadIndustryMatch: true, leadProducts: ['Floor mats', 'Boot liners'], leadScoredAt: ago(5),
    recentEmailLogs: [
      { id: company.id * 10, direction: 'Outbound', subject: 'Trade pricing for car accessories', sentAt: ago(6), messageId: null },
      ...(company.status === 'Replied' ? [{ id: company.id * 10 + 1, direction: 'Inbound' as const, subject: 'Re: Trade pricing for car accessories', sentAt: ago(5), messageId: null }] : []),
    ],
  };
}

function messageThread(request: DemoRequest): RadarMessageThread | ReturnType<typeof notFound> {
  const company = COMPANIES.find((candidate) => candidate.id === idParam(request));
  if (!company) return notFound();
  return {
    companyId: company.id, companyName: company.companyName, totalCount: 2,
    items: [
      { id: 1, direction: 'Outbound', subject: 'Trade pricing for car accessories', body: 'Hello, we supply floor mats and boot liners at trade prices. Would you like our catalogue?', sentAt: ago(6), messageId: null },
      { id: 2, direction: 'Inbound', subject: 'Re: Trade pricing for car accessories', body: 'Thanks - please send the catalogue and minimum order details.', sentAt: ago(5), messageId: null },
    ],
  };
}

function stats(): RadarStats {
  return {
    activeEmailAccounts: 2, totalEmailAccounts: 3, totalCompanies: COMPANIES.length,
    totalSentEmails: 612, totalRepliedCompanies: COMPANIES.filter((company) => company.status === 'Replied').length, replyRatePercent: 8.4,
    pendingEnrichmentCount: 11,
  };
}

function recentActivity(request: DemoRequest): RadarRecentActivityItem[] {
  const limit = numberQuery(request, 'limit') ?? 20;
  return COMPANIES.slice(0, limit).map((company, index): RadarRecentActivityItem => ({
    id: index + 1, companyName: company.companyName, country: company.country, direction: index % 5 === 0 ? 'Inbound' : 'Outbound',
    subject: index % 5 === 0 ? 'Re: Trade pricing for car accessories' : 'Trade pricing for car accessories', sentAt: ago(0, index * 2),
  }));
}

function analytics(): RadarAnalytics {
  const rng = createRng(RNG_SEED + 1);
  const byCity = CITIES.map((city) => ({ city, count: COMPANIES.filter((company) => company.city === city).length }));
  return {
    byCity,
    byCategory: SIC_DEFS.map(([category, label]) => ({ category, label, count: COMPANIES.filter((company) => company.category === category).length })),
    emailTrend: lastDays(TREND_DAYS, (date) => ({ date, sent: rng.int(18, 52), replied: rng.int(0, 5) })),
    funnel: { totalCompanies: COMPANIES.length, withEmail: 41, contacted: 33, replied: 6, bounced: 4, completed: 8 },
    awaitingAttention: COMPANIES.filter((company) => company.status === 'Replied').slice(0, 5).map((company) => ({
      companyId: company.id, companyName: company.companyName, email: company.email, lastActionAt: ago(1),
    })),
  };
}

const EMAIL_ACCOUNTS: RadarEmailAccount[] = [
  { id: 1, emailAddress: 'outreach1@example.com', smtpServer: 'smtp.example.com', smtpPort: 587, imapServer: 'imap.example.com', imapPort: 993, dailyLimit: 40, currentDailyCount: 22, isActive: true, createdAt: ago(80), updatedAt: ago(2) },
  { id: 2, emailAddress: 'outreach2@example.com', smtpServer: 'smtp.example.com', smtpPort: 587, imapServer: 'imap.example.com', imapPort: 993, dailyLimit: 40, currentDailyCount: 17, isActive: true, createdAt: ago(60), updatedAt: ago(1) },
  { id: 3, emailAddress: 'outreach3@example.com', smtpServer: 'smtp.example.com', smtpPort: 587, imapServer: 'imap.example.com', imapPort: 993, dailyLimit: 30, currentDailyCount: 0, isActive: false, createdAt: ago(30), updatedAt: ago(10) },
];

const SIC_CODES: RadarSicCode[] = SIC_DEFS.map(([code, label], index) => ({
  id: index + 1, code, label, isActive: index < 3, country: 'UK', lastFetchedAt: ago(index + 1), createdAt: ago(90),
}));

const TEMPLATES: RadarEmailTemplate[] = [
  { id: 1, templateType: 'Sequence', stepNumber: 1, sicCode: null, name: 'İlk temas', subject: 'Trade pricing for car accessories', body: 'Hello {{CompanyName}}, we supply car accessories at trade prices...', isActive: true },
  { id: 2, templateType: 'Sequence', stepNumber: 2, sicCode: null, name: 'Hatırlatma', subject: 'Following up: trade pricing', body: 'Hi {{CompanyName}}, just following up on my earlier note...', isActive: true },
  { id: 3, templateType: 'Reply', stepNumber: null, sicCode: null, name: 'Katalog yanıtı', subject: 'Re: your enquiry', body: 'Thanks for your reply - please find our catalogue attached.', isActive: true },
];

const SCRAPE_RUNS: RadarScrapeRun[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1, startedAt: ago(index), completedAt: ago(index, -1), companiesFound: 120 - index * 7, companiesUpserted: 64 - index * 4,
  emailsFound: 31 - index * 2, status: index === 5 ? 'Failed' : 'Completed', errorMessage: index === 5 ? 'Kaynak geçici olarak yanıt vermedi (demo).' : null,
}));

const ALERTS: RadarAlert[] = [
  { severity: 'Warning', country: 'UK', title: 'Günlük gönderim sınırına yaklaşıldı', message: 'outreach1@example.com hesabı bugünkü limitin %55\'ine ulaştı.' },
  { severity: 'Info', country: null, title: '6 şirket yanıt verdi', message: 'Yanıt veren şirketler bir sonraki adım için bekliyor.' },
];

function widgetSummary(request: DemoRequest): RadarWidgetSummaryDto {
  return {
    from: request.query.get('from') ?? dayAgo(TREND_DAYS - 1), to: request.query.get('to') ?? dayAgo(0), scrapedCompanyCount: COMPANIES.length,
    emailsSentCount: 612, leadRatePercent: 8.4, activeScrapeRunCount: 0,
    sicCodeDistribution: SIC_DEFS.map(([sicCode], index) => ({ sicCode, count: 18 - index * 4 })),
  };
}

const PARTNER_CLIENTS: PartnerHubClient[] = [
  { clientId: 'demo-partner-1', displayName: 'Demo İş Ortağı A', tenantId: 1, tenantName: 'Demo Oto Aksesuar', isEnabled: true },
  { clientId: 'demo-partner-2', displayName: 'Demo İş Ortağı B', tenantId: 1, tenantName: 'Demo Oto Aksesuar', isEnabled: false },
];

function partnerActivity(request: DemoRequest): PartnerHubActivity {
  const rng = createRng(RNG_SEED + 2);
  const days = TREND_DAYS * 2;
  const callsByDay = lastDays(days, (date) => ({ date, count: rng.int(10, 90) }));
  return {
    from: request.query.get('from') ?? dayAgo(days - 1), to: request.query.get('to') ?? dayAgo(0),
    totalCalls: callsByDay.reduce((sum, day) => sum + day.count, 0), callsByDay,
    callsByTool: [{ toolName: 'search_products', count: 540 }, { toolName: 'get_stock', count: 310 }, { toolName: 'get_price', count: 205 }],
    callsByClient: [{ clientId: 'demo-partner-1', displayName: 'Demo İş Ortağı A', count: 920 }, { clientId: 'demo-partner-2', displayName: 'Demo İş Ortağı B', count: 135 }],
  };
}

export const radarRoutes: DemoRoute[] = [
  get('/radar/dashboard/overview', widgetSummary),
  get('/radar/stats', stats),
  get('/radar/recent-activity', recentActivity),
  get('/radar/companies/cities', () => CITIES),
  get('/radar/companies/tags', () => ['trade']),
  get('/radar/companies', companyPage),
  get('/radar/companies/:id', companyDetail),
  get('/radar/companies/:id/messages', messageThread),
  get('/radar/analytics', analytics),
  get('/radar/scrape-runs', () => SCRAPE_RUNS),
  get('/radar/sic-codes', () => SIC_CODES),
  get('/radar/email-templates', () => TEMPLATES),
  get('/radar/email-accounts', () => EMAIL_ACCOUNTS),
  get('/radar/alerts', () => ALERTS),
  get('/partnerhub/clients', () => PARTNER_CLIENTS),
  get('/partnerhub/activity', partnerActivity),
];
