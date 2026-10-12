import { request } from './core';
import type { ErpisCurrencyTotal } from './erpis';

// ── Erpis normalize katman sorguları ──────────────────────────────────────────
//
// Ham satır analitiğinden (erpis.ts) ayrı: orası format bilinmeyen her raporu tek tip
// kolonlarla gösterir, burası Erpis'in kendi iş kavramlarını (marka, araç modeli, açık
// sipariş) bilir.

export const ERPIS_DATE_FIELDS = ['order', 'delivery', 'record'] as const;
export type ErpisDateField = (typeof ERPIS_DATE_FIELDS)[number];

export const ERPIS_DATE_FIELD_LABELS: Record<ErpisDateField, string> = {
  order: 'Sipariş Tarihi',
  delivery: 'Teslim Tarihi',
  record: 'Kayıt Tarihi',
};

// Grafik çözünürlüğü. Kullanıcıya SORULMAZ — tarih aralığından türetilir (bkz.
// resolveErpisBucket), bu yüzden bir etiket listesi yok.
export type ErpisBucket = 'day' | 'week' | 'month' | 'year';

export const ERPIS_SCOPES = ['all', 'domestic', 'foreign'] as const;
export type ErpisScope = (typeof ERPIS_SCOPES)[number];

export const ERPIS_SCOPE_LABELS: Record<ErpisScope, string> = {
  all: 'Tümü',
  domestic: 'Yurt İçi',
  foreign: 'Yurt Dışı',
};

// Kırılım hangi ölçüye göre sıralanacak.
export const ERPIS_BREAKDOWN_ORDERS = ['amount', 'quantity', 'lineCount', 'orderCount'] as const;
export type ErpisBreakdownOrder = (typeof ERPIS_BREAKDOWN_ORDERS)[number];

export const ERPIS_BREAKDOWN_ORDER_LABELS: Record<ErpisBreakdownOrder, string> = {
  amount: 'Tutar',
  quantity: 'Miktar',
  lineCount: 'Kalem',
  orderCount: 'Sipariş',
};

// Kullanıcının seçebildiği "İlk N" — genel müdür 5/10/20 gibi kendi ayarlamak istedi.
export const ERPIS_TOP_N = [5, 10, 20, 50] as const;

export const ERPIS_BREAKDOWNS = [
  'brand', 'model', 'vehicle', 'category', 'productType', 'item',
  'party', 'currency', 'country', 'seg1', 'seg2', 'seg3', 'itemKind',
] as const;
export type ErpisBreakdownKey = (typeof ERPIS_BREAKDOWNS)[number];

// Etiketler ERPIS'İN KENDİ ALAN ADLARINI DEĞİL, alanların GERÇEK İÇERİĞİNİ anlatır.
//
// Erpis'te "ürün tipi" kolonunda ürün kategorileri duruyor (Çamurluk Kaplama, Kapı
// Kaplama), "kategori" kolonunda ise araç aileleri ve malzeme grupları (DACIA DUSTER,
// HAMMADDE, SARF MALZEME). Kolon adını olduğu gibi taşımak kullanıcıyı "kategoride niye
// araba var" sorusuna düşürüyordu.
export const ERPIS_BREAKDOWN_LABELS: Record<ErpisBreakdownKey, string> = {
  brand: 'Marka',
  model: 'Model',
  vehicle: 'Araç Modeli',
  category: 'Araç / Grup',
  productType: 'Kategori',
  item: 'Stok Kodu',
  party: 'Cari',
  currency: 'Para Birimi',
  country: 'Ülke',
  seg1: 'Segment 1',
  seg2: 'Segment 2',
  seg3: 'Segment 3',
  itemKind: 'Kart Türü',
};

// Boyut adının TEK BAŞINA yetmediği yerler. "Segment 1" bir şey anlatmıyor; SKU'nun
// birinci bloğunun ne olduğunu söyleyince anlatıyor. Seçicide adın altında yazar.
export const ERPIS_BREAKDOWN_HINTS: Record<ErpisBreakdownKey, string> = {
  brand: 'Ürünün ait olduğu araç markası',
  model: 'Marka altındaki model adı',
  vehicle: 'Marka + model birlikte',
  category: 'Erpis "kategori" kolonu — araç ailesi / malzeme grubu',
  productType: 'Erpis "ürün tipi" kolonu — parça kategorisi',
  item: 'Stok kodu · altında ürün adı',
  party: 'Sipariş veren cari',
  currency: 'Siparişin para birimi',
  country: 'Carinin ülkesi',
  seg1: 'SKU kodunun 1. bloğu · altında tanımlı adı',
  seg2: 'SKU kodunun 2. bloğu · altında tanımlı adı',
  seg3: 'SKU kodunun 3. bloğu · altında tanımlı adı',
  itemKind: 'Stok kodu deseni (ürün / ambalaj / levha)',
};

