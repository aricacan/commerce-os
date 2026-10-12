// Operasyon iş kuyruğu ve lojistik haritası (şehir/pazaryeri/depo noktaları).
import type { OperationIssue, OperationsWorkspaceResponse } from '../../api/operations';
import type { LogisticsMapData, OrderCityPoint, PlatformMarker } from '../../../types/api';
import { ago, createRng } from '../seed';
import { DEMO_PLATFORMS } from '../data/core';
import { get, type DemoRoute } from '../router';

const rng = createRng(1107);
const DEFAULT_LIMIT = 250;
const UK_STORE_PREFIX = 'base';
const AVG_ORDER_VALUE_RANGE: [number, number] = [310, 920];

const ASSIGNEES = [
  { id: 1, name: 'Demo Kullanıcı', email: 'demo@demo.com' },
  { id: 2, name: 'Elif Operasyon', email: 'elif.ops@example.com' },
  { id: 3, name: 'Burak Depo', email: 'burak.depo@example.com' },
];

type IssueSeed = Pick<OperationIssue, 'type' | 'domain' | 'severity' | 'title' | 'description' | 'storeCode' | 'entityType' | 'actionLabel' | 'actionUrl'> & {
  facts: Record<string, string>;
};

const SEEDS: IssueSeed[] = [
  { type: 'stock.critical', domain: 'Stock', severity: 'Critical', title: 'Kritik stok: DM-1004', description: 'Stok 3 güne yetecek seviyenin altında.', storeCode: 'store-a', entityType: 'Product', actionLabel: 'Stok uyarısına git', actionUrl: '/base/warnings', facts: { 'Kalan stok': '14 adet', 'Günlük satış': '5 adet' } },
  { type: 'stock.negative', domain: 'Stock', severity: 'High', title: 'Negatif stok: DM-1017', description: 'ERP stoğu eksiye düşmüş.', storeCode: 'store-b', entityType: 'Product', actionLabel: 'Ürünü aç', actionUrl: '/products', facts: { 'ERP stok': '-6 adet' } },
  { type: 'order.stuck', domain: 'Order', severity: 'High', title: 'Siparişler 48 saattir kargoya verilmedi', description: '7 sipariş hazırlanıyor durumunda bekliyor.', storeCode: 'store-a', entityType: 'Order', actionLabel: 'Siparişlere git', actionUrl: '/orders', facts: { 'Bekleyen sipariş': '7', 'En eski': '51 saat' } },
  { type: 'logistics.delivery-failed', domain: 'Logistics', severity: 'High', title: 'Teslim edilemeyen gönderiler', description: '3 gönderi alıcıya ulaştırılamadı.', storeCode: 'store-a', entityType: 'Shipment', actionLabel: 'Gönderilere git', actionUrl: '/logistics', facts: { Taşıyıcı: 'Hızlı Kargo', 'Gönderi sayısı': '3' } },
  { type: 'logistics.carrier-auth', domain: 'Logistics', severity: 'Critical', title: 'Taşıyıcı kimlik doğrulaması başarısız', description: 'Kuzey Kurye bağlantısı reddedildi.', storeCode: null, entityType: 'Carrier', actionLabel: 'Taşıyıcılara git', actionUrl: '/logistics', facts: { Taşıyıcı: 'Kuzey Kurye' } },
  { type: 'integration.sync-failed', domain: 'Integration', severity: 'High', title: 'Pazaryeri senkronu hata verdi', description: 'Son 3 senkron denemesi zaman aşımına uğradı.', storeCode: 'store-b', entityType: 'Integration', actionLabel: 'Entegrasyonlara git', actionUrl: '/settings', facts: { 'Son başarılı': '6 saat önce' } },
  { type: 'finance.cost-missing', domain: 'Finance', severity: 'Medium', title: 'Alış fiyatı girilmemiş ürünler', description: '18 ürünün maliyeti tanımlı değil, kârlılık hesaplanamıyor.', storeCode: 'store-a', entityType: 'Product', actionLabel: 'Alış fiyatlarına git', actionUrl: '/product-costs', facts: { 'Eksik ürün': '18' } },
  { type: 'catalog.no-image', domain: 'Catalog', severity: 'Medium', title: 'Görseli olmayan aktif ürünler', description: '9 aktif üründe görsel yok.', storeCode: 'store-c', entityType: 'Product', actionLabel: 'Kataloğa git', actionUrl: '/products', facts: { 'Ürün sayısı': '9' } },
  { type: 'approval.pending', domain: 'Approval', severity: 'Medium', title: 'Onay bekleyen fiyat değişikliği', description: '4 fiyat değişikliği onayınızı bekliyor.', storeCode: 'store-a', entityType: 'Approval', actionLabel: 'Onaylara git', actionUrl: '/system/moderation', facts: { 'Bekleyen': '4' } },
  { type: 'stock.warehouse-mismatch', domain: 'Stock', severity: 'Medium', title: 'Depo sayımı ile ERP stoğu uyuşmuyor', description: '10 üründe fiziksel sayım farkı var.', storeCode: 'store-b', entityType: 'Product', actionLabel: 'Mutabakata git', actionUrl: '/wms/mutabakat', facts: { 'Farklı ürün': '10' } },
  { type: 'order.late-shipment', domain: 'Order', severity: 'High', title: 'Geciken UK siparişleri', description: '5 UK siparişi vaat edilen teslim tarihini aşıyor.', storeCode: 'store-c', entityType: 'Order', actionLabel: 'Siparişlere git', actionUrl: '/orders', facts: { 'Geciken': '5' } },
  { type: 'logistics.transit-delay', domain: 'Logistics', severity: 'Medium', title: 'Sevkiyat hattında gecikme', description: 'Bir kutu 25 gündür yolda.', storeCode: 'store-c', entityType: 'Batch', actionLabel: 'Sevkiyat hattına git', actionUrl: '/base/pipeline', facts: { 'Yolda geçen': '25 gün' } },
];

