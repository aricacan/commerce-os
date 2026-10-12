import { request, BASE, uploadHeaders, throwIfNotOk, tryRefresh } from './core';
import type { ErpisPage } from './erpis-query';

// ── Erpis — API'si olmayan masaüstü ERP'nin Excel raporları ────────────────────

// Önizleme prosedürü şirket içi sunucudan TEK seferde tüm satırları çekiyor (bkz.
// ErpisSqlSyncOptions.CommandTimeoutSeconds=180) — Kapalı Siparişler 17 bin satırda
// 13-52 sn sürüyor. Global 25 sn istek zaman aşımı burada isteği İSTEMCİ TARAFINDA
// iptal ediyordu (bkz. integrations.ts'teki discover — aynı desen). "Şimdi Çalıştır"
// bu sorunu YAŞAMIYOR artık: gerçek çalışma backend'de arka plana kuyruklanıyor
// (bkz. ErpisSqlSyncEngine.EnqueueRunNowAsync), istek saniyeler içinde döner.
//
// Süre backend'deki EN UZUN prosedür sınırını (kapalı siparişler / stok kartları 1800 sn, bkz. ErpisSqlSyncCatalog)
// ve sıra beklemeyi karşılamalı; daha kısa olunca önizleme sonuç gelmeden iptal oluyordu.
const SQL_SOURCE_PREVIEW_TIMEOUT_MS = 31 * 60_000;

// Backend'deki ErpisFieldKey ile birebir aynı. Eşleme ekranı bu sırayla gösterilir.
// Sipariş No listede: sipariş raporlarında ZORUNLU alan ve önceden eşleme ekranında hiç
// görünmüyordu — otomatik tahmin tutmazsa kullanıcının onu eşlemesinin yolu yoktu.
export const ERPIS_FIELDS = [
  'DocumentDate', 'Amount', 'Currency', 'Quantity', 'DocumentNo', 'OrderNo',
  'PartyName', 'PartyCode', 'ItemCode', 'ItemName', 'Category', 'Warehouse', 'SalesRep',
] as const;

export type ErpisFieldKey = (typeof ERPIS_FIELDS)[number];

// Zorunlu alanlar RAPOR TİPİNE göre — backend'deki
// ErpisMappingDefinition.MissingRequiredFields ile birebir.
//
// Önceden sabit "tarih + tutar" listesi vardı: sipariş raporunda sunucu Sipariş No + Stok
// Kodu isterken arayüz başka iki alanı istiyor, düğme açılıyor ve yükleme 400 dönüyordu.
export function erpisRequiredFields(kind: ErpisDatasetKind | null | undefined): ErpisFieldKey[] {
  switch (kind) {
    case 'Orders':
    case 'ClosedOrders':
      return ['OrderNo', 'ItemCode'];
    case 'Catalog':
      return ['ItemCode'];
    default:
      return ['DocumentDate', 'Amount'];
  }
}

export const ERPIS_FIELD_LABELS: Record<ErpisFieldKey, string> = {
  DocumentDate: 'Belge Tarihi',
  Amount: 'Tutar',
  Currency: 'Para Birimi',
  Quantity: 'Miktar',
  DocumentNo: 'Belge No',
  OrderNo: 'Sipariş No',
  PartyName: 'Cari Adı',
  PartyCode: 'Cari Kodu',
  ItemCode: 'Stok Kodu',
  ItemName: 'Stok Adı',
  Category: 'Kategori',
  Warehouse: 'Depo',
  SalesRep: 'Satış Temsilcisi',
};

export interface ErpisFieldMapping {
  column: string;
  dateFormat?: string | null;
  decimalSeparator?: string | null;
}

export interface ErpisMappingDefinition {
  fields: Partial<Record<ErpisFieldKey, ErpisFieldMapping>>;
  headerRowIndex: number;
}

export interface ErpisCompany {
  id: number;
  name: string;
  code: string;
  billingEntityId: number | null;
  isActive: boolean;
  sortOrder: number;
  uploadCount: number;
}

/** Raporun nasıl işleneceği. Backend'deki ErpisDatasetKind ile birebir. */
export type ErpisDatasetKind = 'Orders' | 'ClosedOrders' | 'Catalog' | 'Generic';

// Rapor tipi davranışının ekrandaki adı — Kolon Eşlemesi ve Canlı Veri aynı kelimeyi göstersin.
export const ERPIS_DATASET_KIND_LABELS: Record<ErpisDatasetKind, string> = {
  Generic: 'Genel',
  Orders: 'Sipariş',
  ClosedOrders: 'Kapalı Sipariş',
  Catalog: 'Stok Kartı',
};

