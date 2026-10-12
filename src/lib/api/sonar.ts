import { BASE, request, throwIfNotOk, uploadHeaders } from './core';

// ─── Sonar (B2B tedarikçi sitelerinde OEM parça arama) ───────────────────────
//
// Sunucu kimlik bilgisini ASLA geri döndürmez — yalnızca girilmiş olup
// olmadığını (`hasCredentials`).

/**
 * Tarayıcı süren uçlar için zaman aşımı payı.
 *
 * Global 25sn burada ANLAMSIZ: keşif gerçek bir tarayıcı açar, siteye giriş
 * yapar, tohumları aratır, sayfalamayı sınar ve kanaryaları koşturur. Üstelik
 * bunların arasında BİLEREK 2-4 saniye bekler — nezaket gecikmesi ban riskini
 * düşüren asıl mekanizmadır ve kısaltılamaz.
 *
 * 25sn'de iptal etmek işi durdurmuyordu: sunucu keşfe devam ediyor, kullanıcı
 * yalnız sonucu göremiyordu. Yani zaman aşımı siteyi boşuna yorup hiçbir şey
 * kazandırmıyordu.
 */
const BROWSER_DRIVEN_TIMEOUT_MS = 900_000;

/** Giriş testi tek bir sayfa yükler; keşif kadar uzun sürmez ama 25sn de yetmez. */
const LOGIN_TEST_TIMEOUT_MS = 120_000;

// ── Sonuç tipleri ───────────────────────────────────────────────────────────

/**
 * Bir OEM aramasının sonucu. ÜÇ DEĞERLİ olması sistemin en önemli kararıdır:
 * "site bozuldu, hiçbir şey ayrıştıramadım" ile "site bize ürün yok dedi"
 * karışırsa binlerce satır sessizce yanlış işaretlenir.
 */
export type OemOutcome = 'Found' | 'NotStocked' | 'Unverifiable';

export type MatchDecision =
  | 'Rejected'
  | 'AutoAccepted'
  | 'NeedsReview'
  | 'HumanApproved'
  | 'HumanRejected';

export type SiteHealthState =
  | 'NotDiscovered'
  | 'Healthy'
  | 'Suspect'
  | 'Quarantined'
  | 'NeedsHuman';

export type CrawlJobStatus =
  | 'Queued'
  | 'Running'
  | 'Completed'
  | 'Failed'
  | 'Blocked'
  | 'AwaitingHuman'
  | 'AbortedProfileStale';

// ── Siteler ─────────────────────────────────────────────────────────────────

export interface SupplierSiteDto {
  id: number;
  siteKey: string;
  displayName: string;
  baseUrl: string;
  /** Kimlik bilgisi girilmiş mi? Şifrenin KENDİSİ asla dönmez. */
  hasCredentials: boolean;
  healthState: SiteHealthState;

  /**
   * Durumun SEBEBİ — insanın okuyacağı cümle.
   *
   * "Karantina" gören kullanıcı ne yapacağını bilemez; "fiyat alanı 10
   * sonuçtan 9'unda boş geldi" ise nereye bakacağını söyler.
   */
  healthReason: string | null;

  /** Durumun ne zaman değiştiği — "ne zamandır bozuk" sorusu. */
  healthChangedAt: string | null;
  isEnabled: boolean;
  delayMinMs: number;
  delayMaxMs: number;
  maxConcurrency: number;
  requestsPerHour: number;
  activeProfileRevision: number | null;
  lastVerifiedAt: string | null;
  /** Engel yendiyse bu ana kadar hiç istek gönderilmez. */
  cooldownUntil: string | null;
}

export interface CreateSupplierSiteBody {
  siteKey: string;
  displayName: string;
  baseUrl: string;
  username: string;
  password: string;
  accountCode?: string | null;
}

export interface UpdateSupplierSiteBody {
  displayName: string;
  baseUrl: string;
  /** Boş bırakılırsa mevcut kimlik bilgisi KORUNUR, silinmez. */
  username?: string | null;
  password?: string | null;
  accountCode?: string | null;
  isEnabled: boolean;
}

