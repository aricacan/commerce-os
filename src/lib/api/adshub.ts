import { request } from './core';
import { AI_REQUEST_TIMEOUT_MS, type AiChatTurn, type AiDataCard } from './ai';
import type { ErpSourceCode } from '../../stores/store-selector';

// ─── AdsHub (Google/Meta reklam harcaması + performans) ───────────────────────
//
// Backend enum'larıyla birebir sayısal karşılık (bkz. AdsHub.Core.Enums).

export const AD_PLATFORM = {
  Meta: 1,
  Google: 2,
  TikTok: 3,
} as const;
export type AdPlatform = (typeof AD_PLATFORM)[keyof typeof AD_PLATFORM];

// OAuth uçlarının route segmenti ("/adshub/oauth/{slug}/start") — backend'in
// AdsHubOAuthController.TryParsePlatform ile aynı üç değer.
export type AdPlatformSlug = 'meta' | 'google' | 'tiktok';

export const AD_PLATFORM_SLUG: Record<AdPlatform, AdPlatformSlug> = {
  [AD_PLATFORM.Meta]: 'meta',
  [AD_PLATFORM.Google]: 'google',
  [AD_PLATFORM.TikTok]: 'tiktok',
};

export function parseAdPlatformSlug(slug: string): AdPlatform | null {
  switch (slug) {
    case 'meta': return AD_PLATFORM.Meta;
    case 'google': return AD_PLATFORM.Google;
    case 'tiktok': return AD_PLATFORM.TikTok;
    default: return null;
  }
}

export const AD_ACCOUNT_STATUS = {
  // RateLimited (4) "Ulaşılamıyor"dan AYRI: kota dolması ağ arızası değildir,
  // farklı bir eylem gerektirir (senkron sıklığını düşür / Google'dan daha
  // yüksek erişim seviyesi iste).
  Unknown: 0, Connected: 1, AuthFailed: 2, Unreachable: 3, RateLimited: 4,
} as const;
export type AdAccountStatus = (typeof AD_ACCOUNT_STATUS)[keyof typeof AD_ACCOUNT_STATUS];

export const AD_ENTITY_STATUS = {
  Unknown: 0, Active: 1, Paused: 2, Archived: 3, Deleted: 4,
} as const;
export type AdEntityStatus = (typeof AD_ENTITY_STATUS)[keyof typeof AD_ENTITY_STATUS];

export const AD_LEVEL = {
  Account: 0, Campaign: 1, AdGroup: 2, Ad: 3,
} as const;
export type AdLevel = (typeof AD_LEVEL)[keyof typeof AD_LEVEL];

export const AD_SYNC_RUN_TYPE = {
  Metadata: 1, Metrics: 2, Backfill: 3, Manual: 4,
} as const;
export type AdSyncRunType = (typeof AD_SYNC_RUN_TYPE)[keyof typeof AD_SYNC_RUN_TYPE];

// ─── Hesap ──────────────────────────────────────────────────────────────────
//
// Sunucu jetonu ASLA geri döndürmez — yalnızca girilmiş olup olmadığını.
export interface AdAccountDto {
  id: number;
  platform: AdPlatform;
  platformName: string;
  externalAccountId: string;
  displayName: string;
  currencyCode: string;
  timeZone: string | null;
  // "storea-sentos"/"base-storeb" gibi ÇOKLU ERP kaynak kodu — Topbar'daki
  // ERP seçicisiyle aynı taksonomi (bkz. store-selector.ts ErpSourceCode).
  // "Base" ayrı bir mağaza değil, bir markanın connector'ı olduğu için tek
  // seçime zorlamak yanlış: Base genelde birden fazla markanın ortak
  // yerine getirme kanalı.
  erpSourceCodes: ErpSourceCode[];
  isActive: boolean;
  // 401 sonrası sistem tarafından duraklatıldı; kullanıcı jetonu düzeltip
  // devam ettirene kadar otomatik senkron çalışmaz.
  isPaused: boolean;
  pausedReason: string | null;
  status: AdAccountStatus;
  lastError: string | null;
  lastCheckedAt: string | null;
  lastSyncedAt: string | null;
  metricsSyncedThrough: string | null;
  backfillDays: number;
  hasCredentials: boolean;
  // Erişim jetonunun bitiş zamanı (UTC ISO). Platform süre bildirmediyse null; eski backend
  // alanı hiç göndermeyebilir (frontend backend'den önce yayına çıkar) — rozet o zaman gizli.
  tokenExpiresAt?: string | null;
  campaignCount: number;
  activeCampaignCount: number;
  createdAt: string;
}

