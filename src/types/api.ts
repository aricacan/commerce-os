// API response types matching the .NET backend DTOs

// Pano giriş ekranındaki e-ticaret kartı — Erpis firma kartlarıyla aynı ölçüler.
// Bir dönemin ölçüleri — Erpis firma kartlarıyla AYNI şekil.
export interface DashboardPeriod {
  amount: number;
  orderCount: number;
  productCount: number;
}

export interface DashboardOverview {
  month: DashboardPeriod;
  monthFrom: string;
  monthTo: string;
  today: DashboardPeriod;
  last7: DashboardPeriod;
  last30: DashboardPeriod;
  last365: DashboardPeriod;
  previousMonth: number;
  daily: number[];
}

export interface DashboardSummary {
  totalProducts: number;
  aiCategorizedCount: number;
  ruleCategorizedCount: number;
  pendingModerationCount: number;
}

export interface StoreComparisonRow {
  storeId: number;
  storeName: string;
  displayColor: string | null;
  // 'Sentos' | 'Base' — bkz. DataSource.ConnectorType.
  sourceType: string;
  // 'storea-sentos' | 'storeb-sentos' | 'base-storea' | 'base-storeb' — store-selector.ts ERP_SOURCE_OPTIONS eşleşmesi için.
  erpSourceCode: string;
  orderCount: number;
  revenue: number;
  netProfit: number;
}

export interface DailyOrderCount {
  date: string;
  count: number;
  revenue: number;
}

export interface OrderStats {
  totalRevenue: number;
  totalOrderCount: number;
  activeProductCount: number;
  returnCount: number;
  dailyOrderCounts: DailyOrderCount[];
  dailyReturnCounts: DailyOrderCount[];
}

export interface OrderStatsWithComparison {
  current: OrderStats;
  previous: OrderStats | null;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  extraText?: string;
}

export interface SearchProductItem {
  id: number;
  name: string;
  supplierSKU: string;
}

export interface SearchOrderItem {
  id: number;
  platformOrderNumber: string;
  storeName: string;
  customerName?: string;
}

export interface SearchResult {
  products: SearchProductItem[];
  orders: SearchOrderItem[];
}

export interface DynamicChartRequest {
  groupBy: 'Category' | 'Platform' | 'Brand' | 'OrderStatus' | 'Product';
  aggregate: 'Count' | 'AvgPrice' | 'TotalRevenue' | 'TotalStock';
  platformFilter?: string;
  from?: string;
  to?: string;
  categoryId?: number;
  categoryIds?: number[];
  storeCodes?: string[];
}

export interface CategorySales {
  categoryName: string;
  count: number;
  percentage: number;
}

export interface BrandCategoryRow {
  brand: string;
  model: string;
  totalSold: number;
  categories: CategorySales[];
}

export interface BrandCategoryBreakdown {
  categories: string[];
  brands: BrandCategoryRow[];
}

export interface Platform {
  id: number;
  name: string;
  commissionRate: number;
  serviceFee: number;
  vatRate: number;
}

// ─── ERP Entegrasyonları (bkz. ErpIntegrationsController) ─────────────────────
export interface ErpConfigField {
  key: string;
  label: string;
  secret: boolean;
  default?: string;
}

export interface StoreInfo {
  id: number;
  code: string;
  name: string;
  displayColor: string | null;
  isActive: boolean;
  timeZoneId: string;
}

export interface ErpConnectorTypeInfo {
  type: number; // ErpConnectorType enum: Sentos=0, Base=1
  displayName: string;
  configFields: ErpConfigField[];
}

export interface ErpDataSourceInfo {
  dataSourceId: number;
  connectorType: number;
  code: string;
  isActive: boolean;
  hasCredential: boolean;
  // Base (BaseLinker) tek paylaşımlı hesap üzerinden çalışır (appsettings) — bu tipte
  // hasCredential=false NORMALDİR, "eksik yapılandırma" anlamına gelmez.
  sharesGlobalCredential: boolean;
  configValues: Record<string, string>;
  // Gerçek senkron telemetrisi (bkz. IIntegrationTelemetryService) — hiç senkron
  // çalışmadıysa hepsi null.
  lastSyncAt: string | null;
  syncStatus: string | null;
  lastError: string | null;
  // Okuma anında hesaplanan sayaçlar (bkz. IIntegrationStatsService).
  productCount: number;
  orderCount: number;
}

export interface ErpStoreIntegrations {
  storeId: number;
  storeName: string;
  dataSources: ErpDataSourceInfo[];
}

export interface ShippingRate {
  id: number;
  // Kargo bölgesi kodu (ERP kaynaklarının ülkelerinden türer: TR, UK …).
  region: string;
  // Teslimat bölgesi (UK: Mainland/Scotland/NorthernIreland); boş = bölgenin tamamı.
  zone: string;
  // Tarife sürümünün başlangıç günü (yyyy-MM-dd); null = en baştan.
  validFrom: string | null;
  carrierName: string;
  minDesi: number;
  maxDesi: number;
  price: number;
}