// Backend'deki ErpisQueryFilter ile birebir. Tüm uçlar aynı nesneyi alır — kırılıma
// tıklayıp listeye geçen kullanıcı aynı rakamları görmeli.
export interface ErpisQueryFilter {
  companyId?: number | null;
  dateField?: ErpisDateField;
  from?: string | null;
  to?: string | null;
  bucket?: ErpisBucket;
  brands?: string[];
  models?: string[];
  productTypes?: string[];
  currencies?: string[];
  countries?: string[];
  vehicleModelIds?: number[];
  categoryIds?: number[];
  partyIds?: number[];
  yearFrom?: number | null;
  yearTo?: number | null;
  seg1?: string[];
  seg2?: string[];
  seg3?: string[];
  skuKinds?: string[];
  itemKinds?: string[];
  /**
   * Stok kodu KALIPLARI (maske). SkuKind'den farkı: bu, kullanıcının kendi tanımlayıp
   * adlandırdığı kod ailesi (bkz. Firma Kuralları) — kodda sabit değil.
   */
  skuPatterns?: string[];
  /**
   * Kart etiketleri — kullanıcının yazdığı kurallardan türeyen kutular ("DEMO Ürünler",
   * "Diğer Ürünler", "Etiketsiz"). Bir kart TEK etikete düşer.
   *
   * Boş bırakılırsa sunucu "varsayılan görünür" etiketleri uygular.
   */
  cardTags?: string[];
  onlyOpen?: boolean;
  /**
   * Planlama durumu: 'short' | 'tight' | 'ok' | 'unknown'.
   * Sunucuda süzülür — sayaçlar ve Excel aynı kümeyi görsün diye.
   */
  planningStatus?: ErpisPlanningStatus | null;
  /** Kart kuruluş tarihi aralığı — sipariş tarihinden bağımsız eksen. */
  registeredFrom?: string | null;
  registeredTo?: string | null;
  /** İhracat listeleme kayıtlarını da say (varsayılan kapalı). */
  includeInactiveParties?: boolean | null;
  /** Pazar kapsamı: para biriminden türetilir (TL = yurt içi). */
  scope?: ErpisScope;
  /** Tutarları tek para birimine çevirip ek toplam iste ("TL"). Varsayılan kapalı. */
  convertTo?: string | null;
  search?: string | null;
}

export interface ErpisOrderLine {
  id: number;
  orderId: number;
  orderNo: string;
  orderDate: string | null;
  deliveryDate: string | null;
  partyName: string | null;
  partyId: number | null;
  countryName: string | null;
  itemId: number | null;
  sku: string | null;
  itemName: string | null;
  brand: string | null;
  model: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  productType: string | null;
  orderedQty: number | null;
  shippedQty: number | null;
  remainingQty: number | null;
  unit: string | null;
  unitPrice: number | null;
  netAmount: number | null;
  currency: string | null;
  isClosed: boolean;
}

// Veri sağlığı — "elimdeki veri ne kadar eksik". Modülün Genel Bakış ekranı bunu
// gösterir; pano göstermez, çünkü panodaki kullanıcı veriyi düzeltmiyor.
export interface ErpisDataHealth {
  itemCount: number;
  withBrand: number;
  withModel: number;
  withYear: number;
  withCategory: number;
  withProductType: number;
  manualCount: number;
  lowConfidenceCount: number;
  lineCount: number;
  linesWithoutItem: number;
  linesWithoutCurrency: number;
  linesWithoutDate: number;
  linesWithoutAmount: number;
}

// Açık kalemlerin bekleme süresi kırılımı.
//
// `amount` TEK ölçüde: kur istendiyse `currency`'ye çevrilmiş, istenmediyse yalnız baskın
// birimin tutarı. Farklı dövizler ham toplanmaz; her birimin kendi tutarı `totals`'ta.
export interface ErpisAgingBucket {
  key: string;
  label: string;
  lineCount: number;
  remainingQuantity: number;
  amount: number;
  currency: string;
  oldestDays: number;
  totals: ErpisCurrencyTotal[];
}

