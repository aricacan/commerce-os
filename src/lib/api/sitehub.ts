import { request } from './core';

// ─── SiteHub (web sitesi talepleri + site istatistikleri) ─────────────────────

// Backend enum'larıyla birebir sayısal karşılık.
export const SITE_PROVIDER = {
  AdmPlastik: 1,
  // Eşlemesi panelden yapılan sağlayıcı — yeni site eklemek için kod gerekmez.
  Generic: 99,
} as const;
export type SiteProvider = (typeof SITE_PROVIDER)[keyof typeof SITE_PROVIDER];

export const SITE_STATUS = {
  Unknown: 0, Connected: 1, AuthFailed: 2, Unreachable: 3,
} as const;
export type SiteStatus = (typeof SITE_STATUS)[keyof typeof SITE_STATUS];

export const REQUEST_TYPE = {
  Offer: 1, Message: 2,
} as const;
export type SiteRequestType = (typeof REQUEST_TYPE)[keyof typeof REQUEST_TYPE];

export const REQUEST_STATUS = {
  New: 0, InProgress: 1, Quoted: 2, Won: 3, Lost: 4, Closed: 5,
} as const;
export type SiteRequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

// Sitenin içerik dili. Ortak blog yazısı farklı dildeki bir siteye gönderilirken sunucuda
// otomatik çevrilir (TR yazı → UK sitesine İngilizce).
export type SiteContentLanguage = 'tr' | 'en';

export const SITE_CONTENT_LANGUAGE_LABELS: Record<SiteContentLanguage, string> = {
  tr: 'Türkçe',
  en: 'İngilizce (UK)',
};

// Sunucu API anahtarını ASLA geri döndürmez — yalnızca girilmiş olup olmadığını.
export interface SiteConnectionDto {
  id: number;
  provider: SiteProvider;
  providerLabel: string;
  displayName: string;
  websiteUrl: string | null;
  baseUrl: string;
  // Genel sağlayıcının eşleme ayarı. Sır değil — panelden düzenlenebilir.
  adapterConfigJson: string | null;
  storeCode: string | null;
  contentLanguage: SiteContentLanguage;
  statsPeriodDays: number;
  isActive: boolean;
  // 401 sonrası sistem tarafından duraklatıldı; kullanıcı anahtarı düzeltip
  // devam ettirene kadar otomatik senkron çalışmaz.
  isPaused: boolean;
  pausedReason: string | null;
  status: SiteStatus;
  lastError: string | null;
  lastCheckedAt: string | null;
  lastSyncedAt: string | null;
  hasApiKey: boolean;
  pendingRequestCount: number;
  // Sitede blog desteği açık mı (formdaki "Blog destekler" — tahmin değil, açık bayrak).
  // Opsiyonel: frontend backend'den önce yayına çıkabilir; yoksa siteSupportsBlog() eski
  // tahmin kuralına düşer. Doğrudan okumayın, siteSupportsBlog() kullanın.
  supportsBlog?: boolean;
}

export interface SiteConnectionCreateBody {
  provider: SiteProvider;
  displayName: string;
  websiteUrl?: string | null;
  baseUrl: string;
  adapterConfigJson?: string | null;
  apiKey: string;
  storeCode?: string | null;
  contentLanguage: SiteContentLanguage;
  supportsBlog: boolean;
  statsPeriodDays: number;
  isActive: boolean;
}

export interface SiteConnectionUpdateBody {
  displayName: string;
  websiteUrl?: string | null;
  baseUrl: string;
  adapterConfigJson?: string | null;
  // Boş bırakılırsa mevcut anahtar korunur.
  apiKey?: string | null;
  storeCode?: string | null;
  contentLanguage: SiteContentLanguage;
  supportsBlog: boolean;
  statsPeriodDays: number;
  isActive: boolean;
  resume: boolean;
}

export interface SiteProbeDto {
  success: boolean;
  status: SiteStatus;
  error: string | null;
  pendingCount: number | null;
}

export interface SiteRequestListItemDto {
  id: number;
  siteConnectionId: number;
  siteName: string;
  sourceType: SiteRequestType;
  typeLabel: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  preview: string;
  receivedAt: string | null;
  importedAt: string;
  status: SiteRequestStatus;
  assignedUserId: number | null;
}