export interface AdAccountCreateBody {
  platform: AdPlatform;
  externalAccountId: string;
  displayName?: string | null;
  erpSourceCodes?: ErpSourceCode[];
  backfillDays: number;
  isActive: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  developerToken?: string | null;
  loginCustomerId?: string | null;
  // TikTok: AppId/AppSecret (bkz. AdAccountCreateDto).
  appId?: string | null;
  appSecret?: string | null;
}

export interface AdAccountUpdateBody {
  displayName?: string | null;
  erpSourceCodes?: ErpSourceCode[];
  backfillDays: number;
  isActive: boolean;
  resume: boolean;
  // Boş bırakılırsa mevcut değer korunur.
  accessToken?: string | null;
  refreshToken?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  developerToken?: string | null;
  loginCustomerId?: string | null;
  appId?: string | null;
  appSecret?: string | null;
}

// ─── OAuth ("Connect with X") ───────────────────────────────────────────────
//
// /start bearer'lı bir fetch'tir: backend state'i BAŞLATAN kullanıcıya ve kiracıya
// bağlar, consent URL'ini döner; panel ardından o URL'e tam sayfa yönlenir
// (bkz. AccountFormDialog). Yalnızca platformdan dönen /callback anonim kalır.
export interface OAuthStartResponseDto {
  url: string;
}

export interface OAuthSessionAccountDto {
  externalAccountId: string;
  displayName: string;
  currencyCode: string | null;
  // Yalnızca Google — Yönetici (Manager/MCC) hesabı mı? Kendi kampanyası
  // olmaz, seçilirse senkron hep 0 kampanya döner (canlıda yaşandı).
  isManagerAccount?: boolean | null;
}

export interface OAuthSessionDto {
  platform: AdPlatform;
  accounts: OAuthSessionAccountDto[];
}

export interface OAuthCompleteBody {
  externalAccountId: string;
  displayName?: string | null;
  erpSourceCodes?: ErpSourceCode[];
  backfillDays: number;
  isActive: boolean;
}

export interface AdAccountProbeDto {
  success: boolean;
  status: AdAccountStatus;
  error: string | null;
  accountName: string | null;
  currencyCode: string | null;
  timeZone: string | null;
}

export interface AdSyncRunDto {
  id: number;
  adAccountId: number;
  accountName: string;
  type: AdSyncRunType;
  startedAt: string;
  finishedAt: string | null;
  success: boolean;
  error: string | null;
  fetchedCount: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  checkpoint: string | null;
}

// ─── Panel görünümleri ────────────────────────────────────────────────────────

export interface AdsPlatformSummaryDto {
  platform: AdPlatform;
  platformName: string;
  spendTry: number;
  impressions: number;
  clicks: number;
}

export interface AdsAccountSummaryDto {
  adAccountId: number;
  accountName: string;
  platform: AdPlatform;
  currencyCode: string;
  erpSourceCodes: ErpSourceCode[];
  spend: number;
  spendTry: number;
  impressions: number;
  clicks: number;
}

export interface AdsDailyPointDto {
  date: string;
  spendTry: number;
  impressions: number;
  clicks: number;
  platformConversions: number | null;
  // Backend'den YENİ gelen alanlar — frontend Vercel'e önce çıktığı için
  // opsiyonel okunur (eski API sürümünde undefined gelir, null gibi davranır).
  platformConversionValueTry?: number | null;
  // Günlük ACOS/TACOS: bilinmiyorsa null — asla 0'a çevrilmez.
  platformAcosPercent?: number | null;
  erpRevenueTry?: number | null;
  tacosPercent?: number | null;
}