// Planlama satırı: sipariş kalemi + o ürünün stok durumu.
//
// "Fiili stok" ERP'de olmayan, bizim hesapladığımız rakam: eldeki stoktan açık
// siparişlerde söz verilmiş miktar düşülür.
// Pano giriş ekranındaki firma kartı — dört dönemlik ciro + yıllık sayılar.
// Bir dönemin kart üzerinde gösterilen bütün ölçüleri.
export interface ErpisPeriod {
  amount: number;
  quantity: number;
  orderCount: number;
  itemCount: number;
}

export interface ErpisCompanyOverview {
  companyId: number;
  name: string;
  code: string;
  /** Ana rakam: içinde bulunulan takvim ayı. */
  month: ErpisPeriod;
  /** Ana rakamın kapsadığı aralık — kartta "01.09 – 10.09". */
  monthFrom: string;
  monthTo: string;
  /** Kayan pencereler; takvim değil. */
  today: ErpisPeriod;
  last7: ErpisPeriod;
  last30: ErpisPeriod;
  last365: ErpisPeriod;
  currency: string;
  /** Çevrilmemiş para birimi kırılımı — üstteki toplam şeridi bunu topluyor. */
  currencies: { currency: string; total: number; lineCount: number }[];
  domestic: number;
  foreign: number;
  previousMonth: number | null;
  daily: number[];
  dailyQuantity: number[];
  dataSince: string | null;
  openLineCount: number;
}

// Kalemleri birden çok firmaya dağılan sipariş.
export interface ErpisMixedOrderCompany {
  companyId: number;
  companyName: string;
  lineCount: number;
  amount: number;
}

export interface ErpisMixedOrder {
  orderId: number;
  orderNo: string;
  orderDate: string | null;
  partyName: string | null;
  lineCount: number;
  companies: ErpisMixedOrderCompany[];
}

export type ErpisPlanningStatus = 'short' | 'tight' | 'ok' | 'unknown';

// Durum sayaçları TÜM sonuç kümesinden gelir, açık sayfadan değil.
export interface ErpisPlanningCounts {
  total: number;
  short: number;
  tight: number;
  ok: number;
  unknown: number;
}

export interface ErpisPlanningPage extends ErpisPage<ErpisPlanningItem> {
  counts: ErpisPlanningCounts;
}

export interface ErpisPlanningItem {
  itemId: number;
  sku: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  productType: string | null;
  stockOnHand: number | null;
  pendingQty: number;
  availableQty: number | null;
  openLineCount: number;
  orderCount: number;
}

export interface ErpisStockLocation {
  zone: string;
  shelf: string;
  quantity: number;
}

export interface ErpisWarehouseZone {
  zone: string;
  shelfCount: number;
  itemCount: number;
  quantity: number;
}

export interface ErpisOrderLineDetail {
  line: ErpisOrderLine;
  reservedQty: number | null;
  stockOnHand: number | null;
  netUnitPrice: number | null;
  discount1: number | null;
  discount2: number | null;
  discount3: number | null;
  discount4: number | null;
  recordDate: string | null;
  lastInvoiceDate: string | null;
  lineType: string | null;
  productionMode: string | null;
  departmentName: string | null;
  notes: string | null;
  warehouseBreakdownRaw: string | null;
  customerOrderNo: string | null;
  shippingAddress: string | null;
  firstSeenUploadId: number;
  lastSeenUploadId: number;
  closedAt: string | null;
  stockLocations: ErpisStockLocation[];
  sourceRow: Record<string, string> | null;
  sourceRowIndex: number | null;
}

export interface ErpisOrdersSummary {
  lineCount: number;
  orderCount: number;
  partyCount: number;
  itemCount: number;
  openLineCount: number;
  closedLineCount: number;
  totalQuantity: number;
  remainingQuantity: number;
  shippedQuantity: number;
  /** Sevk EDİLEN tutar — sipariş tutarından ayrı (rapor açık sipariş görüntüsü). */
  shippedTotals: ErpisCurrencyTotal[];
  periodStart: string | null;
  periodEnd: string | null;
  lastUploadedAt: string | null;
  totals: ErpisCurrencyTotal[];
  converted: ErpisConvertedTotal | null;
}

export interface ErpisConvertedTotal {
  currency: string;
  total: number;
  rateDate: string;
  missingRates: string[];
}

export interface ErpisOrderTrendPoint {
  bucket: string;
  currency: string;
  amount: number;
  quantity: number;
  lineCount: number;
  shippedAmount: number;
  shippedQuantity: number;
  openLineCount: number;
  closedLineCount: number;
}