export interface ErpisDataset {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
  kind: ErpisDatasetKind;
  /** Bu raporda BOŞ sayılacak yer tutucular (Erpis "X", "YOK" gibi değerler yazıyor). */
  nullSentinels: string[];
}

// Kayıtlı şablona nasıl ulaşıldığı.
//
// 'Subset' önemli olan: şablonun KULLANDIĞI kolonlar dosyada duruyorsa şablon geçerli.
// Önceden yalnız birebir imza vardı ve Erpis rapora tek kolon eklediğinde 90 kolonluk
// şablon ölüyor, kullanıcı hepsini elle yeniden eşliyordu.
export type ErpisMappingMatch = 'Suggested' | 'Explicit' | 'Signature' | 'Subset';

export const ERPIS_MAPPING_MATCH_LABELS: Record<string, string> = {
  Suggested: 'Şablon bulunamadı — başlıklardan tahmin edildi',
  Explicit: 'Seçtiğiniz şablon',
  Signature: 'Başlıklar şablonla birebir aynı',
  Subset: 'Şablonun kullandığı kolonlar dosyada var',
  '0': 'Şablon bulunamadı — başlıklardan tahmin edildi',
  '1': 'Seçtiğiniz şablon',
  '2': 'Başlıklar şablonla birebir aynı',
  '3': 'Şablonun kullandığı kolonlar dosyada var',
};

export function formatMappingMatch(kind: ErpisMappingMatch | number | string | undefined | null): string {
  if (kind == null) return ERPIS_MAPPING_MATCH_LABELS.Suggested;
  return ERPIS_MAPPING_MATCH_LABELS[String(kind)] ?? ERPIS_MAPPING_MATCH_LABELS.Suggested;
}

// Dosyadaki bir stok kodu KALIBI (rakam→9, harf→A) ve kaç satırda geçtiği.
export interface ErpisSkuPatternInfo {
  pattern: string;
  /** Kalıbın okunabilir örneği — maske kimseye bir şey anlatmıyor, örnek anlatıyor. */
  sample: string;
  rowCount: number;
  /** Kayıtlı kural varsa firma; doluysa kullanıcıya sorulmaz. */
  companyId: number | null;
  companyName: string | null;
}

export interface ErpisExcelPreview {
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
  headerRowIndex: number;
  headerSignature: string;
  suggestedMapping: ErpisMappingDefinition;
  matchedMappingId: number | null;
  matchedMappingName: string | null;
  /** Şablona nasıl ulaşıldı — kullanıcıya "neden bu şablon" diye açıklamak için. */
  matchKind: ErpisMappingMatch;
  /** Zorunlu alanların hepsi eşlendi mi. Eşlendiyse eşleme adımı atlanır. */
  mappingComplete: boolean;
  /** Eşlenmemiş zorunlu alanların etiketleri. */
  missingRequiredFields: string[];
  /** Dosyadaki stok kodu kalıpları, çoktan aza. Kuralı olmayanlar sihirbazda sorulur. */
  skuPatterns: ErpisSkuPatternInfo[];
  /** Dosyanın İÇERİKTEN belirlenen gerçek formatı — uzantı yanıltıcı olabilir. */
  format: string;
  sheetName: string;
  sheets: string[];
  /** Hiçbir alana eşlenmemiş kolonlar; veri ham JSON'da saklanır ama analize girmez. */
  unmappedColumns: string[];
  /** Okuma sırasındaki tespitler (algılanan ayraç/kodlama, kırpılan satır sayısı…). */
  notes: string[];
  /** Okuyucunun fiilen kullandığı ayraç — commit'e aynen geri gönderilir. */
  delimiter: string | null;
  /** Okuyucunun fiilen kullandığı kod sayfası — commit'e aynen geri gönderilir. */
  codePage: number | null;
}

// Dosyanın ne olduğu. Varsayılan YOK — kullanıcı seçmeden yükleme yapılamıyor.
export type ErpisUploadMode = 'Snapshot' | 'Incremental';

// İçe aktarımın sonucu — yükleme sonrası gösterilir.
export interface ErpisImportSummary {
  itemsCreated: number;
  itemsUpdated: number;
  ordersCreated: number;
  ordersUpdated: number;
  linesCreated: number;
  linesUpdated: number;
  closedOrders: number;
  closedLines: number;
  untouchedItems: number;
  untouchedOrders: number;
  skippedRows: number;
}