// Üst şeritteki özet kartların kaynağı.
export interface AdsOverviewDto {
  from: string;
  to: string;
  totalSpendTry: number;
  // Kur bulunamadığı için TL toplamına GİRMEYEN satır sayısı — 0 değilse
  // toplamın eksik olduğu ayrıca gösterilmeli.
  unconvertedRowCount: number;
  // Filtre TEK bir para birimine indiriyorsa (ör. yalnızca GBP hesap), bu
  // dolu gelir — kur çevrimine bağımlı olmadan gösterilecek gerçek rakam.
  nativeCurrencyCode: string | null;
  totalSpendNative: number | null;
  totalImpressions: number;
  totalClicks: number;
  ctr: number | null;
  cpcTry: number | null;
  cpmTry: number | null;
  // PLATFORMUN kendi raporu — gerçek satış değil, referans amaçlı.
  platformConversions: number | null;
  platformConversionValueTry: number | null;
  platformRoas: number | null;
  // ACOS (%) — reklam harcamasinin, O REKLAMIN getirdigi ciroya orani.
  // platformRoas ile AYNI kaynaga dayanir: platformun kendi attribution penceresi.
  platformAcosPercent: number | null;
  // TACOS (%) — reklam harcamasinin TOPLAM ciroya orani. Payda ERPden gelir,
  // platformun attributionina bagli DEGILDIR; organik satisi da kapsar.
  tacosPercent: number | null;
  // TACOSun paydasi — kullanici hangi ciro uzerinden hesaplandigini gorebilmeli.
  erpTotalRevenueTry: number | null;
  // true ise TACOS TUM ERP kaynaklarini kapsiyor (reklam hesabina eslesme atanmamis).
  tacosScopeIsAllSources: boolean;
  activeAccountCount: number;
  activeCampaignCount: number;
  byPlatform: AdsPlatformSummaryDto[];
  byAccount: AdsAccountSummaryDto[];
  daily: AdsDailyPointDto[];
  // Huni adımlarını YALNIZCA Meta raporluyor (Google/TikTok API'leri vermiyor).
  // Bu yüzden huninin satın alma adımı platformConversions DEĞİL, aynı kaynaktan
  // gelen funnelPurchaseCount'tur — aksi hâlde "ödeme başlatma < satın alma" gibi
  // imkânsız bir huni çıkar. funnelPlatformNames kapsamı UI'da yazmak için.
  addToCartCount: number | null;
  initiateCheckoutCount: number | null;
  funnelPurchaseCount: number | null;
  funnelPlatformNames: string[];
}

// ─── Yerleşim / cihaz kırılımı ─────────────────────────────────────────────────

export interface AdPlacementBreakdownDto {
  publisherPlatform: string;
  platformPosition: string;
  spendTry: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpcTry: number | null;
}

export interface AdDeviceBreakdownDto {
  impressionDevice: string;
  spendTry: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpcTry: number | null;
}

export interface AdBreakdownOverviewDto {
  from: string;
  to: string;
  byPlacement: AdPlacementBreakdownDto[];
  byDevice: AdDeviceBreakdownDto[];
  // Kur bulunamadığı için TL'ye çevrilemeyen kırılım satırı sayısı.
  unconvertedRowCount: number;
}

// ─── Gerçek kâr köprüsü ─────────────────────────────────────────────────────
//
// Modülün asıl amacı: reklam harcamasını ERP'nin gerçek kârıyla birleştirmek.
// erp* alanları platform* alanlarıyla (bkz. AdsOverviewDto.platformRoas) ASLA
// aynı yerde toplanmaz — biri gerçek satış, diğeri platformun kendi raporu.

export interface AdsBlendedDayDto {
  date: string;
  adSpendTry: number;
  erpRevenueTry: number;
  erpNetProfitTry: number;
  // O gün seçili ERP kaynak(lar)ındaki TOPLAM sipariş sayısı — kampanyaya
  // özel bir atıf DEĞİL, "o gün mağazada kaç sipariş oldu" sorusunun cevabı.
  erpOrderCount: number;
  trueNetTry: number;
  mer: number | null;
  // Günlük TACOS (%) = o günün harcaması / o günün gerçek ERP cirosu.
  // Opsiyonel: frontend backend'den önce yayına çıkar.
  tacosPercent?: number | null;
}