// Desi tarifesinin bir satırı: aralık + her teslimat bölgesinin fiyatı (tek bölgede anahtar "").
export interface ShippingRateBandBody {
  minDesi: number;
  maxDesi: number;
  prices: Record<string, number>;
}

export interface ShippingExtraFee {
  id: number;
  carrierName: string;
  feeType: string;
  price: number;
}

// Backend ExpenseCategory enum'u ile BİREBİR aynı sıra (0 = Operating, 1 = Advertising).
export type ExpenseCategory = 0 | 1;
export const EXPENSE_CATEGORY_OPERATING: ExpenseCategory = 0;
export const EXPENSE_CATEGORY_ADVERTISING: ExpenseCategory = 1;

// Backend ExpenseRecurrence enum'u (0 = Monthly, 1 = Annual).
export type ExpenseRecurrence = 0 | 1;
export const EXPENSE_RECURRENCE_MONTHLY: ExpenseRecurrence = 0;
export const EXPENSE_RECURRENCE_ANNUAL: ExpenseRecurrence = 1;

export interface FinanceExpense {
  id: number;
  name: string;
  amount: number;
  expenseDate: string;
  note: string | null;
  category: ExpenseCategory;
  adPlatform: string | null;
  amountIncludesVat: boolean;
  vatRate: number;
  // Yillik bir odemenin tek aya yazilmis hali — tutar bolunmez, sadece etiketlenir.
  isAnnualPayment: boolean;
  // Doluysa satır bir şablondan üretilmiştir: tek başına düzenlenemez/silinemez.
  templateId: number | null;
  storeName: string;
  // Ortak giderin payıysa bu mağazanın yüzdesi.
  sharedPercentage: number | null;
  // Doluysa satır ORTAK bir giderin payıdır; grubun ayrıntısı ayrı uçtan gelir
  // (financeApi.expenses.sharedGroup). OPSİYONEL: frontend backend'den ÖNCE yayına
  // çıkar (Vercel anında, VPS elle), bu yüzden eski backend bu alanı hiç göndermez —
  // o durumda form bugünkü tek-pay davranışına düşer.
  sharedGroupId?: string | null;
}

// Ortak giderin TEK payı (bir mağaza × ERP kombinasyonu).
export interface SharedExpensePart {
  expenseId: number;
  storeName: string;
  // Payın ERP'si ("Base"/"Sentos"); mağaza geneli payda null.
  erpName: string | null;
  // Gösterim etiketi — "Base - StoreA".
  label: string;
  percentage: number;
  amount: number;
  // Formda düzenlenmekte olan pay.
  isCurrent: boolean;
}

// Ortak giderin TAMAMI. Toplam saklanmaz, payların toplamıdır.
export interface SharedExpenseGroup {
  sharedGroupId: string;
  totalAmount: number;
  parts: SharedExpensePart[];
}

// Tek mağazalık, tek aylık gider ekleme/güncelleme gövdesi.
export interface SaveFinanceExpense {
  name: string;
  amount: number;
  // Ayın herhangi bir günü gönderilebilir; backend her zaman ayın 1'ine sabitler.
  expenseDate: string;
  note?: string | null;
  category: ExpenseCategory;
  adPlatform?: string | null;
  amountIncludesVat: boolean;
  vatRate: number;
  isAnnualPayment: boolean;
  // Bos birakilirsa aktif magazaya yazilir; doluysa ORTAK gider olarak (magaza x ERP)
  // paylarina bolunur.
  allocations?: { erpSourceCode: string; percentage: number }[];
  // YALNIZCA güncellemede ve YALNIZCA ortak giderde: grubun YENİ TOPLAMI. Gönderilirse
  // tüm paylar kayıtlı oranlarla yeniden dağıtılır ve `amount` alanı EZİLİR — bu yüzden
  // form ikisinden yalnızca birini gönderir (bkz. ExpenseFormModal, düzenleme kapsamı).
  totalAmount?: number | null;
}

// Ortak giderin TEK bir (mağaza × ERP) kombinasyonuna düşen payı.
// erpSourceCode, topbar seçicisinin kullandığı AYNI kod ('base-storea', 'storeb-sentos').
export interface ExpenseAllocation {
  erpSourceCode: string;
  storeId: number;
  storeName: string;
  label: string;
  percentage: number;
}

export interface FinanceExpenseTemplate {
  id: number;
  name: string;
  amount: number;
  category: ExpenseCategory;
  adPlatform: string | null;
  amountIncludesVat: boolean;
  vatRate: number;
  recurrence: ExpenseRecurrence;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  note: string | null;
  allocations: ExpenseAllocation[];
  generatedExpenseCount: number;
}