// ── SQL Canlı Senkron ────────────────────────────────────────────────────────
// Backend'deki ErpisSqlSourceDto/ErpisSqlSyncTarget/ErpisSqlSourceStatus ile birebir.

export type ErpisSqlSyncTarget = 'Import' | 'RecordStore';
export type ErpisSqlSourceStatus = 'Pending' | 'Success' | 'Unchanged' | 'Error' | 'Queued' | 'Running';

export interface ErpisSqlSource {
  key: string;
  displayName: string;
  procedureName: string;
  target: ErpisSqlSyncTarget;
  // Import kaynağının yazabileceği rapor tipi türü; RecordStore için null.
  expectedKind: ErpisDatasetKind | null;
  // ERP tarafından bildirildi mi (prosedür adı + kolon eşlemesi var mı). false ise
  // aç/kapa devre dışı gösterilir — "SP bekleniyor" rozeti.
  isConfigured: boolean;
  isEnabled: boolean;
  intervalMinutes: number;
  companyId: number | null;
  datasetId: number | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  status: ErpisSqlSourceStatus;
  lastError: string | null;
  consecutiveFailures: number;
  lastRowCount: number;
  // Prosedüre giden ERP şirket kodu (ör. "STOREB") — bizim firma kodumuzdan AYRI.
  erpCompanyCode: string | null;
  requiresErpCompanyCode: boolean;
}

export interface ErpisSqlConnectionTestResult {
  success: boolean;
  message: string;
}

export interface ErpisSqlRunNowResult {
  success: boolean;
  errorMessage: string | null;
  rowCount: number | null;
  // Tur, açık siparişlerin olağan dışı bir kısmını kapatacağı için durduruldu — onay gerekiyor.
  requiresConfirmation: boolean;
  // true ise gerçek çalışma ARKA PLANA kuyruklandı, sonuç HENÜZ belli değil — panel
  // kaynağın kendi satırını (Durum/Son çalışma/Hata, zaten 15 sn'de bir tazeleniyor)
  // izleyerek sonucu görür. Prosedür 17 bin satırda 13-52 sn sürebildiği için istek artık
  // bunu beklemiyor.
  queued: boolean;
}

// Önizle: prosedür çalışır, hiçbir şey yazılmaz.
export interface ErpisSqlPreviewResult {
  success: boolean;
  errorMessage: string | null;
  rowCount: number;
  orderCount: number | null;
  openOrdersNow: number | null;
  wouldCloseOrders: number | null;
  wouldCreateOrders: number | null;
  sampleClosingOrderNos: string[];
  wouldRequireConfirmation: boolean;
  // Yalnız stok kartı raporunda dolu.
  newItemCount?: number | null;
  existingItemCount?: number | null;
}

export interface ErpisUpload {
  id: number;
  companyId: number;
  companyName: string;
  datasetId: number;
  datasetName: string;
  fileName: string;
  status: string;
  rowCount: number;
  errorMessage: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
  hasPeriodOverlap: boolean;
  mode: ErpisUploadMode;
  /** Yalnız commit cevabında dolu — liste ekranında null. */
  summary: ErpisImportSummary | null;
}

export interface ErpisRow {
  id: number;
  rowIndex: number;
  docDate: string | null;
  amount: number | null;
  quantity: number | null;
  currency: string | null;
  partyName: string | null;
  itemCode: string | null;
  raw: Record<string, string>;
}