export interface SiteRequestDetailDto extends Omit<SiteRequestListItemDto, 'preview'> {
  sourceId: number;
  // Yalnızca sourceType === Message iken dolu.
  message: string | null;
  // Yalnızca sourceType === Offer iken dolu.
  service: string | null;
  ip: string | null;
  // Sitenin gönderdiği ham kayıt (JSON metin). Sabit alanlara girmeyen her şeyi
  // (rastgele bir API'nin tanımadığımız alanlarını) içerir — panelde "diğer
  // alanlar" olarak, tamamlayıcı bilgi diye gösterilir.
  rawPayloadJson: string | null;
  ackedAt: string | null;
  internalNote: string | null;
}

export interface SiteRequestPageDto {
  items: SiteRequestListItemDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface SiteRequestUpdateBody {
  status: SiteRequestStatus;
  internalNote?: string | null;
  assignedUserId?: number | null;
}

export interface SiteStatDto {
  siteConnectionId: number;
  siteName: string;
  isPaused: boolean;
  newRequestCount: number;
  pageViewsPeriod: number;
  uniqueVisitorsPeriod: number;
  newsletterSubscribers: number;
  productsPublished: number;
  postsPublished: number;
  lastSyncedAt: string | null;
}

export interface SiteOverviewDto {
  siteCount: number;
  activeSiteCount: number;
  pausedSiteCount: number;
  newRequestCount: number;
  openRequestCount: number;
  requestsLast24Hours: number;
  pageViewsPeriod: number;
  uniqueVisitorsPeriod: number;
  newsletterSubscribers: number;
  lastSyncedAt: string | null;
  sites: SiteStatDto[];
}

export interface SiteSyncRunDto {
  id: number;
  siteConnectionId: number;
  siteName: string;
  startedAt: string;
  finishedAt: string | null;
  success: boolean;
  error: string | null;
  fetchedCount: number;
  importedCount: number;
  ackedCount: number;
  ackFailedCount: number;
}

// ─── Grafikler ────────────────────────────────────────────────────────────────
//
// Seriler "uzun format"ta gelir (satır başına tarih + site + değer). Pivot burada
// yapılır çünkü site sayısı değişken: 5 site de olsa 10 da olsa sözleşme aynı.

export interface SiteRefDto {
  siteConnectionId: number;
  siteName: string;
}

export interface SiteDailyCountDto {
  date: string;
  siteConnectionId: number;
  count: number;
}

export interface SiteDailyTrafficDto {
  date: string;
  siteConnectionId: number;
  pageViews: number;
  uniqueVisitors: number;
}

export interface SiteTypeBreakdownDto {
  siteConnectionId: number;
  siteName: string;
  offers: number;
  messages: number;
}

export interface SiteAnalyticsDto {
  days: number;
  sites: SiteRefDto[];
  requestPoints: SiteDailyCountDto[];
  trafficPoints: SiteDailyTrafficDto[];
  typeBreakdown: SiteTypeBreakdownDto[];
}

export interface SiteStatusCountDto {
  status: SiteRequestStatus;
  count: number;
}

export interface SiteDetailDto {
  site: SiteConnectionDto;
  latestStats: SiteStatDto | null;
  totalRequestCount: number;
  pendingAckCount: number;
  statusCounts: SiteStatusCountDto[];
  offerCount: number;
  messageCount: number;
  requestPoints: SiteDailyCountDto[];
  trafficPoints: SiteDailyTrafficDto[];
  recentRuns: SiteSyncRunDto[];
  recentRequests: SiteRequestListItemDto[];
}

// ─── Blog (ERP → site içerik gönderme) ─────────────────────────────────────────
//
// ADM Plastik ve StoreB artık aynı şemada anlaştı: slug/title/excerpt/content/
// coverImage/published. Yazılar burada SAKLANMAZ — her istek doğrudan siteye
// gider, site kaynak doğrusu kalır.

export interface SiteBlogPostDto {
  slug: string;
  title: string;
  excerpt: string | null;
  // Liste görünümünde genelde boş gelir; yalnızca tek yazı isteğinde dolu.
  content: string | null;
  // Yalnızca çift dilli siteler için (DEMO Levha gibi); diğerlerinde null.
  titleEn: string | null;
  excerptEn: string | null;
  contentEn: string | null;
  coverImageUrl: string | null;
  lang: string | null;
  published: boolean;
  // Yalnızca yayın durumunu tarihle tutan sitelerde dolu (DEMO Levha: publishedAt).
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SiteBlogPostInput {
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  titleEn?: string | null;
  excerptEn?: string | null;
  contentEn?: string | null;
  // Yalnızca URL — dosya yükleme desteklenmiyor (siteler tarafında da yok).
  coverImageUrl?: string | null;
  lang?: string | null;
  published: boolean;
}

// Yalnızca DEĞİŞEN alanlar gönderilir; undefined = dokunma.
export interface SiteBlogPostPatch {
  title?: string;
  excerpt?: string;
  content?: string;
  titleEn?: string;
  excerptEn?: string;
  contentEn?: string;
  coverImageUrl?: string;
  lang?: string;
  published?: boolean;
}

// Aynı yazıyı BİRDEN FAZLA siteye tek seferde göndermenin sonucu. Her site
// kendi başarı/hata durumunu taşır — biri "slug_taken" dese bile diğerleri
// etkilenmez.
export interface SiteBlogBroadcastResultItem {
  siteConnectionId: number;
  siteName: string;
  success: boolean;
  error: string | null;
  post: SiteBlogPostDto | null;
  // Sitenin dili ve yazının bu site için çevrilip çevrilmediği.
  language: SiteContentLanguage;
  translated: boolean;
  // Aynı slug sitede zaten vardı — yeniden oluşturulmadı (tekrar gönderimde çift yazı yok).
  alreadyExisted: boolean;
}

// AI düzenleme/çevirinin çalıştığı metin alanları.
export interface SiteBlogDraft {
  title: string;
  excerpt: string | null;
  content: string;
}

// Sunucu yayını en fazla 3 dk sürdürür (siteler paralel, çeviri dahil); ön yüz ondan önce
// kesmemeli — kesilirse hangi siteye gittiği sonucu kaybolur.
const BLOG_BROADCAST_TIMEOUT_MS = 200_000;
// Uzun bir yazının parça parça çevrilmesi/düzenlenmesi 25 sn'yi rahatça aşar.
const BLOG_AI_TIMEOUT_MS = 120_000;

export interface InboxQuery {
  siteId?: number;
  type?: SiteRequestType;
  status?: SiteRequestStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

function toQueryString(query: InboxQuery): string {
  const params = new URLSearchParams();
  // Boş/undefined filtreler URL'e yazılmaz — backend "filtre yok" ile "boş
  // filtre"yi ayırt edebilsin.
  if (query.siteId != null) params.set('siteId', String(query.siteId));
  if (query.type != null) params.set('type', String(query.type));
  if (query.status != null) params.set('status', String(query.status));
  if (query.search) params.set('search', query.search);
  if (query.page != null) params.set('page', String(query.page));
  if (query.pageSize != null) params.set('pageSize', String(query.pageSize));

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ─── Ana dashboard (KpiBar) özet kartı ─────────────────────────────────────────

export interface SiteHubDailyRequestPointDto {
  date: string;
  requestCount: number;
}

export interface SiteHubWidgetSummaryDto {
  from: string;
  to: string;
  connectedSiteCount: number;
  // Frontend Vercel'de backend'den ÖNCE yayına çıkıyor — bu iki alan backend
  // güncellenene kadar gelmez, bu yüzden opsiyonel okunur.
  totalSiteCount?: number;
  pausedSiteCount?: number;
  requestCount: number;
  respondedRequestCount: number;
  blogPostCount: number;
  dailyTrend: SiteHubDailyRequestPointDto[];
}

export const siteHubApi = {
  getWidgetSummary: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const qs = q.toString();
    return request<SiteHubWidgetSummaryDto>(`/sitehub/dashboard/widget-summary${qs ? `?${qs}` : ''}`);
  },

  getSites: () => request<SiteConnectionDto[]>('/sitehub/sites'),
  createSite: (body: SiteConnectionCreateBody) =>
    request<SiteConnectionDto>('/sitehub/sites', { method: 'POST', body: JSON.stringify(body) }),
  updateSite: (id: number, body: SiteConnectionUpdateBody) =>
    request<SiteConnectionDto>(`/sitehub/sites/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSite: (id: number) =>
    request<void>(`/sitehub/sites/${id}`, { method: 'DELETE' }),
  // Yalnızca okur — talepleri sitede "işlendi" göstermez.
  probeSite: (id: number) =>
    request<SiteProbeDto>(`/sitehub/sites/${id}/probe`, { method: 'POST' }),
  syncSite: (id: number) =>
    request<SiteSyncRunDto>(`/sitehub/sites/${id}/sync`, { method: 'POST' }),

  getInbox: (query: InboxQuery = {}) =>
    request<SiteRequestPageDto>(`/sitehub/inbox${toQueryString(query)}`),
  getRequest: (id: number) =>
    request<SiteRequestDetailDto>(`/sitehub/inbox/${id}`),
  updateRequest: (id: number, body: SiteRequestUpdateBody) =>
    request<SiteRequestDetailDto>(`/sitehub/inbox/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  getOverview: () => request<SiteOverviewDto>('/sitehub/dashboard/overview'),
  getRuns: (limit = 20) => request<SiteSyncRunDto[]>(`/sitehub/dashboard/runs?limit=${limit}`),
  getAnalytics: (days = 30) => request<SiteAnalyticsDto>(`/sitehub/dashboard/analytics?days=${days}`),

  // Site detay paneli — tek çağrıda o siteye ait her şey.
  getSiteDetail: (id: number, days = 30) =>
    request<SiteDetailDto>(`/sitehub/sites/${id}/detail?days=${days}`),

  // Blog — yazılar burada saklanmaz, her çağrı doğrudan siteye gider.
  getBlogPosts: (siteId: number) =>
    request<SiteBlogPostDto[]>(`/sitehub/sites/${siteId}/blog`),
  getBlogPost: (siteId: number, slug: string) =>
    request<SiteBlogPostDto>(`/sitehub/sites/${siteId}/blog/${encodeURIComponent(slug)}`),
  createBlogPost: (siteId: number, body: SiteBlogPostInput) =>
    request<SiteBlogPostDto>(`/sitehub/sites/${siteId}/blog`, { method: 'POST', body: JSON.stringify(body) }),
  updateBlogPost: (siteId: number, slug: string, body: SiteBlogPostPatch) =>
    request<SiteBlogPostDto>(`/sitehub/sites/${siteId}/blog/${encodeURIComponent(slug)}`, {
      method: 'PUT', body: JSON.stringify(body),
    }),
  deleteBlogPost: (siteId: number, slug: string) =>
    request<void>(`/sitehub/sites/${siteId}/blog/${encodeURIComponent(slug)}`, { method: 'DELETE' }),

  // Tek yazıyı seçilen sitelerin HEPSİNE birden gönderir — "adaptör başına
  // uğraşmadan tek blog yazıp ortak şekilde yollamak" için. Her site kendi
  // sonucunu döner, biri başarısız olsa diğerleri etkilenmez.
  broadcastBlogPost: (siteConnectionIds: number[], post: SiteBlogPostInput, sourceLanguage: SiteContentLanguage) =>
    request<SiteBlogBroadcastResultItem[]>('/sitehub/blog/broadcast', {
      method: 'POST', body: JSON.stringify({ siteConnectionIds, post, sourceLanguage }),
    }, true, BLOG_BROADCAST_TIMEOUT_MS),

  // Göndermeden önce önizleme: yazının hedef dildeki hâli.
  translateBlogDraft: (post: SiteBlogDraft, sourceLanguage: SiteContentLanguage, targetLanguage: SiteContentLanguage) =>
    request<SiteBlogDraft>('/sitehub/blog/ai/translate', {
      method: 'POST', body: JSON.stringify({ post, sourceLanguage, targetLanguage }),
    }, true, BLOG_AI_TIMEOUT_MS),

  // Talimatla yeniden yazma ("SEO uyumlu yap", "kısalt"...).
  assistBlogDraft: (post: SiteBlogDraft, language: SiteContentLanguage, instruction: string) =>
    request<SiteBlogDraft>('/sitehub/blog/ai/assist', {
      method: 'POST', body: JSON.stringify({ post, language, instruction }),
    }, true, BLOG_AI_TIMEOUT_MS),
};