const STATUS_CYCLE: OperationIssue['status'][] = ['Open', 'Open', 'InProgress', 'Open', 'Snoozed', 'InProgress'];

function buildIssue(seed: IssueSeed, index: number): OperationIssue {
  const assignee = index % 3 === 0 ? null : ASSIGNEES[index % ASSIGNEES.length];
  const detectedDaysAgo = (index % 6) + 1;
  const overdue = index % 5 === 0;
  return {
    ...seed,
    workItemId: 100 + index,
    id: `op-${100 + index}`,
    entityId: String(1000 + index * 7),
    detectedAt: ago(detectedDaysAgo),
    lastDetectedAt: ago(0, index),
    status: STATUS_CYCLE[index % STATUS_CYCLE.length],
    assigneeUserId: assignee?.id ?? null,
    assigneeName: assignee?.name ?? null,
    dueAt: assignee ? ago(overdue ? 1 : -2) : null,
    snoozedUntil: STATUS_CYCLE[index % STATUS_CYCLE.length] === 'Snoozed' ? ago(-1) : null,
    isOverdue: overdue && assignee !== null,
    resolution: null,
    notes: index % 4 === 0
      ? [{ id: index, authorUserId: 2, authorName: ASSIGNEES[1].name, body: 'Tedarikçiyle görüşüldü, yarın dönüş bekleniyor.', createdAt: ago(0, 8) }]
      : [],
    activities: [{ id: index, actorUserId: null, actorName: 'Sistem', type: 'detected', description: 'Sorun otomatik olarak tespit edildi.', createdAt: ago(detectedDaysAgo) }],
  };
}

function workspace(limit: number): OperationsWorkspaceResponse {
  const issues = SEEDS.map(buildIssue).slice(0, limit);
  return {
    summary: {
      open: issues.filter((issue) => issue.status === 'Open').length,
      inProgress: issues.filter((issue) => issue.status === 'InProgress').length,
      critical: issues.filter((issue) => issue.severity === 'Critical').length,
      overdue: issues.filter((issue) => issue.isOverdue).length,
      unassigned: issues.filter((issue) => issue.assigneeUserId === null).length,
    },
    issues,
    assignees: ASSIGNEES,
  };
}

const TR_CITIES: [string, number, number, number][] = [
  ['İstanbul', 41.01, 28.97, 100], ['Ankara', 39.93, 32.86, 64], ['İzmir', 38.42, 27.14, 55],
  ['Bursa', 40.19, 29.06, 32], ['Antalya', 36.9, 30.7, 28], ['Konya', 37.87, 32.48, 18],
  ['Adana', 37.0, 35.32, 16], ['Gaziantep', 37.07, 37.38, 12],
];
const UK_CITIES: [string, number, number, number][] = [
  ['London', 51.51, -0.13, 70], ['Manchester', 53.48, -2.24, 34], ['Leeds', 53.8, -1.55, 22], ['Birmingham', 52.49, -1.89, 27],
];

function cityPoints(cities: [string, number, number, number][]): OrderCityPoint[] {
  return cities.map(([city, lat, lng, count]) => ({ city, lat, lng, count, revenue: Math.round(count * rng.int(AVG_ORDER_VALUE_RANGE[0], AVG_ORDER_VALUE_RANGE[1])) }));
}

const PLATFORM_COORDS: [number, number][] = [[41.0, 29.0], [41.1, 28.9], [47.6, -122.3], [39.9, 32.8], [51.5, -0.1]];

function platformMarkers(orders: OrderCityPoint[]): PlatformMarker[] {
  const total = orders.reduce((sum, point) => sum + point.count, 0);
  const revenue = orders.reduce((sum, point) => sum + point.revenue, 0);
  return DEMO_PLATFORMS.map((platform, index) => {
    const share = [0.34, 0.26, 0.14, 0.16, 0.1][index];
    return { platform, lat: PLATFORM_COORDS[index][0], lng: PLATFORM_COORDS[index][1], count: Math.round(total * share), revenue: Math.round(revenue * share) };
  });
}

function mapData(stores: string[]): LogisticsMapData {
  const ukOnly = stores.length > 0 && stores.every((code) => code.startsWith(UK_STORE_PREFIX));
  const trOnly = stores.length > 0 && !stores.some((code) => code.startsWith(UK_STORE_PREFIX));
  const orders = [...(ukOnly ? [] : cityPoints(TR_CITIES)), ...(trOnly ? [] : cityPoints(UK_CITIES))];
  return {
    ordersByCity: orders.sort((a, b) => b.count - a.count),
    platformMarkers: platformMarkers(orders),
    warehouses: [
      { id: 1, name: 'Demo Ana Depo', city: 'İstanbul', lat: 41.06, lng: 28.99 },
      { id: 2, name: 'UK Dağıtım Deposu', city: 'Birmingham', lat: 52.49, lng: -1.89 },
    ],
  };
}

export const logisticsOperationsRoutes: DemoRoute[] = [
  get('/operations', (req) => workspace(Number(req.query.get('limit') ?? DEFAULT_LIMIT))),
  get('/logistics/map', (req) => mapData(req.stores.flatMap((entry) => entry.split(',')))),
];