export interface ErpisPagedRows {
  items: ErpisRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ErpisColumnMapping {
  id: number;
  datasetId: number;
  datasetName: string;
  name: string;
  headerSignature: string;
  sourceHeaders: string[];
  mapping: ErpisMappingDefinition;
  isDefault: boolean;
  createdAt: string;
}

export interface ErpisCurrencyTotal {
  currency: string;
  total: number;
  rowCount: number;
}

export interface ErpisSummary {
  rowCount: number;
  uploadCount: number;
  periodStart: string | null;
  periodEnd: string | null;
  totalQuantity: number;
  distinctParties: number;
  distinctItems: number;
  /** Tekil belge sayısı. Belge no eşlenmemişse 0 gelir. */
  documentCount: number;
  /** Son yükleme zamanı — dönem filtresinden bağımsız, verinin tazeliğini gösterir. */
  lastUploadedAt: string | null;
  totals: ErpisCurrencyTotal[];
}

export interface ErpisTrendPoint {
  bucket: string;
  amount: number;
  quantity: number;
  rowCount: number;
}

export interface ErpisRankingItem {
  label: string;
  amount: number;
  quantity: number;
  rowCount: number;
}

// Backend'deki GetRankingAsync ile birebir. 'company' satırda değil yüklemede tutulduğu
// için orada ayrı bir sorguya düşer (bkz. ErpisAnalyticsService.CompanyRankingAsync).
export type ErpisRankingDimension = 'party' | 'item' | 'currency' | 'company' | 'warehouse' | 'category';

// Panodaki "Erpis Özeti" tablosunun satırı. Dönemler iç içedir, toplanmazlar.
export interface ErpisPeriodRow {
  key: string;
  label: string;
  from: string;
  to: string;
  amount: number;
  quantity: number;
  rowCount: number;
}

export interface ErpisAnalyticsFilter {
  companyId?: number | null;
  datasetId?: number | null;
  from?: string | null;
  to?: string | null;
}

function analyticsQuery(filter: ErpisAnalyticsFilter, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams(extra);
  if (filter.companyId) params.set('companyId', String(filter.companyId));
  if (filter.datasetId) params.set('datasetId', String(filter.datasetId));
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  return params.toString();
}

// Dosya yükleyen uçlar request() kullanamaz: Content-Type'ı fetch'in kendisi
// (FormData boundary'siyle) ayarlamalı. Bkz. uploadHeaders.
// 401 durumunda token'ı sessizce yenileyip bir kez tekrar dener.
async function postFile<T>(path: string, form: FormData, retry = true): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: uploadHeaders(),
    credentials: 'include',
    body: form,
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return postFile<T>(path, form, false);
    }
  }

  await throwIfNotOk(res);
  return res.json() as Promise<T>;
}

