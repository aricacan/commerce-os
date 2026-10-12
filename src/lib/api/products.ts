import { BASE, request, storeOverrideHeaders, uploadHeaders, throwIfNotOk } from './core';

// Content-Disposition'dan dosya adını çıkarır; yoksa çağıranın verdiği varsayılana düşer —
// backend zaten "{sku}-gorseller.zip" gibi anlamlı bir ad üretiyor, onu kullanmak isteriz.
function filenameFromContentDisposition(res: Response, fallback: string): string {
  const header = res.headers.get('Content-Disposition');
  const match = header?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  return match ? decodeURIComponent(match[1].replace(/"$/, '')) : fallback;
}

// excelReportApi.generate/downloadTemplate ile AYNI blob-indirme deseni (bkz. excel-report.ts) —
// tutarlılık için burada tekrarlanır (zip indirme JSON'dan farklı bir fetch akışı gerektiriyor).
async function downloadBlobResponse(res: Response, fallbackFilename: string): Promise<void> {
  await throwIfNotOk(res);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filenameFromContentDisposition(res, fallbackFilename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ─── Products / Platforms / Categories ────────────────────────────────────────
export const productApi = {
  list: (params?: {
    platformId?: number; categoryId?: number; search?: string; sortBy?: string;
    brand?: string; model?: string; modelYear?: string;
    page?: number; pageSize?: number; storeCode?: string;
  }, signal?: AbortSignal) => {
    const q = new URLSearchParams();
    if (params?.platformId) q.set('platformId', String(params.platformId));
    if (params?.categoryId) q.set('categoryId', String(params.categoryId));
    if (params?.search)     q.set('search', params.search);
    if (params?.sortBy)     q.set('sortBy', params.sortBy);
    if (params?.brand)      q.set('brand', params.brand);
    if (params?.model)      q.set('model', params.model);
    if (params?.modelYear)  q.set('modelYear', params.modelYear);
    if (params?.page)       q.set('page', String(params.page));
    if (params?.pageSize)   q.set('pageSize', String(params.pageSize));
    return request<import('../../types/api').PaginatedResult<import('../../types/api').ProductGridItem>>(`/product?${q}`, { headers: storeOverrideHeaders(params?.storeCode), signal });
  },
  brands: () => request<string[]>('/product/brands'),
  models: (brand: string) => request<string[]>(`/product/models?brand=${encodeURIComponent(brand)}`),
  crossPlatform: (params?: { search?: string; categoryId?: number; from?: string; to?: string; sortBy?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.search)     q.set('search', params.search);
    if (params?.categoryId) q.set('categoryId', String(params.categoryId));
    if (params?.from)       q.set('from', params.from);
    if (params?.to)         q.set('to', params.to);
    if (params?.sortBy)     q.set('sortBy', params.sortBy);
    if (params?.page)       q.set('page', String(params.page ?? 1));
    if (params?.pageSize)   q.set('pageSize', String(params.pageSize ?? 30));
    return request<import('../../types/api').CrossPlatformResult>(`/product/cross-platform?${q}`);
  },
  chartStats: () => request<{ category: string; totalStock: number; totalSold: number }[]>('/product/chart-stats'),

  // Tek bir ürünün tüm görsellerini .zip olarak indirir — backend Sentos'tan (dış host,
  // CORS kontrolsüz) sunucu tarafında indirip paketler.
  downloadImagesZip: async (sku: string): Promise<void> => {
    const headers: Record<string, string> = { ...uploadHeaders() };
    const res = await fetch(`${BASE}/product/${encodeURIComponent(sku)}/images/zip`, { method: 'GET', headers });
    await downloadBlobResponse(res, `${sku}-gorseller.zip`);
  },

  // Seçilen birden çok ürünün görsellerini SKU-alt-klasörlü tek bir .zip'te indirir.
  downloadImagesZipBulk: async (skus: string[]): Promise<void> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...uploadHeaders() };
    const res = await fetch(`${BASE}/product/images/zip-bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ skus }),
    });
    await downloadBlobResponse(res, `urun-gorselleri-${new Date().toISOString().slice(0, 10)}.zip`);
  },
};

export const platformApi = {
  list: () => request<import('../../types/api').Platform[]>('/platform'),
  // GetPlatforms'un aksine "Tümü"/çoklu mağazada 400 dönmez, seçili mağaza(lar)ın
  // gerçekten sipariş aldığı platformları döner (bkz. PlatformController.GetPlatformsForSelection).
  listForSelection: () => request<{ id: number; name: string }[]>('/platform/for-selection'),
};

export const categoryApi = {
  master: () => request<import('../../types/api').Category[]>('/category/master'),
  masterWithSignal: (signal: AbortSignal) => request<import('../../types/api').Category[]>('/category/master', { signal }),
  list: () => request<import('../../types/api').CategoryAdmin[]>('/category'),
  create: (body: { name: string; nameEn?: string; isActive?: boolean }) =>
    request<import('../../types/api').CategoryAdmin>('/category', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { name: string; nameEn?: string; isActive?: boolean }) =>
    request<import('../../types/api').CategoryAdmin>(`/category/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  // Silmenin BEDELİ. Kategoriye bağlı dört tablo FK'de Cascade (ERP kategori eşlemesi,
  // fiyat hedefi, araç uyumluluk haritası, öneri) — silme onları da götürüyor. Silme
  // diyaloğu bunu okuyup kullanıcıya gösterir; onaysız zincirleme kayıp olmaz.
  usage: (id: number) => request<import('../../types/api').CategoryUsage>(`/category/${id}/usage`),
  // force: kullanıcı zincirleme kaybı GÖRDÜKTEN sonra verdiği bilinçli onay.
  delete: (id: number, force = false) =>
    request<void>(`/category/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
  // Hiçbir kategoriye atanmamış aktif ürün sayısı — kategorileştirme motorunun (kural motoru +
  // gece çalışan AI backfill) gerçekten çalışıp çalışmadığının en doğrudan göstergesi.
  uncategorizedCount: () => request<{ uncategorizedCount: number }>('/category/uncategorized-count'),
};

// Ad-öncelikli sınıflandırma kuralları (CategoryRuleEngine, Layer 2) — bkz. CategoryRulesController.
export const categoryRuleApi = {
  list: () => request<import('../../types/api').CategoryRule[]>('/category-rules'),
  create: (body: { ruleName: string; targetCategoryId: number; keywordGroups: string[][]; sortOrder: number; isActive: boolean }) =>
    request<import('../../types/api').CategoryRule>('/category-rules', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { ruleName: string; targetCategoryId: number; keywordGroups: string[][]; sortOrder: number; isActive: boolean }) =>
    request<import('../../types/api').CategoryRule>(`/category-rules/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  toggle: (id: number) =>
    request<import('../../types/api').CategoryRule>(`/category-rules/${id}/toggle`, { method: 'PATCH' }),
  delete: (id: number) => request<void>(`/category-rules/${id}`, { method: 'DELETE' }),
  // Kuralları MEVCUT ürünlere yeniden uygular (geçmişte yanlış sınıflandırılmışları düzeltir).
  reapply: (dryRun: boolean) =>
    request<CategoryRuleReapplyResult>(`/category-rules/reapply?dryRun=${dryRun}`, { method: 'POST' }),
};

export interface CategoryRuleReapplyResult {
  scanned: number;
  changed: number;
  dryRun: boolean;
  sample: {
    productId: number;
    sku: string;
    name: string;
    fromCategoryId: number | null;
    toCategoryId: number;
  }[];
}

// ── Ortak kategori sistemi (bkz. CategorySystemController) ────────────────────
// Ham kategorilerden kanonik ağaç türetme, ürünleri yeniden eşleme ve kategori
// yaşam döngüsü önerileri. Hepsi önce KURU ÇALIŞTIRMA ile çağrılır.
export interface RawSourceCategory {
  sourceId: number;
  sourceCode: string;
  name: string;
  path: string | null;
  productCount: number;
}

// Hangi ERP kaynağı arşivde var, hangisi yok. Eşleştirme SKU kesişimiyle çalıştığı için
// EN AZ İKİ kaynak ister; tek kaynakla hiçbir şey birleşemez (canlıda tam olarak bu oldu).
export interface SourceCoverageRow {
  id: number;
  code: string;
  connector: string;
  hasData: boolean;
  products: number;
  categories: number;
}

export interface SourceCoverage {
  sources: SourceCoverageRow[];
  withData: number;
  total: number;
  canMatch: boolean;
}

export interface SourceCategoryBackfillEntry {
  sourceCode: string;
  fetchedProducts: number;
  withCategory: number;
  matched: number;
  written: number;
  updated: number;
  error: string | null;
}

export interface SourceCategoryBackfillResult {
  dryRun: boolean;
  sources: SourceCategoryBackfillEntry[];
  totalWritten: number;
  totalUpdated: number;
  failedSources: number;
}

export interface DerivedCategoryMember {
  sourceId: number;
  sourceCode: string;
  externalKey: string;
  externalName: string;
  productCount: number;
}

export interface DerivedCategory {
  name: string;
  nameEn: string | null;
  skuCount: number;
  members: DerivedCategoryMember[];
}

export interface CategoryDerivationResult {
  categories: DerivedCategory[];
  rawBucketCount: number;
  multiSourceCount: number;
}

export interface CategoryDerivationApplyResult {
  dryRun: boolean;
  categoriesCreated: number;
  linksCreated: number;
  linksUpdated: number;
  linksSkippedManual: number;
  notes: string[];
}

export interface ProductRematchChange {
  productId: number;
  sku: string;
  productName: string;
  fromCategory: string | null;
  toCategory: string;
  decision: string;
}

export interface ProductRematchResult {
  dryRun: boolean;
  scanned: number;
  changed: number;
  byRule: number;
  bySourceLink: number;
  unresolved: number;
  sample: ProductRematchChange[];
}

export interface CategoryConflict {
  productId: number;
  sku: string;
  productName: string;
  sourceCode: string;
  externalCategoryName: string;
  ruleCategory: string;
  sourceLinkCategory: string;
}

export interface CategorySuggestion {
  id: number;
  kind: string;
  internalCategoryId: number | null;
  categoryName: string | null;
  proposedName: string | null;
  externalName: string | null;
  productCount: number;
  reason: string;
  createdAt: string;
}

// Ham kategori çekme arka planda çalışır: /start bir jobId döner, panel /status'u pollar.
// Senkron uç (POST /category-system/backfill) hâlâ var ama panelde KULLANILMAZ — tüm ERP
// kataloglarını dolaştığı için dakikalar sürüyor ve 25 saniyelik istek zaman aşımına
// (REQUEST_TIMEOUT_MS) her seferinde takılıyordu.
export type CategoryBackfillJobState = 'Running' | 'Completed' | 'Failed' | 'NotFound';

export interface CategoryBackfillJobStatus {
  state: CategoryBackfillJobState;
  result?: SourceCategoryBackfillResult;
  errorMessage?: string;
}

export interface CategoryLifecycleResult {
  newCategorySuggestions: number;
  deactivateSuggestions: number;
  splitSuggestions: number;
  staleSuggestionsClosed: number;
}

export interface CategorySuggestionRefreshJobStatus {
  state: CategoryBackfillJobState; // ayni 4 durum kumesi (Running/Completed/Failed/NotFound)
  result?: CategoryLifecycleResult;
  errorMessage?: string;
}

export const categorySystemApi = {
  raw: () => request<RawSourceCategory[]>('/category-system/raw'),
  coverage: () => request<SourceCoverage>('/category-system/coverage'),
  startBackfill: (dryRun: boolean) =>
    request<{ jobId: string }>(`/category-system/backfill/start?dryRun=${dryRun}`, { method: 'POST' }),
  backfillStatus: (jobId: string) =>
    request<CategoryBackfillJobStatus>(`/category-system/backfill/status/${jobId}`),
  derive: () => request<CategoryDerivationResult>('/category-system/derive'),
  applyDerivation: (dryRun: boolean) =>
    request<CategoryDerivationApplyResult>(
      `/category-system/derive/apply?dryRun=${dryRun}`, { method: 'POST' }),
  rematch: (dryRun: boolean) =>
    request<ProductRematchResult>(`/category-system/rematch?dryRun=${dryRun}`, { method: 'POST' }),
  conflicts: () => request<CategoryConflict[]>('/category-system/conflicts'),
  suggestions: () => request<CategorySuggestion[]>('/category-system/suggestions'),
  // Faz 5b'den (AI ad önerisi) sonra öneri tazeleme dakikalarca sürebilir — ham kategori
  // çekme ile AYNI arka plan + polling deseni (bkz. startBackfill). Senkron uç hâlâ var
  // ama panelde KULLANILMAZ.
  startRefreshSuggestions: () =>
    request<{ jobId: string }>('/category-system/suggestions/refresh/start', { method: 'POST' }),
  refreshSuggestionsStatus: (jobId: string) =>
    request<CategorySuggestionRefreshJobStatus>(`/category-system/suggestions/refresh/status/${jobId}`),
  resolveSuggestion: (id: number, accept: boolean) =>
    request<{ id: number; status: string }>(
      `/category-system/suggestions/${id}/resolve`, { method: 'POST', body: JSON.stringify({ accept }) }),
};
