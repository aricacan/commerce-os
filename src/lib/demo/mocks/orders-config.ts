// Sipariş durumları, yaşam döngüsü, eski sipariş tamamlama ve pano aksiyon kuyruğu.
import type { OrderDetail } from '../../../types/api';
import type {
  ActionQueueItem, OldOrderBucket, OldOrderPreview, OperationStatus, OrderLifecycleStep,
} from '../../api/orderStatuses';
import {
  FINAL_STATUSES, OPERATION_STATUS_DEFINITIONS, STATUS_APPROVED, STATUS_AWAITING, STATUS_CANCELLED,
  STATUS_DELIVERED, STATUS_NEW, STATUS_PREPARING, STATUS_RETURNED, STATUS_SHIPPED, STATUS_SOURCING,
} from '../data/orders-statuses';
import { DEMO_RETURNS } from '../data/orders-returns';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { currentOrders, filterOrdersByStores } from './orders-store';

const DEFAULT_AUTO_COMPLETE_DAYS = 30;
const DEFAULT_PREVIEW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const LIFECYCLE: Omit<OrderLifecycleStep, 'count'>[] = [
  { key: STATUS_NEW, label: 'Yeni', description: 'Pazaryerinden yeni düşen sipariş.', kind: 'Flow', order: 1 },
  { key: STATUS_AWAITING, label: 'Onay Bekliyor', description: 'Ödeme veya stok onayı bekleyen sipariş.', kind: 'Flow', order: 2 },
  { key: STATUS_APPROVED, label: 'Onaylandı', description: 'Onaylanmış, hazırlığa alınabilir sipariş.', kind: 'Flow', order: 3 },
  { key: STATUS_SOURCING, label: 'Tedarik Sürecinde', description: 'Ürün tedarikçiden getirtiliyor.', kind: 'Flow', order: 4 },
  { key: STATUS_PREPARING, label: 'Hazırlanıyor', description: 'Paketleme ve etiketleme aşamasında.', kind: 'Flow', order: 5 },
  { key: STATUS_SHIPPED, label: 'Kargolandı', description: 'Kargo firmasına teslim edildi.', kind: 'Flow', order: 6 },
  { key: STATUS_DELIVERED, label: 'Tamamlandı', description: 'Müşteriye teslim edildi; süreç kapandı.', kind: 'Terminal', order: 7 },
  { key: STATUS_CANCELLED, label: 'İptal', description: 'Sipariş iptal edildi.', kind: 'Other', order: 8 },
  { key: STATUS_RETURNED, label: 'İade', description: 'Müşteri siparişi iade etti.', kind: 'Other', order: 9 },
];

function countBy<T>(items: T[], key: (item: T) => string): OldOrderBucket[] {
  const counts = new Map<string, number>();
  items.forEach((item) => counts.set(key(item), (counts.get(key(item)) ?? 0) + 1));
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function operationStatuses(request: DemoRequest): OperationStatus[] {
  const orders = filterOrdersByStores(currentOrders(), request.stores);
  return OPERATION_STATUS_DEFINITIONS.map((status) => ({
    ...status,
    orderCount: orders.filter((order) => order.operationStatusId === status.id).length,
  }));
}

function lifecycle(request: DemoRequest): OrderLifecycleStep[] {
  const orders = filterOrdersByStores(currentOrders(), request.stores);
  return LIFECYCLE.map((step) => ({
    ...step,
    count: orders.filter((order) => order.universalStatus === step.key).length,
  }));
}

function oldOrderPreview(request: DemoRequest): OldOrderPreview {
  const days = Number(request.query.get('days') ?? DEFAULT_PREVIEW_DAYS);
  const cutoff = Date.now() - days * MS_PER_DAY;
  const eligible: OrderDetail[] = currentOrders().filter(
    (order) => !FINAL_STATUSES.includes(order.universalStatus) && new Date(order.orderDate).getTime() < cutoff,
  );
  const dates = eligible.map((order) => order.orderDate).sort();
  return {
    days,
    cutoffUtc: new Date(cutoff).toISOString(),
    eligibleCount: eligible.length,
    skippedManualCount: 0,
    oldestOrderDate: dates[0] ?? null,
    newestOrderDate: dates[dates.length - 1] ?? null,
    byStore: countBy(eligible, (order) => order.storeName),
    byPlatform: countBy(eligible, (order) => order.platformName),
    byStatus: countBy(eligible, (order) => order.universalStatus),
  };
}

const openReturnCount = (): number =>
  DEMO_RETURNS.filter((doc) => doc.status === 'Draft' || doc.status === 'Approved').length;

function actionQueue(): ActionQueueItem[] {
  const orders = currentOrders();
  const withStatus = (status: string) => orders.filter((order) => order.universalStatus === status).length;
  return [
    { key: 'awaiting-approval', label: 'Onay bekleyen sipariş', count: withStatus(STATUS_AWAITING), href: '/orders?status=Onay%20Bekliyor' },
    { key: 'preparing', label: 'Hazırlanmayı bekleyen sipariş', count: withStatus(STATUS_PREPARING), href: '/orders?status=Haz%C4%B1rlan%C4%B1yor' },
    {
      key: 'missing-cost',
      label: 'Maliyeti eksik sipariş',
      count: orders.filter((order) => order.items.some((item) => !item.hasCostData)).length,
      href: '/orders?status=missing_cost',
    },
    { key: 'returns', label: 'Açık iade belgesi', count: openReturnCount(), href: '/orders/returns' },
  ];
}

export const orderConfigRoutes: DemoRoute[] = [
  get('/order-statuses/lifecycle', lifecycle),
  get('/order-statuses/old-orders/preview', oldOrderPreview),
  get('/order-statuses/old-orders/auto-complete', () => ({ days: DEFAULT_AUTO_COMPLETE_DAYS })),
  get('/order-statuses/auto-lifecycle', () => ({ enabled: true })),
  get('/order-statuses', operationStatuses),
  get('/dashboard/action-queue', actionQueue),
];