export const erpisApi = {
  companies: () => request<ErpisCompany[]>('/erpis/companies'),

  createCompany: (body: { name: string; code: string; billingEntityId?: number | null; sortOrder?: number }) =>
    request<ErpisCompany>('/erpis/companies', { method: 'POST', body: JSON.stringify(body) }),

  updateCompany: (id: number, body: {
    name: string; code: string; billingEntityId?: number | null; isActive: boolean; sortOrder: number;
  }) => request<ErpisCompany>(`/erpis/companies/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteCompany: (id: number) =>
    request<void>(`/erpis/companies/${id}`, { method: 'DELETE' }),

  datasets: () => request<ErpisDataset[]>('/erpis/datasets'),

  createDataset: (body: {
    key: string;
    name: string;
    description?: string | null;
    kind: ErpisDatasetKind;
    nullSentinels: string[];
  }) => request<ErpisDataset>('/erpis/datasets', { method: 'POST', body: JSON.stringify(body) }),

  parseUpload: (
    file: File, datasetId: number, headerRowIndex?: number, templateId?: number | null,
  ) => {
    const form = new FormData();
    form.append('file', file);
    form.append('datasetId', String(datasetId));
    if (headerRowIndex != null) form.append('headerRowIndex', String(headerRowIndex));
    // Kullanıcı bir şablon seçtiyse sunucu onu kullanır; seçmediyse imza ve alt
    // küme eşleşmesiyle kendisi arar.
    if (templateId != null) form.append('templateId', String(templateId));
    return postFile<ErpisExcelPreview>('/erpis/uploads/parse', form);
  },

  commitUpload: (file: File, body: {
    companyId: number;
    datasetId: number;
    /** Zorunlu: sunucu seçim olmadan yüklemeyi reddediyor. */
    mode: ErpisUploadMode;
    /** Kalıp → firma kararları. Kaydedilir; sonraki dosyada yalnız yeni kalıp sorulur. */
    skuRoutes?: { pattern: string; companyId: number; sample: string | null }[] | null;
    /** Satırlar stok koduna göre firmalara dağıtılsın mı. Kapalıysa hepsi companyId'ye. */
    autoRoute?: boolean;
    columnMappingId?: number | null;
    mapping?: ErpisMappingDefinition | null;
    saveMappingAs?: string | null;
    /**
     * Önizlemenin döndürdüğü okuma ayarları. Aynen geri gönderilmeli: gönderilmezse
     * sunucu dosyayı yeniden tespit eder ve kullanıcının önizlemede gördüğü tablo ile
     * kaydedilen tablo ayrışabilir.
     */
    sheetName?: string | null;
    delimiter?: string | null;
    codePage?: number | null;
  }) => {
    const form = new FormData();
    form.append('file', file);
    form.append('companyId', String(body.companyId));
    form.append('datasetId', String(body.datasetId));
    form.append('mode', body.mode);
    if (body.columnMappingId != null) form.append('columnMappingId', String(body.columnMappingId));
    if (body.mapping) form.append('mappingJson', JSON.stringify(body.mapping));
    if (body.saveMappingAs) form.append('saveMappingAs', body.saveMappingAs);
    if (body.sheetName) form.append('sheetName', body.sheetName);
    if (body.delimiter) form.append('delimiter', body.delimiter);
    if (body.codePage != null) form.append('codePage', String(body.codePage));
    // Kalıp kuralları JSON metni olarak: istek multipart ve nesne listesi düz form
    // alanlarına güvenilir biçimde bağlanmıyor (mappingJson ile aynı gerekçe).
    if (body.skuRoutes?.length) form.append('skuRoutesJson', JSON.stringify(body.skuRoutes));
    if (body.autoRoute) form.append('autoRoute', 'true');
    return postFile<ErpisUpload>('/erpis/uploads/commit', form);
  },

  // Sayfalı: canlı SQL senkronu her koşuda bir yükleme üretiyor, liste binlerce satıra
  // çıkabiliyor.
  uploads: (
    companyId?: number | null, datasetId?: number | null,
    page = 1, pageSize = 25,
  ) => {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', String(companyId));
    if (datasetId) params.set('datasetId', String(datasetId));
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return request<ErpisPage<ErpisUpload>>(`/erpis/uploads?${params.toString()}`);
  },

  uploadRows: (id: number, page: number, pageSize: number) =>
    request<ErpisPagedRows>(`/erpis/uploads/${id}/rows?page=${page}&pageSize=${pageSize}`),

  deleteUpload: (id: number) => request<void>(`/erpis/uploads/${id}`, { method: 'DELETE' }),

  mappings: (datasetId?: number | null) =>
    request<ErpisColumnMapping[]>(`/erpis/mappings${datasetId ? `?datasetId=${datasetId}` : ''}`),

  deleteMapping: (id: number) => request<void>(`/erpis/mappings/${id}`, { method: 'DELETE' }),

  summary: (filter: ErpisAnalyticsFilter) =>
    request<ErpisSummary>(`/erpis/analytics/summary?${analyticsQuery(filter)}`),

  trend: (filter: ErpisAnalyticsFilter, granularity: 'month' | 'day') =>
    request<ErpisTrendPoint[]>(`/erpis/analytics/trend?${analyticsQuery(filter, { granularity })}`),

  periodSummary: (companyId?: number | null, datasetId?: number | null) => {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', String(companyId));
    if (datasetId) params.set('datasetId', String(datasetId));
    const query = params.toString();
    return request<ErpisPeriodRow[]>(`/erpis/analytics/periods${query ? `?${query}` : ''}`);
  },

  ranking: (filter: ErpisAnalyticsFilter, dimension: ErpisRankingDimension, limit = 10) =>
    request<ErpisRankingItem[]>(
      `/erpis/analytics/ranking?${analyticsQuery(filter, { dimension, limit: String(limit) })}`),

  // ── SQL Canlı Senkron (Ayarlar > Canlı Veri) ──────────────────────────────
  sqlSources: () => request<ErpisSqlSource[]>('/erpis/sql-sources'),

  updateSqlSource: (key: string, body: {
    isEnabled: boolean;
    intervalMinutes: number;
    companyId: number | null;
    datasetId: number | null;
    erpCompanyCode: string | null;
  }) => request<ErpisSqlSource>(`/erpis/sql-sources/${key}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Artık backend'de arka plana kuyruklanıyor — istek hızlı döner, varsayılan zaman
  // aşımı yeterli.
  runSqlSourceNow: (key: string, confirmMassClose = false) =>
    request<ErpisSqlRunNowResult>(
      `/erpis/sql-sources/${key}/run${confirmMassClose ? '?confirmMassClose=true' : ''}`,
      { method: 'POST' },
    ),

  previewSqlSource: (key: string) =>
    request<ErpisSqlPreviewResult>(
      `/erpis/sql-sources/${key}/preview`,
      { method: 'POST' },
      true,
      SQL_SOURCE_PREVIEW_TIMEOUT_MS,
    ),

  testSqlConnection: () =>
    request<ErpisSqlConnectionTestResult>('/erpis/sql-sources/test-connection', { method: 'POST' }),
};