export interface AdsBlendedProfitDto {
  from: string;
  to: string;
  totalAdSpendTry: number;
  totalErpRevenueTry: number;
  totalErpNetProfitTry: number;
  totalTrueNetTry: number;
  mer: number | null;
  // Aralığın TACOS'u (%). Paydası yalnızca HARCAMA OLAN günlerin cirosudur.
  tacosPercent?: number | null;
  totalErpOrderCount: number;
  // Kâr/net hesabı HER ZAMAN TL — ERP maliyet zinciri TL tabanlı olduğu için
  // GBP'ye çevirmek yanlış varsayım gerektirirdi. Bu yalnızca EK bilgi.
  nativeCurrencyCode: string | null;
  totalAdSpendNative: number | null;
  daysWithSpendButNoOrders: number;
  // Kaç günün harcaması TL'ye ÇEVRİLEMEDİ (kur yok) — o günler 0 harcama
  // gibi sayıldı, TotalAdSpendTry eksik olabilir.
  unconvertedSpendDayCount: number;
  erpSourceCodesUsed: string[];
  usedAllStoresFallback: boolean;
  matchedStoreCount: number;
  requestedStoreCount: number;
  daily: AdsBlendedDayDto[];
}

// Kampanya/set/reklam tablosunun ORTAK satır tipi.
export interface AdEntityRowDto {
  id: number;
  externalId: string;
  name: string;
  level: AdLevel;
  parentId: number | null;
  parentName: string | null;
  adAccountId: number;
  accountName: string;
  platform: AdPlatform;
  currencyCode: string;
  erpSourceCodes: ErpSourceCode[];
  status: AdEntityStatus;
  statusRaw: string | null;
  objective: string | null;
  isDeletedOnPlatform: boolean;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  thumbnailUrl: string | null;
  creativeTitle: string | null;
  creativeBody: string | null;
  spend: number;
  spendTry: number | null;
  impressions: number;
  clicks: number;
  reach: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  platformConversions: number | null;
  platformConversionValue: number | null;
  platformRoas: number | null;
  // Satır bazında Platform ACOS (%). Harcama ve dönüşüm değeri AYNI para
  // biriminde olduğu için kur bilinmese bile doğru. Opsiyonel: FE önce çıkar.
  platformAcosPercent?: number | null;
  costPerConversion: number | null;
  // Huni ara adımları — platformun kendi raporu, kâr hesabında kullanılmaz.
  addToCartCount: number | null;
  initiateCheckoutCount: number | null;
  // Bu satırın hesabının ERP kaynağının, seçili tarih aralığındaki toplam
  // sipariş sayısı. KAMPANYAYA ÖZEL ATIF DEĞİL — aynı hesaba bağlı tüm
  // satırlarda AYNI sayı görünür (mağaza toplamı). Eşleme yoksa null.
  erpOrderCount: number | null;
  // Yalnızca ACTİF reklam (level=ad) satırlarında hesaplanır. true = iniş sayfasındaki ürün
  // ERP'de stokta yok. null = belirlenemedi (kampanya/set satırı, pasif reklam, koleksiyon/
  // kategori linki ya da eşleşen ürün yok) — "stokta var" ile KARIŞTIRILMASIN.
  isLandingProductOutOfStock: boolean | null;
  // GERÇEK atıf — platformun kendi kendine raporladığı platformConversions'ın AKSİNE, proaktif
  // URL etiketlemeyle yakalanıp ERP siparişine BİREBİR eşleşen sipariş sayısı/cirosu (TL).
  // null = bu varlık için HİÇ atıf edilmiş sipariş yok (etiketleme kurulu değil, henüz sipariş
  // gelmedi ya da eşleşen sipariş bulunamadı) — "0 sipariş" ile KARIŞTIRILMASIN.
  realAttributedOrderCount: number | null;
  realAttributedRevenueTry: number | null;
  // Creative-bazlı kâr: reklamın yönlendirdiği TEK ürünün MEVCUT liste fiyatı üzerinden
  // marjı (%) — SİPARİŞ/atıf verisi DEĞİL, realAttributedOrderCount'tan bağımsız, URL
  // etiketleme kurulmadan da çalışır. Aynı kapsam kuralları isLandingProductOutOfStock ile
  // aynı — null = belirlenemedi/maliyet bilgisi yok, "%0 marj" ile KARIŞTIRILMASIN.
  landingProductGrossMarginPercent: number | null;
  landingProductName: string | null;
}

export interface AdEntityPageDto {
  rows: AdEntityRowDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalSpendTry: number;
  // Filtre tek para birimine indiriyorsa dolu — kur bulunamadığında bile
  // doğru kalan tek toplam.
  nativeCurrencyCode: string | null;
  totalSpendNative: number | null;
  // Kur bulunamadığı için TL toplamına GİRMEYEN satır sayısı (> 0 ise toplam eksik).
  unconvertedRowCount: number;
}

