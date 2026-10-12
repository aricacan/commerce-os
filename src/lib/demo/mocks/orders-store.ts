// Siparişlerin oturum içi görünümü: seed verisi + kullanıcının o oturumda yaptığı değişiklikler.
import type { OrderDetail } from '../../../types/api';
import { DEMO_ORDERS, DEMO_STORE_PROFILES } from '../data/orders-seed';
import { sessionGet } from '../session-store';

interface OrderOverride {
  note?: string | null;
  operationStatusId?: number;
}

const OVERRIDES_KEY = 'orders:overrides';

const overrides = () => sessionGet(OVERRIDES_KEY, () => new Map<number, OrderOverride>());

export function updateOrderOverride(orderId: number, patch: OrderOverride): void {
  overrides().set(orderId, { ...overrides().get(orderId), ...patch });
}

/** Seed siparişleri (eskiden yeniye); oturumda not/durum değişmişse onunla birleşik. */
export function currentOrders(): OrderDetail[] {
  const changes = overrides();
  if (changes.size === 0) return DEMO_ORDERS;
  return DEMO_ORDERS.map((order) => {
    const change = changes.get(order.orderId);
    return change ? { ...order, ...change } : order;
  });
}

export function findOrder(orderId: number): OrderDetail | undefined {
  return currentOrders().find((order) => order.orderId === orderId);
}

const storeCodeById = new Map(DEMO_STORE_PROFILES.map((profile) => [profile.id, profile.store.code]));

/** X-Store başlığındaki kodlar demo mağazalarından hiçbiriyle eşleşmiyorsa filtre uygulanmaz. */
export function filterOrdersByStores(orders: OrderDetail[], stores: string[]): OrderDetail[] {
  const known = stores.filter((code) => [...storeCodeById.values()].includes(code));
  if (known.length === 0) return orders;
  return orders.filter((order) => known.includes(storeCodeById.get(order.storeId) ?? ''));
}

/** YYYY-MM-DD aralığı (uçlar dahil); boş uç sınırsız demektir. */
export function filterOrdersByDate(orders: OrderDetail[], from: string | null, to: string | null): OrderDetail[] {
  return orders.filter((order) => {
    const day = order.orderDate.slice(0, 10);
    return (!from || day >= from) && (!to || day <= to);
  });
}

export function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}