export interface ErpisBreakdownItem {
  key: string;
  label: string;
  quantity: number;
  lineCount: number;
  orderCount: number;
  totals: ErpisCurrencyTotal[];
  /** Tek ölçüde karşılaştırılabilir tutar — sıralama bunun üzerinden. */
  comparableAmount: number;
  comparableCurrency: string | null;
  /** İkincil etiket — stok kodu kırılımında ürün adı. */
  subLabel: string | null;
}

export interface ErpisDimensionTrendPoint {
  bucket: string;
  amount: number;
  quantity: number;
  lineCount: number;
}

export interface ErpisDimensionTrend {
  key: string;
  label: string;
  points: ErpisDimensionTrendPoint[];
  total: number;
  currency: string | null;
}

export interface ErpisScopeSummary {
  scope: string;
  label: string;
  amount: number;
  currency: string | null;
  quantity: number;
  lineCount: number;
  orderCount: number;
  partyCount: number;
  totals: ErpisCurrencyTotal[];
}

export interface ErpisFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface ErpisFilterOptions {
  brands: ErpisFilterOption[];
  models: ErpisFilterOption[];
  productTypes: ErpisFilterOption[];
  categories: ErpisFilterOption[];
  parties: ErpisFilterOption[];
  currencies: ErpisFilterOption[];
  countries: ErpisFilterOption[];
  itemKinds: ErpisFilterOption[];
  /** Kullanıcının etiketlediği stok kodu kalıpları. */
  skuPatterns: ErpisFilterOption[];
  /** Kart etiketleri; aynı adı taşıyan kurallar TEK seçenekte birleşir. */
  cardTags: ErpisFilterOption[];
  seg1: ErpisFilterOption[];
  seg2: ErpisFilterOption[];
  seg3: ErpisFilterOption[];
  minYear: number | null;
  maxYear: number | null;
}

export interface ErpisItem {
  id: number;
  sku: string;
  skuKind: string;
  seg1: string | null;
  seg2: string | null;
  seg3: string | null;
  itemKind: string;
  name: string | null;
  name2: string | null;
  brand: string | null;
  model: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  yearText: string | null;
  productType: string | null;
  color: string | null;
  material: string | null;
  variant: string | null;
  side: string | null;
  categoryId: number | null;
  categoryName: string | null;
  ean: string | null;
  /** Kartın ERP'deki kuruluş tarihi (kayittarihi_d). */
  registeredAt: string | null;
  isActive: boolean | null;
  parseConfidence: number;
  parseSource: string;
}

export interface ErpisItemDetail {
  item: ErpisItem;
  nameEn: string | null;
  unit: string | null;
  gtip: string | null;
  vatRate: number | null;
  pattern: string | null;
  setPieceCount: number | null;
  dimensionsText: string | null;
  nameRemainder: string | null;
  weightGr: number | null;
  widthMm: number | null;
  lengthMm: number | null;
  thicknessMm: number | null;
  volumeDm3: number | null;
  pieceCount: number | null;
  supplierName: string | null;
  packagingSku: string | null;
  packagingQty: number | null;
  leadTimeDays: number | null;
  minStock: number | null;
  maxStock: number | null;
  abcClass: string | null;
  registeredAt: string | null;
  discontinuedAt: string | null;
  discontinuedReason: string | null;
  customerCodes: { partyName: string; customerSku: string }[];
  stockLocations: ErpisStockLocation[];
  // Opsiyonel: frontend (Vercel) backend'den önce yayına çıkabiliyor; eski backend bu
  // alanı göndermeyince çekmece "Sayfa yüklenemedi" ile çöküyordu (11 Eyl 2026).
  erpFields?: ErpisErpField[];
}

// Stok kartı dosyasındaki ham kolon (son katalog yüklemesinden).
export interface ErpisErpField {
  column: string;
  value: string;
}

export interface ErpisUpdateItemRequest {
  brand?: string | null;
  model?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  productType?: string | null;
  color?: string | null;
  material?: string | null;
  variant?: string | null;
  itemKind?: string | null;
  categoryId?: number | null;
}

export interface ErpisPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ErpisSort {
  page?: number;
  pageSize?: number;
  sortBy?: string | null;
  desc?: boolean;
}