export interface AdEntityQueryParams {
  from?: string;
  to?: string;
  adAccountId?: number;
  erpSourceCodes?: string;
  platforms?: string;
  parentId?: number;
  search?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
  // toQuery() bir index signature bekliyor; tekil alanlarla birlikte
  // interface'i Record<string, ...>'a yapısal olarak uyumlu tutar.
  [key: string]: string | number | boolean | undefined;
}

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

// "storea-sentos,base-storeb" — X-Store header'ıyla aynı konvansiyon.
function joinCodes(codes?: ErpSourceCode[]): string | undefined {
  return codes && codes.length > 0 ? codes.join(',') : undefined;
}

// "1,2" — AdPlatform tamsayı listesi, backend'in ParsePlatforms'uyla aynı
// konvansiyon (bkz. AdsHubDashboardController.ParsePlatforms).
function joinPlatforms(platforms?: AdPlatform[]): string | undefined {
  return platforms && platforms.length > 0 ? platforms.join(',') : undefined;
}

// ─── AI Sohbet ──────────────────────────────────────────────────────────────

export interface AdsChatResponse {
  reply: string;
}

// ─── AI Önerileri (Z-score anomali tespiti) ─────────────────────────────────
//
// Backend enum'larıyla birebir sayısal karşılık (bkz. AdsHub.Core.Enums.AdsRecommendationEnums).

export const ADS_ANOMALY_METRIC = {
  Spend: 1, Ctr: 2, Cpc: 3, Cpm: 4, ConversionCount: 5,
  ConversionRate: 6, Revenue: 7, Roas: 8, Cpa: 9,
} as const;
export type AdsAnomalyMetric = (typeof ADS_ANOMALY_METRIC)[keyof typeof ADS_ANOMALY_METRIC];

// Healthy=0 bilerek en düşük değer — backend Severity'ye göre OrderByDescending
// yapıyor, Critical doğal olarak listenin başında çıkar.
export const ADS_RECOMMENDATION_SEVERITY = {
  Healthy: 0, Opportunity: 1, Warning: 2, Critical: 3,
} as const;
export type AdsRecommendationSeverity = (typeof ADS_RECOMMENDATION_SEVERITY)[keyof typeof ADS_RECOMMENDATION_SEVERITY];

export interface AdsRecommendationDto {
  erpSourceCode: string;
  metric: AdsAnomalyMetric;
  severity: AdsRecommendationSeverity;
  evaluatedDate: string;
  value: number;
  baselineAverage: number;
  zScore: number;
}

// ─── Onay/Aksiyon sistemi ────────────────────────────────────────────────────

export const ADS_ACTION_TYPE = {
  Pause: 1, Resume: 2, UpdateBudget: 3,
} as const;
export type AdsActionType = (typeof ADS_ACTION_TYPE)[keyof typeof ADS_ACTION_TYPE];

export const ADS_ACTION_PROPOSAL_STATUS = {
  PendingApproval: 1, Approved: 2, Rejected: 3, Executed: 4, Failed: 5,
} as const;
export type AdsActionProposalStatus = (typeof ADS_ACTION_PROPOSAL_STATUS)[keyof typeof ADS_ACTION_PROPOSAL_STATUS];

export interface AdsActionProposalDto {
  id: number;
  adAccountId: number;
  adCampaignId: number;
  actionType: AdsActionType;
  status: AdsActionProposalStatus;
  currentBudget: number | null;
  proposedBudget: number | null;
  reason: string;
  simulationOnly: boolean;
  executionError: string | null;
  rollbackOfProposalId: number | null;
  createdAt: string;
}

export interface AdsActionProposalCreateBody {
  adAccountId: number;
  adCampaignId: number;
  actionType: AdsActionType;
  proposedBudget?: number | null;
  reason: string;
  simulationOnly: boolean;
}