export interface SaveFinanceExpenseTemplate {
  name: string;
  amount: number;
  category: ExpenseCategory;
  adPlatform?: string | null;
  amountIncludesVat: boolean;
  vatRate: number;
  recurrence: ExpenseRecurrence;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  note?: string | null;
  allocations: { erpSourceCode: string; percentage: number }[];
}

export interface NetProfitSummary {
  year: number;
  month: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}

// Bir maliyet satırının veri kapsamı: toplam kaç kalemden kaçında gerçek veri var.
// Eksik veri sessizce 0 maliyet yazıp kârı şişirdiği için tabloda "x/y" olarak gösterilir.
export interface PnlCoverage {
  covered: number;
  total: number;
}

// Detaylı görünümde tek pazaryerinin (Trendyol, N11, ...) kesinti payı.
export interface PnlPlatform {
  platformId: number;
  platformName: string;
  orderCount: number;
  revenue: number;
  commission: number;
  serviceFee: number;
  vat: number;
  commissionVat: number;
  serviceFeeVat: number;
}

export interface PnlMonth {
  month: number;
  revenue: number;
  orderCount: number;
  buyingCost: number;
  boxCost: number;
  shippingCost: number;
  commission: number;
  serviceFee: number;
  vat: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  // Net KDV'nin kirilimi: outputVat - (buying+box+shipping+commission+serviceFee) = vat.
  // "KDV Goster" modunda her maliyet satirinin altina yazilir.
  outputVat: number;
  buyingVat: number;
  boxVat: number;
  shippingVat: number;
  commissionVat: number;
  serviceFeeVat: number;
  // Giderlerin tasidigi KDV — BILGI amacli, net kari degistirmez.
  expenseVat: number;
  buyingCostCoverage: PnlCoverage;
  boxCostCoverage: PnlCoverage;
  shippingCostCoverage: PnlCoverage;
  // Kargo maliyeti HIC hesaplanamayan kalem sayisi (bolgenin tarifesi girilmemis, ya da TR
  // disi bir bolgede desi yok). Bu kalemlerin kargosu shippingCost'a DAHIL DEGILDIR.
  // Opsiyonel: eski backend bu alani gondermez (frontend once yayina cikar).
  unknownShippingLines?: number;
  platforms: PnlPlatform[];
}

export interface PnlExpenseLine {
  name: string;
  monthlyAmounts: number[];
  total: number;
}

// Sunucudaki KDV davranışı. 'Ignored' iken tüm KDV alanları 0'dır ve arayüz KDV
// seçicisini gizler — kapalı bir KDV'yi açmaya çalışıp hiçbir şeyin değişmediğini
// görmek en kafa karıştırıcı hâl olurdu.
export type VatMode = 'Standard' | 'Ignored';

export interface PnlResponse {
  year: number;
  vatMode: VatMode;
  months: PnlMonth[];
  total: PnlMonth;
  expenseLines: PnlExpenseLine[];
  adExpenseLines: PnlExpenseLine[];
}

// Alış fiyatı (maliyet) eksik ürünler listeye alınmaz — excludedNoCostCount o ürünlerin
// sayısı, panelde "N ürün alış fiyatı eksik olduğu için hesap dışı" banner'ı için.
export interface LossProductRow {
  // sku TEK BAŞINA benzersiz DEĞİL — aynı tedarikçi SKU'su StoreA/StoreB'de iki AYRI ürüne
  // ait olabilir. React key için sku DEĞİL productId kullan (canlıda "iki satır aynı key"
  // hatası olarak yakalandı).
  productId: number;
  sku: string;
  productName: string;
  brand: string | null;
  storeName: string;
  quantitySold: number;
  revenue: number;
  grossProfit: number;
  // Zarar kırılımı: grossProfit = revenue - buyingCost - boxCost - shippingCost - commission - serviceFee - vat.
  buyingCost: number;
  boxCost: number;
  shippingCost: number;
  commission: number;
  serviceFee: number;
  vat: number;
}