// Filtreyi query string'e çevirir.
//
// Diziler TEKRARLI parametre olarak yazılır (brands=A&brands=B) — ASP.NET Core'un dizi
// bağlaması bunu bekliyor. Boş dizi ve null değerler hiç gönderilmez: gönderilseydi
// "boş filtre" ile "filtre yok" ayrımı kaybolurdu.
export function erpisQueryString(
  filter: ErpisQueryFilter,
  extra?: Record<string, string | number | boolean | null | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filter)) {
    if (value == null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.append(key, String(value));
    }
  }

  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value == null || value === '') continue;
    params.append(key, String(value));
  }

  return params.toString();
}

export const erpisQueryApi = {
  lines: (filter: ErpisQueryFilter, sort: ErpisSort = {}) =>
    request<ErpisPage<ErpisOrderLine>>(`/erpis/orders/lines?${erpisQueryString(filter, { ...sort })}`),

  line: (id: number) => request<ErpisOrderLineDetail>(`/erpis/orders/lines/${id}`),

  summary: (filter: ErpisQueryFilter) =>
    request<ErpisOrdersSummary>(`/erpis/orders/summary?${erpisQueryString(filter)}`),

  trend: (filter: ErpisQueryFilter) =>
    request<ErpisOrderTrendPoint[]>(`/erpis/orders/trend?${erpisQueryString(filter)}`),

  breakdown: (
    filter: ErpisQueryFilter,
    by: ErpisBreakdownKey,
    limit = 10,
    orderBy: ErpisBreakdownOrder = 'amount',
    asc = false,
  ) => request<ErpisBreakdownItem[]>(
    `/erpis/orders/breakdown?${erpisQueryString(filter, { by, limit, orderBy, asc })}`),

  dimensionTrend: (filter: ErpisQueryFilter, by: ErpisBreakdownKey, limit = 5) =>
    request<ErpisDimensionTrend[]>(
      `/erpis/orders/dimension-trend?${erpisQueryString(filter, { by, limit })}`),

  scopeSummary: (filter: ErpisQueryFilter) =>
    request<ErpisScopeSummary[]>(`/erpis/orders/scope-summary?${erpisQueryString(filter)}`),

  filterOptions: (filter: ErpisQueryFilter) =>
    request<ErpisFilterOptions>(`/erpis/filters/options?${erpisQueryString(filter)}`),

  items: (filter: ErpisQueryFilter, sort: ErpisSort = {}) =>
    request<ErpisPage<ErpisItem>>(`/erpis/items?${erpisQueryString(filter, { ...sort })}`),

  item: (id: number) => request<ErpisItemDetail>(`/erpis/items/${id}`),

  updateItem: (id: number, body: ErpisUpdateItemRequest) =>
    request<ErpisItem>(`/erpis/items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  warehouseZones: (filter: ErpisQueryFilter) =>
    request<ErpisWarehouseZone[]>(`/erpis/warehouse/zones?${erpisQueryString(filter)}`),

  dataHealth: (filter: ErpisQueryFilter) =>
    request<ErpisDataHealth>(`/erpis/overview/health?${erpisQueryString(filter)}`),

  aging: (filter: ErpisQueryFilter) =>
    request<ErpisAgingBucket[]>(`/erpis/orders/aging?${erpisQueryString(filter)}`),

  companyOverview: (convertTo = 'TL') =>
    request<ErpisCompanyOverview[]>(`/erpis/companies/overview?convertTo=${convertTo}`),

  mixedOrders: (filter: ErpisQueryFilter, limit = 100) =>
    request<ErpisMixedOrder[]>(`/erpis/orders/mixed?${erpisQueryString(filter, { limit })}`),

  planning: (filter: ErpisQueryFilter, sort: ErpisSort = {}) =>
    request<ErpisPlanningPage>(
      `/erpis/orders/planning?${erpisQueryString(filter, { ...sort })}`),
};

// Dışa aktarım URL'leri.
//
// Dosya indirme `request()` üzerinden gitmiyor: yanıt JSON değil ikili veri ve tarayıcının
// kendi indirme akışına bırakılıyor. Yetki başlığı gerektiği için çağıran fetch + blob
// kullanıyor (bkz. useErpisExport).
export const erpisExportPaths = {
  orderLines: (filter: ErpisQueryFilter) => `/erpis/orders/lines/export?${erpisQueryString(filter)}`,
  items: (filter: ErpisQueryFilter) => `/erpis/items/export?${erpisQueryString(filter)}`,
  planning: (filter: ErpisQueryFilter) => `/erpis/orders/planning/export?${erpisQueryString(filter)}`,
};