export const adsHubApi = {
  // ── Hesaplar ──
  listAccounts: () => request<AdAccountDto[]>('/adshub/accounts'),
  getAccount: (id: number) => request<AdAccountDto>(`/adshub/accounts/${id}`),
  listPlatforms: () => request<{ platform: AdPlatform; name: string }[]>('/adshub/accounts/platforms'),

  createAccount: (body: AdAccountCreateBody) =>
    request<AdAccountDto>('/adshub/accounts', { method: 'POST', body: JSON.stringify(body) }),

  updateAccount: (id: number, body: AdAccountUpdateBody) =>
    request<AdAccountDto>(`/adshub/accounts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteAccount: (id: number) =>
    request<void>(`/adshub/accounts/${id}`, { method: 'DELETE' }),

  probeAccount: (id: number) =>
    request<AdAccountProbeDto>(`/adshub/accounts/${id}/probe`, { method: 'POST' }),

  syncAccount: (id: number) =>
    request<AdSyncRunDto>(`/adshub/accounts/${id}/sync`, { method: 'POST' }),

  // ── OAuth ── (getOAuthSession/completeOAuthSession bearer'lı fetch üzerinden
  // gider — /start da artık bearer'lı; yalnızca platformdan dönen /callback anonim.)
  startOAuth: (platform: AdPlatform) =>
    request<OAuthStartResponseDto>(`/adshub/oauth/${AD_PLATFORM_SLUG[platform]}/start`, { method: 'POST' }),

  getOAuthSession: (sessionId: string) =>
    request<OAuthSessionDto>(`/adshub/oauth/session/${sessionId}`),

  completeOAuthSession: (sessionId: string, body: OAuthCompleteBody) =>
    request<AdAccountDto>(`/adshub/oauth/session/${sessionId}/complete`, { method: 'POST', body: JSON.stringify(body) }),

  // ── Panel ──
  getOverview: (from?: string, to?: string, erpSourceCodes?: ErpSourceCode[], platforms?: AdPlatform[]) =>
    request<AdsOverviewDto>(`/adshub/overview${toQuery({ from, to, erpSourceCodes: joinCodes(erpSourceCodes), platforms: joinPlatforms(platforms) })}`),

  getSyncRuns: (take = 20) =>
    request<AdSyncRunDto[]>(`/adshub/sync-runs${toQuery({ take })}`),

  getBreakdown: (from?: string, to?: string, erpSourceCodes?: ErpSourceCode[], platforms?: AdPlatform[]) =>
    request<AdBreakdownOverviewDto>(`/adshub/breakdown${toQuery({ from, to, erpSourceCodes: joinCodes(erpSourceCodes), platforms: joinPlatforms(platforms) })}`),

  getBlendedProfit: (from?: string, to?: string, erpSourceCodes?: ErpSourceCode[], platforms?: AdPlatform[]) =>
    request<AdsBlendedProfitDto>(`/adshub/blended-profit${toQuery({ from, to, erpSourceCodes: joinCodes(erpSourceCodes), platforms: joinPlatforms(platforms) })}`),

  getCampaigns: (params: AdEntityQueryParams) =>
    request<AdEntityPageDto>(`/adshub/entities/campaigns${toQuery(params)}`),

  getAdGroups: (params: AdEntityQueryParams) =>
    request<AdEntityPageDto>(`/adshub/entities/ad-groups${toQuery(params)}`),

  getAds: (params: AdEntityQueryParams) =>
    request<AdEntityPageDto>(`/adshub/entities/ads${toQuery(params)}`),

  // ── AI Sohbet ──
  // ad.ai — Aivar'ın reklam türevi; history: widget'taki önceki turlar (sunucu durumsuz).
  chat: (message: string, history: AiChatTurn[] = []) =>
    request<AdsChatResponse & { cards?: AiDataCard[] }>(
      '/adshub/chat',
      { method: 'POST', body: JSON.stringify({ message, history }) },
      true,
      AI_REQUEST_TIMEOUT_MS,
    ),

  // ── AI Önerileri (anomali tespiti) ──
  getRecommendations: () => request<AdsRecommendationDto[]>('/adshub/recommendations'),

  // ── Onay/Aksiyon sistemi ──
  listActionProposals: () => request<AdsActionProposalDto[]>('/adshub/action-proposals'),

  createActionProposal: (body: AdsActionProposalCreateBody) =>
    request<AdsActionProposalDto>('/adshub/action-proposals', { method: 'POST', body: JSON.stringify(body) }),

  approveActionProposal: (id: number) =>
    request<AdsActionProposalDto>(`/adshub/action-proposals/${id}/approve`, { method: 'POST' }),

  rejectActionProposal: (id: number) =>
    request<AdsActionProposalDto>(`/adshub/action-proposals/${id}/reject`, { method: 'POST' }),

  rollbackActionProposal: (id: number) =>
    request<AdsActionProposalDto>(`/adshub/action-proposals/${id}/rollback`, { method: 'POST' }),
};
