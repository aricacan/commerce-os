// Uygulama kabuğu uçları: mağaza/ERP seçici, bildirimler, arama, kur, referans listeler.
import type { ErpSourceInfo } from '../../api/erp-sources';
import type { NotificationDto } from '../../api/notification';
import type { SearchResult } from '../../../types/api';
import { ago, matchesSearch } from '../seed';
import { DEMO_CUSTOMERS, DEMO_PRODUCTS, DEMO_STORES } from '../data/core';
import { sessionGet } from '../session-store';
import { del, get, put, type DemoRoute } from '../router';

const GBP_TO_TRY_RATE = 41.8;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_LIMIT = 6;
const FAKE_ORDER_COUNT = 40;
const FAKE_ORDER_BASE = 7_400_000;
const NOTIFICATIONS_KEY = 'dashboard.notifications';
const STORE_COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6'];

const erpSources: ErpSourceInfo[] = DEMO_STORES.map((store, index) => ({
  id: index + 1,
  code: `${store.code}-${store.country === 'UK' ? 'base' : 'sentos'}`,
  selectorCode: store.code,
  erp: store.country === 'UK' ? 'Base' : 'Sentos',
  country: store.country,
  displayName: store.name,
  storeCode: store.code,
  storeName: store.name,
  storeColor: STORE_COLORS[index % STORE_COLORS.length],
}));

function seedNotifications(): NotificationDto[] {
  const base = { storeId: 1, userId: null, isRead: false };
  return [
    { ...base, id: 1, title: 'Yeni sipariş geldi', body: 'Mağaza A için Trendyol üzerinden 6 yeni sipariş alındı.', type: 'OrderStatus', severity: 'Info', createdAt: ago(0, 0, 12), url: '/orders' },
    { ...base, id: 2, title: 'Kritik stok uyarısı', body: 'DM-1004 kodlu ürünün stoğu 3 adede düştü.', type: 'stock_critical', severity: 'Warning', createdAt: ago(0, 1, 5), url: '/products' },
    { ...base, id: 3, title: 'Satış anomalisi tespit edildi', body: 'Aydınlatma kategorisinde sipariş sayısı beklenenin %38 üzerinde.', type: 'Anomaly', severity: 'Warning', createdAt: ago(0, 3, 20), url: '/anomaly' },
    { ...base, id: 4, title: 'Müşteri mesajı bekliyor', body: 'WhatsApp üzerinden 2 konuşma temsilci devri istiyor.', type: 'omnichannel', severity: 'Info', createdAt: ago(0, 5, 40), url: 'workspace:omnichannel' },
    { ...base, id: 5, title: 'Günlük operasyon özeti', body: 'Dün 52 sipariş, 3 iade ve 2 iptal kaydedildi.', type: 'OperationsDailyDigest', severity: 'Info', createdAt: ago(1, 2, 0), url: '/orders', isRead: true },
    { ...base, id: 6, title: 'Otomasyon çalıştı', body: 'Fiyat güncelleme kuralı 18 üründe uygulandı.', type: 'Automation', severity: 'Info', createdAt: ago(1, 6, 30), url: null, isRead: true },
    { ...base, id: 7, title: 'Kargo gecikmesi', body: '4 gönderi tahmini teslim tarihini aştı.', type: 'OrderStatus', severity: 'Critical', createdAt: ago(2, 1, 15), url: '/logistics', isRead: true },
  ];
}

const notifications = () => sessionGet<NotificationDto[]>(NOTIFICATIONS_KEY, seedNotifications);

function searchCatalog(query: string): SearchResult {
  const products = DEMO_PRODUCTS
    .filter((product) => matchesSearch(product, query, ['name', 'sku']))
    .slice(0, SEARCH_LIMIT)
    .map((product) => ({ id: product.id, name: product.name, supplierSKU: product.sku }));

  const orders = Array.from({ length: FAKE_ORDER_COUNT }, (_, index) => ({
    id: index + 1,
    platformOrderNumber: String(FAKE_ORDER_BASE + index * 137),
    storeName: DEMO_STORES[index % DEMO_STORES.length].name,
    customerName: DEMO_CUSTOMERS[index % DEMO_CUSTOMERS.length].name,
  }))
    .filter((order) => matchesSearch(order, query, ['platformOrderNumber', 'customerName']))
    .slice(0, SEARCH_LIMIT);

  return { products, orders };
}

export const dashboardShellRoutes: DemoRoute[] = [
  get('/erp-sources', () => erpSources),
  get('/system-settings/base-fx', () => ({ gbpToTryRate: GBP_TO_TRY_RATE })),
  get('/search', ({ query }) => {
    const text = (query.get('q') ?? '').trim();
    return text.length < SEARCH_MIN_LENGTH ? { products: [], orders: [] } : searchCatalog(text);
  }),
  get('/notification', () => notifications()),
  get('/notification/vapid-public-key', () => ({ publicKey: '' })),
  put('/notification/read-all', () => {
    const items = notifications();
    const updated = items.filter((item) => !item.isRead).length;
    items.forEach((item) => { item.isRead = true; });
    return { updated };
  }),
  put('/notification/:id/read', ({ params }) => {
    const target = notifications().find((item) => String(item.id) === params.id);
    if (target) target.isRead = true;
    return undefined;
  }),
  del('/notification/all', () => {
    const items = notifications();
    const deleted = items.length;
    items.length = 0;
    return { deleted };
  }),
  get('/list-views', () => []),
];
