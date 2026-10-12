// Modül kataloğu ve sayfa yetkileri: demo hesabı için her şey açık ve erişilebilir.
import type { ModuleCatalogEntry } from '../../api/settings';

type ModuleSeed = Pick<ModuleCatalogEntry, 'key' | 'displayName' | 'description' | 'kind' | 'uiRoute' | 'grantablePerUser'>;

const MODULE_SEEDS: ModuleSeed[] = [
  { key: 'omnichannel', displayName: 'Omnichannel', description: 'WhatsApp, sosyal kanal ve müşteri mesaj kutusu', kind: 'Workspace', uiRoute: '/omnichannel', grantablePerUser: true },
  { key: 'sitehub', displayName: 'SiteHub', description: 'Web sitesi teklif talepleri, mesajlar ve site istatistikleri', kind: 'Workspace', uiRoute: '/sitehub', grantablePerUser: true },
  { key: 'shopify', displayName: 'Shopify Hub', description: 'Shopify mağazaları: bağlantı, canlı sipariş ve ürün gezgini', kind: 'Workspace', uiRoute: '/shopify', grantablePerUser: true },
  { key: 'sonar', displayName: 'OEM Matcher', description: 'OEM parça kodu ve çapraz ürün eşleme', kind: 'Workspace', uiRoute: '/oem-matcher', grantablePerUser: true },
  { key: 'adshub', displayName: 'AdsHub', description: 'Google ve Meta reklam kampanyaları', kind: 'Workspace', uiRoute: '/adshub', grantablePerUser: true },
  { key: 'shipping', displayName: 'Lojistik', description: 'Kargo, desi, sevk ve lojistik operasyonları', kind: 'Workspace', uiRoute: '/logistics', grantablePerUser: true },
  { key: 'radar', displayName: 'B2B Outreach', description: 'B2B firma arama, tarayıcı ve e-posta pazarlama', kind: 'Workspace', uiRoute: '/b2b-outreach', grantablePerUser: true },
  { key: 'basetrack', displayName: 'Base Hub', description: 'Sevkiyat, stok takibi, araç kataloğu ve ürün takibi', kind: 'Workspace', uiRoute: '/base', grantablePerUser: true },
  { key: 'erpis', displayName: 'Erpis', description: 'Excel tabanlı ERP analiz ve raporlama', kind: 'Workspace', uiRoute: '/erpis', grantablePerUser: true },
  { key: 'warehouse', displayName: 'WMS', description: 'Depo yönetim sistemi: raf, toplama ve el terminali', kind: 'Workspace', uiRoute: '/wms', grantablePerUser: true },
  { key: 'sentostrack', displayName: 'Sentos Hub', description: 'Stok tüketim ve eksik ürün takibi', kind: 'Workspace', uiRoute: '/sentos', grantablePerUser: true },
  { key: 'trendyol', displayName: 'Trendyol Hub', description: 'Kampanyalar, komisyon tarifesi, DSS analizi ve kârlılık', kind: 'Hub', uiRoute: '/trendyol', grantablePerUser: false },
  { key: 'intelligent', displayName: 'AI Copilot', description: 'Yapay zekâ destekli karar asistanı ve RAG', kind: 'Workspace', uiRoute: '/ai-copilot', grantablePerUser: true },
  { key: 'photo-studio', displayName: 'Photo Studio', description: 'AI görsel işleme ve medya yöneticisi', kind: 'Workspace', uiRoute: '/photo-studio', grantablePerUser: true },
  { key: 'forecast', displayName: 'SellingView', description: 'Satış tahmini ve talep projeksiyonu', kind: 'Workspace', uiRoute: '/sellingview', grantablePerUser: true },
  { key: 'monitoring', displayName: 'Sistem İzleme', description: 'Sağlık kontrolü, denetim kaydı, anomali takibi ve arka plan işleri', kind: 'AdminTool', uiRoute: '/monitoring', grantablePerUser: true },
  { key: 'partnerhub', displayName: 'PartnerHub', description: 'Dış sistemlere açılan MCP sunucusu ve iş ortağı erişimi', kind: 'AdminTool', uiRoute: '/partnerhub', grantablePerUser: true },
  { key: 'fitment', displayName: 'Uyumluluk Paneli', description: 'Araç-ürün uyumluluk matrisi', kind: 'NavPage', uiRoute: '/products/fitment', grantablePerUser: false },
  { key: 'erpdispatch', displayName: 'Dış ERP Gönderimi', description: 'Panelden onaylanan sipariş ve ürünü ERP’ye yazar', kind: 'InternalFlag', uiRoute: null, grantablePerUser: false },
  { key: 'productgapscan', displayName: 'Ürün Boşluk Taraması', description: 'Bir ERP’de olup diğerinde olmayan ürünleri tarar', kind: 'InternalFlag', uiRoute: null, grantablePerUser: false },
];

export const DEMO_MODULE_CATALOG: ModuleCatalogEntry[] = MODULE_SEEDS.map((seed) => ({
  ...seed,
  togglable: true,
  enabled: true,
  availableOnServer: true,
}));

export const DEMO_MODULE_FLAGS: Record<string, boolean> = Object.fromEntries(
  MODULE_SEEDS.map((seed) => [seed.key, true]),
);

const ALL_ROLES = 'SuperAdmin,Admin,Moderator,User';
const MANAGER_ROLES = 'SuperAdmin,Admin';

// [pageKey, ekran adı, izinli roller]
const PAGE_SEEDS: Array<[string, string, string]> = [
  ['dashboard', 'Pano', ALL_ROLES],
  ['orders', 'Siparişler', ALL_ROLES],
  ['products', 'Ürünler', ALL_ROLES],
  ['categories', 'Kategoriler', ALL_ROLES],
  ['boxes', 'Depo', ALL_ROLES],
  ['fitment', 'Uyumluluk', ALL_ROLES],
  ['logistics', 'Lojistik', ALL_ROLES],
  ['finance', 'Finans', MANAGER_ROLES],
  ['product-costs', 'Alış Fiyatları', MANAGER_ROLES],
  ['product-analysis', 'Ürün Analizi', ALL_ROLES],
  ['anomaly', 'Anomali', ALL_ROLES],
  ['cohort-analytics', 'Kohort Analizi', ALL_ROLES],
  ['price-comparison', 'Fiyat Karşılaştırma', ALL_ROLES],
  ['invoicing-invoices', 'Faturalar', MANAGER_ROLES],
  ['invoicing-ledger', 'Defter', MANAGER_ROLES],
  ['accounting-customers', 'Cari Hesaplar', MANAGER_ROLES],
  ['purchase-orders', 'Satın Alma', ALL_ROLES],
  ['suppliers', 'Tedarikçiler', ALL_ROLES],
  ['customize', 'Özelleştirme', ALL_ROLES],
  ['automation', 'Otomasyon', MANAGER_ROLES],
  ['notifications', 'Bildirimler', ALL_ROLES],
  ['order-statuses', 'Operasyon Durumları', MANAGER_ROLES],
  ['feedback', 'Geri Bildirim', ALL_ROLES],
  ['settings', 'Sistem Ayarları', MANAGER_ROLES],
];

export const DEMO_PAGE_PERMISSIONS = PAGE_SEEDS.map(([pageKey, pageLabel, allowedRoles], index) => ({
  pageKey,
  pageLabel,
  allowedRoles,
  sortOrder: index + 1,
}));