export interface LossProductsResponse {
  items: LossProductRow[];
  totalLoss: number;
  excludedNoCostCount: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface CategoryAdmin {
  id: number;
  name: string;
  nameEn: string | null;
  isActive: boolean;
  // Ham ürün SATIRI sayısı — aynı SKU birden çok mağaza/ERP'de olduğu için şişik.
  productCount: number;
  // Kaç FARKLI SKU — ürün kataloğunun gösterdiği sayıyla aynı, kartlarda bu gösterilir.
  differentProductCount: number;
}

/**
 * Bir kategoriyi silmenin bedeli (bkz. CategoryController.GetUsage).
 *
 * Üç bağ sınıfı ayrı ayrı taşınır çünkü ekranda üçü de farklı anlatılmalı:
 *   • CASCADE (link/hedef/uyumluluk/öneri) → SİLİNİR, onay gerektirir
 *   • SET NULL (productCount)              → kategorisiz kalır, geri alınabilir
 *   • RESTRICT (platform eşlemesi, alt kategori) → silme hiç olmaz
 */
export interface CategoryUsage {
  categoryId: number;
  categoryName: string;
  productCount: number;
  platformMappingCount: number;
  childCategoryCount: number;
  sourceCategoryLinkCount: number;
  priceTargetCount: number;
  fitmentMapCount: number;
  suggestionCount: number;
  hasCascadingDependents: boolean;
  hasBlockingDependents: boolean;
}

// Ad-öncelikli sınıflandırma kuralı (CategoryRuleEngine, Layer 2) — panelden yönetilir.
// keywordGroups: "OR of AND" — gruplardan biri (tüm kelimeleri geçen) tutarsa kural eşleşir.
export interface CategoryRule {
  id: number;
  ruleName: string;
  targetCategoryId: number;
  targetCategoryName: string;
  keywordGroups: string[][];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ProductGridItem {
  productId: number;
  productName: string;
  storeId: number;
  storeName: string;
  storeColor: string | null;
  sourceType: string | null;
  // "Tümü" görünümünde aynı SKU'nun bulunduğu tüm kaynak-mağaza etiketleri
  // (ör. ["Base StoreA", "Base StoreB"]); spesifik filtrede tek eleman.
  sourceTags: string[];
  platformName: string;
  rawCategory: string;
  mappedCategoryName: string;
  brand: string | null;
  model: string | null;
  modelYear: string | null;
  price: number;
  buyingPrice: number | null;
  stockQuantity: number;
  salesCount: number;
  boxCode?: string | null;
  // Kutu adı + kutunun efektif desisi; ürünün kendi hacimsel desisi ayrı alan.
  boxName?: string | null;
  boxDesi?: number | null;
  productDesi: number;
  imageUrl?: string;
  // Kaynağın sağladığı tüm görseller (ilk eleman = imageUrl). Galeri için.
  imageUrls: string[];
  createdAt: string;     // UTC ISO — frontend converts to Turkey local
  todayOrderCount: number;
  supplierSKU?: string;
  erpVariants: ProductErpVariant[];
}

export interface ProductErpVariant {
  productId: number;
  connectorType: string;
  sourceCode: string;
  storeCode: string;
  storeName: string;
  productName: string;
  priceTry: number;
  originalCurrency: string | null;
  stockQuantity: number;
  salesCount: number;
}

// Base Ürün Takibi paneli — SADECE Base (BaseLinker) kaynaklı ürünler, dedup edilmiş SKU başına tek satır.
export interface BaseProductMarketplaceBadge {
  name: string;
  orderCount: number;
}

export interface BaseProductTrackingItem {
  id: number;          // iç PK — sadece React key, EKRANDA GÖSTERİLMEZ
  erpId: number | null; // BaseLinker'ın kendi ürün ID'si — frontend'de "b_id" olarak gösterilir
  name: string;
  sku: string;
  ean: string | null;
  asin: string | null;
  cost: number | null;  // GBP
  stock: number;
  priceTry: number;      // TRY — GBP gösterimi useBaseCurrency.toGbp ile ters çevrilir
  vatRate: number | null;
  imageUrl: string | null;
  createdAt: string;
  marketplaces: BaseProductMarketplaceBadge[];
}

export interface OrderItemDetail {
  productId: number;
  productName: string;
  supplierSku: string;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  buyingPrice?: number | null;
  boxCost?: number | null;
  shippingCost: number;
  // false: kargo maliyeti HESAPLANAMADI (bolge tarifesi yok / desi yok). shippingCost 0'dir
  // ama bu "kargo bedava" demek DEGILDIR. Opsiyonel: eski backend gondermez -> bilinir sayilir.
  shippingCostKnown?: boolean;
  commissionAmount: number;
  // true: komisyon pazaryerinin bildirdiği gerçek tutar; false/yok: oran tahmini.
  commissionIsActual?: boolean;
  serviceFeeAmount: number;
  vatAmount: number;
  netProfit: number;
  hasCostData: boolean;
  boxCode?: string | null;
  boxName?: string | null;
  desi?: number | null;
}

export interface OrderDetail {
  orderId: number;
  storeId: number;
  storeName: string;
  storeColor: string | null;
  sourceType: string | null;
  platformOrderNumber: string;
  platformName: string;
  universalStatus: string;
  orderDate: string;
  totalAmount: number;
  currency: string;
  shipCity?: string;
  note: string | null;
  orderCode: string | null;
  packageCode: string | null;
  shippingTotal: number | null;
  paymentStatus: string | null;
  customerName: string | null;
  // Alıcının e-postası + adresin gerçek mi yoksa pazaryeri proxy'si mi olduğu.
  // 'Direct' = gerçek adres, 'MarketplaceProxy' = eBay/Amazon/Temu maskeli adresi
  // (pazarlama maili YASAK, yalnızca işlemsel), 'None' = adres yok.
  customerEmail: string | null;
  customerEmailKind: 'None' | 'Direct' | 'MarketplaceProxy';
  addressDistrict: string | null;
  addressLine: string | null;
  originalCurrency: string | null;
  originalTotal: number | null;
  // Operasyon durumu (FAZ 2) — bizim iş akışımızdaki durum, universalStatus'ün yanında.
  operationStatusId: number | null;
  invoicedAt: string | null;
  // Kargo bölgesi ('TR'/'UK'), UK teslimat bölgesi (posta kodundan; '' = bilinmiyor),
  // kargo tutarının kaynağı ve siparişten kesilen kalemler. Opsiyonel: frontend
  // backend'den önce yayına çıkar, eski backend bu alanları göndermez.
  country?: string;
  deliveryPostcode?: string | null;
  shippingZone?: string;
  shippingCostOrigin?: string;
  feeLines?: OrderFeeLine[];
  items: OrderItemDetail[];
}

// Siparişten kesilen kalem — kaynaktan bağımsız: kanalın bildirdiği kalemler kendi adlarıyla
// (amount/currency kanalın para biriminde), yoksa gerçek ya da tahmini (rate dolu) komisyon.
export interface OrderFeeLine {
  name: string;
  amountTry: number;
  amount: number | null;
  currency: string | null;
  isActual: boolean;
  rate: number | null;
  // Kanalın oranı girilmemiş: 0 komisyon gerçek değil, BİLİNMİYOR.
  rateMissing?: boolean;
}

export interface PendingModeration {
  logId: number;
  originalText: string;
  productName: string;
  rawCategory: string;
  suggestedCategoryId: number;
  confidence: number;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  // refreshToken artık yanıt gövdesinde dönmez — HttpOnly cookie ile taşınır (bkz. AuthController).
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  profilePhotoUrl?: string | null;
  slackMemberId?: string | null;
}

export interface SavedWidget {
  id: number;
  title: string;
  chartType: string;
  configJson: string;
  createdAt: string;
}

export interface WidgetLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface ClaimStats {
  totalClaims: number;
  byCause: ChartDataPoint[];
}

export interface OrderCityPoint {
  city: string;
  lat: number;
  lng: number;
  count: number;
  revenue: number;
}

export interface WarehousePoint {
  id: number;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

export interface CrossPlatformBreakdown {
  platformName: string;
  unitsSold: number;
  revenue: number;
}

// Bir SKU'nun sattığı her (mağaza × ERP kaynağı) çifti için ayrı satır — bir SKU birden
// fazla mağaza/ERP'de aynı anda satılabildiğinden (bkz. GetCrossPlatform backend yorumu).
export interface CrossPlatformStoreBreakdown {
  storeId: number;
  storeName: string;
  storeColor: string | null;
  sourceType: string | null;
  unitsSold: number;
  revenue: number;
}

// Artık HAM mağaza satırı değil, TEKİL SupplierSKU başına bir kayıt — tüm mağaza/ERP/
// platform genelinde toplanmış (bkz. 2026-07-27 "5.912 ham satır vs 1655 gerçek SKU" düzeltmesi).
export interface CrossPlatformProduct {
  supplierSKU: string;
  name: string;
  brand: string | null;
  basePrice: number;
  stockQuantity: number;
  storeCount: number;
  totalUnitsSold: number;
  totalRevenue: number;
  topPlatform: string | null;
  platformBreakdown: CrossPlatformBreakdown[];
  storeBreakdown: CrossPlatformStoreBreakdown[];
}

export interface CrossPlatformResult {
  items: CrossPlatformProduct[];
  totalCount: number;
  page: number;
  pageSize: number;
  availablePlatforms: string[];
  totalUnitsSoldAll: number;
  totalRevenueAll: number;
}

export interface PlatformMarker {
  platform: string;
  lat: number;
  lng: number;
  count: number;
  revenue: number;
}

export interface LogisticsMapData {
  ordersByCity: OrderCityPoint[];
  platformMarkers: PlatformMarker[];
  warehouses: WarehousePoint[];
}

export interface JobStatusResponse {
  state: 'Enqueued' | 'Processing' | 'Succeeded' | 'Failed' | 'Unknown' | 'NotFound';
  startedAt?: string;
  finishedAt?: string;
}

export interface CohortCell {
  monthOffset: number;
  customerCount: number;
  orderCount: number;
  totalRevenue: number;
  retentionRate: number;
}

export interface CohortMatrixRow {
  cohortMonth: string;
  cohortSize: number;
  cells: CohortCell[];
}

export interface CohortAnalyticsResponse {
  matrix: CohortMatrixRow[];
  maxMonthOffset: number;
  totalCohorts: number;
}

export interface CannibalizationPair {
  storeId: number;
  storeName: string;
  brand1: string;
  brand2: string;
  score: number;
  dataPoints: number;
}

export interface CannibalizationMatrix {
  calculatedAt: string | null;
  lastJobRanAt: string | null;
  periodDays: number;
  // Birden fazla mağazanın sonucu aynı anda görüntüleniyor ("Tümü" veya çoklu mağaza seçimi) —
  // bu durumda marka×marka ısı haritası yerine mağaza etiketli düz liste gösterilir.
  multiStore: boolean;
  brands: string[];
  matrix: CannibalizationPair[];
}

// Campaign DSS types

export interface CampaignUploadInfo {
  id: number;
  fileName: string;
  campaignType: string;
  status: string;
  totalRows: number;
  matchedRows: number;
  errorMessage: string | null;
  uploadedAt: string;
}

export interface OfferAnalysis {
  offerId: number;
  barcode: string;
  productName: string;
  brand: string;
  salePrice: number;
  commissionRate: number;
  commissionAmount: number;
  buyingPrice: number;
  boxCost: number;
  shippingCost: number;
  kdvAmount: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
  isProfitable: boolean;
  campaignType: string;
  timeWindow: string | null;
  startDate: string | null;
  endDate: string | null;
  listPrice: number | null;
  currentSellingPrice: number | null;
  discountPercent: number | null;
  commissionSource: string | null;
  estimatedVolumeMultiplier: number | null;
}

export interface CampaignAnalysis {
  uploadId: number;
  fileName: string;
  campaignType: string;
  totalOffers: number;
  profitableOffers: number;
  unprofitableOffers: number;
  unmatchedOffers: number;
  totalPotentialProfit: number;
  averageMargin: number;
  offers: OfferAnalysis[];
}

export interface BestAction {
  barcode: string;
  productName: string;
  brand: string;
  buyingPrice: number;
  bestCampaignType: string;
  bestTimeWindow: string;
  bestSalePrice: number;
  bestNetProfit: number;
  bestProfitMargin: number;
  bestWeightedScore: number;
  allOptions: OfferAnalysis[];
  listPrice: number | null;
  discountPercent: number | null;
  estimatedVolumeMultiplier: number | null;
  recommendationLevel: string | null;
  recommendation: string | null;
}

export interface BestActionsResponse {
  totalProducts: number;
  productsWithMultipleOptions: number;
  totalWeightedProfit: number;
  actions: BestAction[];
}

export interface TariffRow {
  barcode: string;
  productName: string;
  commissionBasePrice: number;
  tier1PriceLow: number;
  tier1Commission: number;
  tier2PriceLow: number;
  tier2Commission: number;
  tier3PriceLow: number;
  tier3Commission: number;
  tier4Commission: number;
}

export interface TariffReference {
  uploadId: number | null;
  fileName: string | null;
  uploadedAt: string | null;
  totalProducts: number;
  rows: TariffRow[];
}

export interface DailyProfit {
  date: string;
  orderCount: number;
  revenue: number;
  rawGrossProfit: number;
  grossProfit: number;
  netProfit: number;
}

export interface ProfitSummary {
  totalRevenue: number;
  totalCost: number;
  totalShipping: number;
  totalCommission: number;
  totalServiceFee: number;
  totalBoxCost: number;
  totalVat: number;
  grossProfit: number;
  netProfit: number;
  proratedExpenses: number;
  grossMarginPct: number;
  netMarginPct: number;
  orderCount: number;
  salesCount: number;
  daily: DailyProfit[];
}

export interface ProfitSummaryWithComparison {
  current: ProfitSummary;
  previous: ProfitSummary | null;
}

export interface ProductProfit {
  productId: number;
  sku: string;
  productName: string;
  brand: string | null;
  imageUrl: string | null;
  orderCount: number;
  quantitySold: number;
  revenue: number;
  grossProfit: number;
  grossMarginPct: number;
}

export interface ProductProfitLeaderboard {
  mostProfitable: ProductProfit[];
  leastProfitable: ProductProfit[];
  topSellers: ProductProfit[];
}

export interface AnomalyOverview {
  totalAnomalies: number;
  criticalCount: number;
  warningCount: number;
  unreadCount: number;
  healthScore: number;
}

export interface HourlyDataPoint {
  hour: string;
  count: number;
}

export interface AnomalyGroup {
  name: string;
  currentCount: number;
  mean: number;
  stdDev: number;
  zScore: number;
  status: 'normal' | 'warning' | 'critical';
  // Geçmiş penceredeki kaç günde gerçekten sipariş aldığı (0 hariç) — z-skorun ne kadar
  // güvenilir bir örneklemden geldiğini gösterir (bkz. AnomalyStatistics.cs).
  activeDays: number;
  hourly: HourlyDataPoint[];
}

export interface AnomalyAnalysis {
  groupBy: string;
  totalGroups: number;
  anomalyCount: number;
  windowDays: number;
  groups: AnomalyGroup[];
}

export interface PriceStockConsistencyRow {
  id: number;
  productId: number;
  sku: string;
  productName: string;
  marketplace: string;
  externalUrl: string | null;
  ourPrice: number;
  externalPriceOriginal: number;
  externalCurrency: string;
  // GBP→TRY kuru bulunamadıysa null (fxRateUnavailable=true) — 0 değil.
  externalPriceTry: number | null;
  priceDeviationPct: number | null;
  fxRateUnavailable: boolean;
  ourStock: number;
  externalStock: number | null;
  stockDelta: number;
  hasPriceDeviation: boolean;
  hasStockDeviation: boolean;
  lastSyncedAt: string;
}

export interface PriceStockConsistencyOverview {
  totalListings: number;
  priceDeviationCount: number;
  stockDeviationCount: number;
  consistentCount: number;
  fxRateUnavailable: boolean;
  rows: PriceStockConsistencyRow[];
}

export interface ProductCostInfo {
  id: number;
  productId: number;
  productName: string;
  barcode: string | null;
  buyingPrice: number;
  packagingCost: number;
  updatedAt: string;
}

// ─── DEMO Radar ────────────────────────────────────────────────────────────────
export interface RadarStats {
  activeEmailAccounts: number;
  totalEmailAccounts: number;
  totalCompanies: number;
  totalSentEmails: number;
  totalRepliedCompanies: number;
  replyRatePercent: number;
  pendingEnrichmentCount: number;
}

export interface RadarRecentActivityItem {
  id: number;
  companyName: string;
  country: string;
  direction: 'Outbound' | 'Inbound';
  subject: string;
  sentAt: string;
}

export interface RadarCompanyListItem {
  id: number;
  companyNumber: string;
  companyName: string;
  category: string;
  country: string;
  email?: string | null;
  website?: string | null;
  city?: string | null;
  district?: string | null;
  companySizeLabel?: string | null;
  tags: string[];
  leadScore?: number | null;
  leadCompanyType?: string | null;
  isActive: boolean;
  status: string;
  currentStep: number;
  nextActionAt?: string | null;
  createdAt: string;
}

export interface RadarEmailLogItem {
  id: number;
  direction: 'Outbound' | 'Inbound';
  subject: string;
  sentAt: string;
  messageId?: string | null;
}

export interface RadarCompanyDetail extends RadarCompanyListItem {
  retryCount: number;
  recentEmailLogs: RadarEmailLogItem[];
  leadIndustryMatch?: boolean | null;
  leadProducts: string[];
  leadScoredAt?: string | null;
}

export interface RadarEmailAccount {
  id: number;
  emailAddress: string;
  smtpServer: string;
  smtpPort: number;
  imapServer: string;
  imapPort: number;
  dailyLimit: number;
  currentDailyCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RadarSicCode {
  id: number;
  code: string;
  label?: string | null;
  isActive: boolean;
  country: string;
  lastFetchedAt?: string | null;
  createdAt: string;
}

export interface RadarCityCount {
  city: string;
  count: number;
}

export interface RadarCategoryCount {
  category: string;
  label?: string | null;
  count: number;
}

export interface RadarDailyTrendItem {
  date: string;
  sent: number;
  replied: number;
}

export interface RadarFunnel {
  totalCompanies: number;
  withEmail: number;
  contacted: number;
  replied: number;
  bounced: number;
  completed: number;
}

export interface RadarAwaitingAttentionItem {
  companyId: number;
  companyName: string;
  email?: string | null;
  lastActionAt?: string | null;
}

export interface RadarAnalytics {
  byCity: RadarCityCount[];
  byCategory: RadarCategoryCount[];
  emailTrend: RadarDailyTrendItem[];
  funnel: RadarFunnel;
  awaitingAttention: RadarAwaitingAttentionItem[];
}

export interface RadarAlert {
  severity: 'Info' | 'Warning' | 'Danger';
  country?: string | null;
  title: string;
  message: string;
}

export interface RadarEmailTemplate {
  id: number;
  templateType: 'Sequence' | 'Reply';
  stepNumber?: number | null;
  sicCode?: string | null;
  name?: string | null;
  subject: string;
  body: string;
  isActive: boolean;
}

export interface RadarMessageThreadItem {
  id: number;
  direction: 'Outbound' | 'Inbound';
  subject: string;
  body: string;
  sentAt: string;
  messageId?: string | null;
}

export interface RadarMessageThread {
  companyId: number;
  companyName: string;
  totalCount: number;
  items: RadarMessageThreadItem[];
}

export interface RadarScrapeRun {
  id: number;
  startedAt: string;
  completedAt?: string | null;
  companiesFound: number;
  companiesUpserted: number;
  emailsFound: number;
  status: string;
  errorMessage?: string | null;
}

// ─── Excel Rapor Oluşturucu ─────────────────────────────────────────────────

export type ExcelReportModule = 'Products' | 'Orders' | 'Finance' | 'Logistics' | 'Shipping' | 'Returns' | 'Boxes';

export interface ExcelJoinRequest {
  leftModule: ExcelReportModule;
  leftKey: string;
  rightModule: ExcelReportModule;
  rightKey: string;
  joinType: 'inner' | 'left';
}

export interface ExcelReportRequest {
  storeCodes?: string[];
  categoryIds?: number[];
  platformIds?: number[];
  productIds?: number[];
  orderIds?: number[];
  dateFrom?: string;
  dateTo?: string;
  modules: ExcelReportModule[];
  rowLimit?: number;
  columns?: Partial<Record<ExcelReportModule, string[]>>;
  joins?: ExcelJoinRequest[];
}

export interface ExcelReportPreview {
  sheets: Record<string, Array<Record<string, unknown>>>;
}

// ─── Kategori Fiyat Karşılaştırma ────────────────────────────────────────────

export interface CategoryPriceTarget {
  internalCategoryId: number;
  categoryName: string;
  priceTl: number | null;
  priceGbp: number | null;
  updatedAt: string | null;
}

export interface MatchedCategoryPriceRow {
  internalCategoryId: number;
  categoryName: string;
  sourceCategoryText: string;
  priceTl: number | null;
  priceGbp: number | null;
  confidence: number;
}

export interface CategoryPriceModerationItem {
  id: number;
  rawCategoryText: string;
  rawPrice: number;
  currency: string;
  suggestedInternalCategoryId: number | null;
  suggestedCategoryName: string | null;
  confidence: number;
  createdAt: string;
}

export interface CategoryPriceParseSummary {
  matchedCount: number;
  needsReviewCount: number;
  matched: MatchedCategoryPriceRow[];
  needsReview: CategoryPriceModerationItem[];
}

export interface ApplyCategoryPriceRow {
  internalCategoryId: number;
  priceTl: number | null;
  priceGbp: number | null;
}

export interface CategoryPriceTolerance {
  lowerPct: number;
  upperPct: number;
}

// Backend CategoryPriceStatus enum'ı JSON'a SAYI olarak serileşir (Program.cs'te
// JsonStringEnumConverter yok) — değerler backend enum sırasıyla birebir.
export const CategoryPriceStatus = {
  NoTarget: 0,
  NoData: 1,
  WithinTolerance: 2,
  Over: 3,
  Under: 4,
} as const;
export type CategoryPriceStatusValue = (typeof CategoryPriceStatus)[keyof typeof CategoryPriceStatus];

export interface CurrencyComparison {
  targetPrice: number | null;
  observedAvg: number | null;
  observedMin: number | null;
  observedMax: number | null;
  productCount: number;
  deviationPct: number | null;
  status: CategoryPriceStatusValue;
}

export interface CategoryComparisonRow {
  internalCategoryId: number;
  categoryName: string;
  tl: CurrencyComparison;
  gbp: CurrencyComparison;
}

// Erp: "Sentos" | "Base" — hangi para birimi kartının bu kaynak için anlamlı olduğunu belirler.
export interface CategoryPriceCompareResult {
  dataSourceId: number;
  displayName: string;
  erp: string;
  rows: CategoryComparisonRow[];
}

export interface OverLimitProduct {
  productId: number;
  sku: string;
  productName: string;
  categoryName: string;
  observedPrice: number;
  targetPrice: number;
  deviationPct: number;
  currency: string;
  status: CategoryPriceStatusValue;
}

export interface OverLimitResult {
  dataSourceId: number;
  displayName: string;
  erp: string;
  items: OverLimitProduct[];
}

// ─── Geri Bildirim ───────────────────────────────────────────────────────────

export type FeedbackStatus = 'New' | 'InProgress' | 'Done' | 'Rejected';

export interface Feedback {
  id: number;
  authorUserId: number;
  authorName: string;
  message: string;
  status: FeedbackStatus;
  isMine: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Piyasa Terminali & Gelecek Tahmin Analitiği ─────────────────────────────

export type TerminalTimeframe = 'Hour' | 'Day' | 'Week' | 'Month' | 'Year';

export interface TerminalDataPoint {
  timestamp: string;
  label: string;
  orderCount: number;
  revenue: number;
  grossProfit: number;
  isForecast: boolean;
  forecastRevenue?: number | null;
  forecastOrders?: number | null;
  upperBandRevenue?: number | null;
  lowerBandRevenue?: number | null;
  rsi?: number | null;
  fisher?: number | null;
  fisherTrigger?: number | null;
  macd?: number | null;
  macdSignal?: number | null;
  macdHist?: number | null;
  bollingerUpper?: number | null;
  bollingerMiddle?: number | null;
  bollingerLower?: number | null;
  ema7?: number | null;
  ema21?: number | null;
}

export interface TerminalSummary {
  demandRegime: string;
  currentRsi: number;
  rsiSignal: string;
  fisherSignal: string;
  macdSignalText?: string;
  bollingerSignalText?: string;
  projectedPeriodRevenue: number;
  projectedPeriodOrders: number;
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  accuracyScore: number;
  r2Score: number;
  mapeScore: number;
  modelDescription: string;
}

export interface MarketTerminalResponse {
  timeframe: TerminalTimeframe;
  points: TerminalDataPoint[];
  summary: TerminalSummary;
}