export interface UpdatePolitenessBody {
  delayMinMs: number;
  delayMaxMs: number;
  maxConcurrency: number;
  requestsPerHour: number;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export const sonarSites = {
  list: () => request<SupplierSiteDto[]>('/sonar/sites'),

  create: (body: CreateSupplierSiteBody) =>
    request<SupplierSiteDto>('/sonar/sites', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: number, body: UpdateSupplierSiteBody) =>
    request<SupplierSiteDto>(`/sonar/sites/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  updatePoliteness: (id: number, body: UpdatePolitenessBody) =>
    request<SupplierSiteDto>(`/sonar/sites/${id}/politeness`, { method: 'PUT', body: JSON.stringify(body) }),

  remove: (id: number) =>
    request<void>(`/sonar/sites/${id}`, { method: 'DELETE' }),

  discover: (id: number, body: DiscoverSiteBody) =>
    request<DiscoveryResult>(
      `/sonar/sites/${id}/discover`,
      { method: 'POST', body: JSON.stringify(body) },
      true,
      BROWSER_DRIVEN_TIMEOUT_MS,
    ),

  /** Yalnız girişi dener — keşfi 5-15 dakika beklemeden. */
  testLogin: (id: number, loginUrlHint?: string) =>
    request<LoginTestResult>(
      `/sonar/sites/${id}/login-test`,
      { method: 'POST', body: JSON.stringify({ loginUrlHint: loginUrlHint || null }) },
      true,
      LOGIN_TEST_TIMEOUT_MS,
    ),
};

/**
 * Keşif arama kutusunu bulamadığında sunucunun sunduğu ADAY kutu.
 *
 * Kullanıcı bunlardan birini seçer ve keşif o seçiciyle yeniden koşar.
 */
export interface SearchInputCandidate {
  selector: string;
  placeholder: string | null;
  name: string | null;
  id: string | null;
  type: string;
}

/**
 * Hata gövdesinden aday kutuları çıkarır.
 *
 * Hata metni "422: {json}" biçimindedir ve Python'un ek alanları .NET
 * tarafından `evidence` altına konur. Ayrıştırılamazsa BOŞ döner: teşhis
 * yardımının kendisi bir hata kaynağına dönüşmemeli.
 */
export function readSearchInputCandidates(err: unknown): SearchInputCandidate[] {
  if (!(err instanceof Error)) return [];

  const start = err.message.indexOf('{');
  if (start < 0) return [];

  try {
    const parsed = JSON.parse(err.message.slice(start)) as {
      searchInputCandidates?: SearchInputCandidate[];
      evidence?: { searchInputCandidates?: SearchInputCandidate[] };
    };
    return parsed.evidence?.searchInputCandidates ?? parsed.searchInputCandidates ?? [];
  } catch {
    return [];
  }
}

/**
 * Giriş testi sonucu.
 *
 * `detail` sitenin KENDİ cümlesidir; bizim yorumumuz değil. Kullanıcı
 * "Şifre Hatalı!" ile "profil bozuk"u ancak böyle ayırt edebilir.
 */
export interface LoginTestResult {
  ok: boolean;
  outcome: string;
  detail: string | null;

  // Python servisinin yanıtı OLDUĞU GİBİ geçer; alan adları snake_case.
  // Yeniden adlandırmak, iki uçta ayrı ayrı doğru tutulması gereken üçüncü
  // bir sözleşme yaratırdı.
  login_url: string | null;
}

/** Keşif tohumu: o sitede BULUNDUĞU BİLİNEN bir OEM. Tohumsuz keşif başlatılamaz. */
export interface SeedOem {
  oem: string;
  expectedSupplierCode?: string | null;
}

export interface DiscoverSiteBody {
  /** Boş bırakılabilir: sistem tohumu Excel'den ya da sitenin kataloğundan bulur. */
  seedOems: SeedOem[];
  loginUrlHint?: string | null;
  searchUrlHint?: string | null;
  /** Kullanıcının panelden SEÇTİĞİ arama kutusu (CSS seçici). */
  searchInputHint?: string | null;
  /** Tohum verilmediğinde adayların çekileceği Excel yüklemesi. */
  seedFromImportBatchId?: number | null;
  catalogPageHints?: string[];
}

/** Tohumun nereden geldiği — kullanıcının verdiği ile sistemin bulduğu aynı güvende değil. */
export type SeedOrigin = 'User' | 'ExcelProbe' | 'SiteCatalog';

export interface DiscoveryResult {
  validated: boolean;
  profileId: number;
  revision: number;
  /** false ise bu site asla NotStocked üretemez — yalnız Found veya Unverifiable. */
  canProduceNotStocked: boolean;
  llmModel: string | null;
  labeledFields: string[];
  failures: string[];
  validationReportJson: string | null;
  seedsUsed: string[];
  seedOrigin: SeedOrigin;
}

// ── Excel yüklemeleri ───────────────────────────────────────────────────────

export interface ImportBatchDto {
  id: number;
  fileName: string;
  rowCount: number;
  /** Dosyadaki toplam benzersiz aranabilir OEM. */
  uniqueOemCount: number;
  /** Elenen çöp token sayısı — kullanıcı ne atlandığını görmeli. */
  junkTokenCount: number;
  /** Hiç aranabilir OEM'i olmayan satırlar. */
  unsearchableRowCount: number;
  /** Tedarikçi stok kodu zaten dolu satırlar — aranmaz. */
  rowsWithSupplierCode: number;
  /** Asıl iş: stok kodu boş satırlara ait benzersiz OEM sayısı. */
  pendingOemCount: number;
  uploadedBy: string | null;
  createdAt: string;
}

export interface ParsedProductRow {
  rowNumber: number;
  productName: string;
  itemId: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  partType: string | null;
  brand: string | null;
  existingSupplierCode: string | null;
  rawOemCell: string | null;
  searchableOems: string[];
  junkOems: string[];
}

export interface SonarImportPreview {
  rows: ParsedProductRow[];
  uniqueOemCount: number;
  uniqueOemCountForMissingRows: number;
  junkTokenCount: number;
  unsearchableRowCount: number;
  /** Hangi Excel sütunu hangi alana bağlandı — yanlış eşleşme görülebilsin. */
  columnMapping: Record<string, string>;
  warnings: string[];
}

/**
 * Dosya yükleme doğrudan fetch ile yapılır.
 *
 * `request()` her isteğe `Content-Type: application/json` koyar; FormData ile
 * bu, tarayıcının multipart sınırını (boundary) yazmasını engeller ve sunucu
 * gövdeyi ayrıştıramaz. Evin diğer modülleri de aynı sebeple böyle yapıyor
 * (bkz. basetrack.ts).
 */
async function upload<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: uploadHeaders(),
    body: formData,
  });

  await throwIfNotOk(res);
  return res.json() as Promise<T>;
}

export const sonarImports = {
  list: () => request<ImportBatchDto[]>('/sonar/imports'),

  /** Ayrıştırır ve önizleme döner. HİÇBİR ŞEY KAYDETMEZ. */
  preview: (file: File) => upload<SonarImportPreview>('/sonar/imports/preview', file),

  upload: (file: File) => upload<ImportBatchDto>('/sonar/imports', file),
};

// ── Tarama işleri ───────────────────────────────────────────────────────────

export interface CrawlJobDto {
  id: number;
  siteId: number;
  siteName: string;
  importBatchId: number | null;
  strategy: string;
  status: CrawlJobStatus;
  processedCount: number;
  totalCount: number;
  itemsWritten: number;
  /**
   * Bu sıraya kadarki sonuçlar doğrulanmıştır; sonrası güvenilmezdir.
   * Kullanıcı hangi kısmın güvenilir olduğunu bilmeli.
   */
  verifiedThroughSeq: number;
  errorMessage: string | null;
  adaptedRequestsPerHour: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export const sonarJobs = {
  list: () => request<CrawlJobDto[]>('/sonar/jobs'),

  get: (id: number) => request<CrawlJobDto>(`/sonar/jobs/${id}`),

  start: (siteId: number, importBatchId: number) =>
    request<CrawlJobDto>('/sonar/jobs', {
      method: 'POST',
      body: JSON.stringify({ siteId, importBatchId }),
    }),

  /** Captcha çözüldükten sonra duraklamış işi sürdürür. */
  resume: (id: number) =>
    request<CrawlJobDto>(`/sonar/jobs/${id}/resume`, { method: 'POST' }),

  cancel: (id: number) =>
    request<void>(`/sonar/jobs/${id}/cancel`, { method: 'POST' }),
};

// ── Eşleştirme ──────────────────────────────────────────────────────────────

export interface MatchRunSummary {
  rowsConsidered: number;
  autoAccepted: number;
  needsReview: number;
  rejected: number;
  /** Katalogda hiç eşleşme bulunamayan satırlar. */
  noCandidate: number;
  elapsedMs: number;
}

export interface BacktestMiss {
  productRowId: number;
  queriedOem: string;
  expectedSupplierCode: string;
  actualSupplierCode: string;
  score: number;
  scoreBreakdown: string;
}

export interface BacktestResult {
  knownGoodRows: number;
  rowsWithCandidate: number;
  correctAutoAccepted: number;
  /** EN ÖNEMLİ SAYI: insana sorulmadan yanlış ürüne bağlanan satır. */
  incorrectAutoAccepted: number;
  sentToReview: number;
  reviewContainsCorrectAnswer: number;
  rejected: number;
  precisionOfAutoAccept: number;
  autoAcceptCoverage: number;
  sampleMisses: BacktestMiss[];
}

export interface ScoreSignalDto {
  rule: string;
  delta: number;
  explanation: string;
}

export interface MatchReviewItemDto {
  matchResultId: number;
  productRowId: number;
  rowNumber: number;
  productName: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  partType: string | null;
  queriedOem: string;
  supplierCode: string | null;
  supplierTitle: string | null;
  price: number | null;
  currency: string | null;
  stockQty: number | null;
  detailUrl: string | null;
  score: number | null;
  /**
   * Skorun NEDEN o olduğu. Ekran ham sayıyı değil bunu gösterir: kullanıcı
   * "0.87" ile karar veremez, "OEM tam eşleşti ama iki farklı ürün aynı
   * güçte" ile verebilir.
   */
  breakdown: ScoreSignalDto[];
  decision: MatchDecision;
  reason: string | null;

  /** Excel'de hazır gelen diğer tedarikçilerin verisi — karşılaştırmanın kaynağı. */
  excelSuppliers: ExcelSupplierEntry[];
}

/** Bir satırda, bir tedarikçi için Excel'den okunan hazır veri. */
export interface ExcelSupplierEntry {
  supplier: string;
  code: string | null;
  /** Ham metin: "1.240,50" ile "1,240.50" ayrımı dosyanın yereline bağlı, tahmin edilmez. */
  price: string | null;
  /** Para birimi başlıktan okundu, hücreden tahmin edilmedi. */
  currency: string | null;
  productName: string | null;
  availability: string | null;
}

export const sonarMatches = {
  run: (importBatchId: number, siteId: number) =>
    request<MatchRunSummary>('/sonar/matches/run', {
      method: 'POST',
      body: JSON.stringify({ importBatchId, siteId }),
    }),

  /** Bilinen doğru cevaplara karşı doğruluk ölçümü. */
  backtest: (importBatchId: number, siteId: number) =>
    request<BacktestResult>('/sonar/matches/backtest', {
      method: 'POST',
      body: JSON.stringify({ importBatchId, siteId }),
    }),

  reviewQueue: (importBatchId: number, take = 100) =>
    request<MatchReviewItemDto[]>(
      `/sonar/matches/review-queue/${importBatchId}?take=${take}`),

  review: (matchResultId: number, approved: boolean) =>
    request<void>(`/sonar/matches/${matchResultId}/review`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    }),

  exportUrl: (importBatchId: number, siteId: number) =>
    `${BASE}/sonar/matches/export/${importBatchId}?siteId=${siteId}`,
};

// ── OEM sözlüğü ─────────────────────────────────────────────────────────────

export interface OemEntryDto {
  id: number;
  normalizedOem: string;
  rawOem: string | null;
  displayName: string | null;
  brand: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  partType: string | null;
  excelRowCount: number;
  supplierCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  /** İnsan düzeltti — otomatik akış bu kaydı bir daha ezmez. */
  isCurated: boolean;
  notes: string | null;
}

export interface OemLedgerPage {
  items: OemEntryDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface OemSupplierLineDto {
  siteId: number;
  siteName: string;
  supplierCode: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  stockQty: number | null;
  stockState: string | null;
  detailUrl: string | null;
  /** Fiyatı tarihsiz göstermek, aylık bir veriyi canlı gibi sunmaktır. */
  scrapedAt: string;
}

export interface OemDetailDto {
  entry: OemEntryDto;
  suppliers: OemSupplierLineDto[];
}

export interface CurateOemBody {
  displayName?: string | null;
  brand?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  partType?: string | null;
  notes?: string | null;
}

export const sonarOems = {
  search: (params: {
    search?: string;
    vehicleMake?: string;
    onlyWithSupplier?: boolean;
    page?: number;
    pageSize?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.vehicleMake) q.set('vehicleMake', params.vehicleMake);
    if (params.onlyWithSupplier) q.set('onlyWithSupplier', 'true');
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    return request<OemLedgerPage>(`/sonar/oems?${q.toString()}`);
  },

  detail: (normalizedOem: string) =>
    request<OemDetailDto>(`/sonar/oems/${encodeURIComponent(normalizedOem)}`),

  curate: (id: number, body: CurateOemBody) =>
    request<void>(`/sonar/oems/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  ingestImport: (importBatchId: number) =>
    request<number>(`/sonar/oems/ingest/import/${importBatchId}`, { method: 'POST' }),
};

// ── Excel'deki tedarikçi verisi ─────────────────────────────────────────────

/** Excel'de görülen ama sistemde sitesi olmayan tedarikçi. */
export interface SupplierSuggestionDto {
  supplier: string;
  rowsWithCode: number;
  rowsWithPrice: number;
  /** Örnek kodlar — kullanıcı hangi firma olduğunu böyle tanır. */
  sampleCodes: string[];
}

export interface ExcelSupplierIngestLine {
  supplier: string;
  siteId: number;
  itemCount: number;
  oemLinkCount: number;
  skippedWithoutCode: number;
}

export interface ExcelSupplierIngestResult {
  ingested: ExcelSupplierIngestLine[];
  suggestions: SupplierSuggestionDto[];
}

export const sonarExcelSuppliers = {
  suggestions: (importBatchId: number) =>
    request<SupplierSuggestionDto[]>(
      `/sonar/imports/${importBatchId}/suppliers/suggestions`),

  ingest: (importBatchId: number) =>
    request<ExcelSupplierIngestResult>(
      `/sonar/imports/${importBatchId}/suppliers/ingest`, { method: 'POST' }),
};

// ── Karşılaştırma stüdyosu ──────────────────────────────────────────────────

/** "Crawled" canlı taranmış · "ExcelImport" dosyadan gelen anlık görüntü. */
export type CatalogProvenance = 'Crawled' | 'ExcelImport' | 'Manual';

export interface StudioCell {
  supplierCode: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  stockQty: number | null;
  stockState: string | null;
  detailUrl: string | null;
  provenance: CatalogProvenance;
  /** Tarihsiz fiyat, bayat fiyatı canlı gibi sunar. */
  observedAt: string;
}

export interface StudioSupplierColumn {
  siteId: number;
  name: string;
  filledCells: number;
}

export interface StudioRow {
  normalizedOem: string;
  rawOem: string | null;
  displayName: string | null;
  vehicleMake: string | null;
  partType: string | null;
  cells: Record<number, StudioCell>;
  /** Yalnız aynı para biriminden teklifler kıyaslanır; karışıksa null. */
  cheapestSiteId: number | null;
}

export interface StudioTable {
  suppliers: StudioSupplierColumn[];
  rows: StudioRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const sonarStudio = {
  table: (params: {
    importBatchId?: number;
    search?: string;
    onlyWithPrice?: boolean;
    page?: number;
    pageSize?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.importBatchId) q.set('importBatchId', String(params.importBatchId));
    if (params.search) q.set('search', params.search);
    if (params.onlyWithPrice) q.set('onlyWithPrice', 'true');
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    return request<StudioTable>(`/sonar/studio?${q.toString()}`);
  },
};

// ── Katalog tazeleme ────────────────────────────────────────────────────────

export interface CatalogChangeDto {
  supplierCode: string;
  title: string | null;
  oldPrice: number | null;
  newPrice: number | null;
  currency: string | null;
  oldStock: number | null;
  newStock: number | null;
  observedAt: string;
}

export interface CatalogSyncResult {
  siteId: number;
  siteName: string;
  checked: number;
  priceChanged: number;
  wentOutOfStock: number;
  backInStock: number;
  /** "Bulunamadı" ile "artık yok" ayrı şeyler; sıfır değilse sonuç kısmen güvenilmez. */
  unverifiable: number;
  changes: CatalogChangeDto[];
  /** Tazeleme yapılamadıysa SEBEBİ — sessiz boş sonuçtan ayırt edilebilsin. */
  stoppedReason: string | null;
}

export const sonarSync = {
  // Tazeleme de tarayıcı sürer: 200 OEM'i aramak, aralarındaki nezaket
  // gecikmesiyle birlikte dakikalar alır. 25sn'de iptal etmek işi durdurmaz,
  // yalnız sonucu görünmez kılar.
  run: (siteId: number, maxOems = 200) =>
    request<CatalogSyncResult>(
      `/sonar/sync/sites/${siteId}?maxOems=${maxOems}`,
      { method: 'POST' },
      true,
      BROWSER_DRIVEN_TIMEOUT_MS,
    ),
};
