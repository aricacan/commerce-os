// Sipariş listesi, detay için arama, not ve operasyon durumu (oturum içi yazma).
import type { OrderDetail } from '../../../types/api';
import type { OrderSourceDiscrepancy } from '../../api/orders';
import { DEMO_PLATFORMS } from '../data/core';
import { DemoHttpResponse, get, put, type DemoRequest, type DemoRoute } from '../router';
import { ago, matchesSearch, paginate } from '../seed';
import {
  asRecord, currentOrders, filterOrdersByDate, filterOrdersByStores, findOrder, updateOrderOverride,
} from './orders-store';

const NO_CONTENT = 204;
const NOT_FOUND = 404;
const BAD_REQUEST = 400;
const MISSING_COST_FILTER = 'missing_cost';
const DISCREPANCY_EVERY_NTH_ORDER = 23;

type OrderSort = 'date_desc' | 'date_asc' | 'total_desc' | 'total_asc';

const SORTERS: Record<OrderSort, (a: OrderDetail, b: OrderDetail) => number> = {
  date_desc: (a, b) => b.orderDate.localeCompare(a.orderDate),
  date_asc: (a, b) => a.orderDate.localeCompare(b.orderDate),
  total_desc: (a, b) => b.totalAmount - a.totalAmount,
  total_asc: (a, b) => a.totalAmount - b.totalAmount,
};

function matchesOrderSearch(order: OrderDetail, search: string): boolean {
  const needle = search.toLocaleLowerCase('tr');
  const inItems = order.items.some((item) =>
    `${item.productName} ${item.supplierSku}`.toLocaleLowerCase('tr').includes(needle));
  const header = matchesSearch(order, search, ['platformOrderNumber', 'customerName', 'orderCode', 'storeName']);
  return header || inItems;
}

/** Tam sipariş no (detay sayfası bunu arar) varsa yalnız o sipariş döner. */
function applySearch(orders: OrderDetail[], search: string | null): OrderDetail[] {
  if (!search) return orders;
  const exact = orders.filter((order) => String(order.orderId) === search.trim());
  return exact.length > 0 ? exact : orders.filter((order) => matchesOrderSearch(order, search));
}

function applyStatus(orders: OrderDetail[], status: string | null): OrderDetail[] {
  if (!status) return orders;
  if (status === MISSING_COST_FILTER) return orders.filter((order) => order.items.some((item) => !item.hasCostData));
  return orders.filter((order) => order.universalStatus === status);
}

function applyPlatform(orders: OrderDetail[], platformId: string | null): OrderDetail[] {
  const platformName = platformId ? DEMO_PLATFORMS[Number(platformId) - 1] : undefined;
  return platformName ? orders.filter((order) => order.platformName === platformName) : orders;
}

function listOrders(request: DemoRequest) {
  const { query } = request;
  const scoped = filterOrdersByStores(currentOrders(), request.stores);
  const dated = filterOrdersByDate(scoped, query.get('from'), query.get('to'));
  const filtered = applyPlatform(applyStatus(applySearch(dated, query.get('search')), query.get('status')), query.get('platformId'));
  const sortKey = (query.get('sortBy') ?? 'date_desc') as OrderSort;
  const sorted = [...filtered].sort(SORTERS[sortKey] ?? SORTERS.date_desc);
  return paginate(sorted, query, 15);
}

function updateNote(request: DemoRequest) {
  const orderId = Number(request.params.id);
  if (!findOrder(orderId)) return new DemoHttpResponse(NOT_FOUND);
  const note = asRecord(request.body).note;
  const normalized = typeof note === 'string' && note.trim() !== '' ? note : null;
  updateOrderOverride(orderId, { note: normalized });
  return { id: orderId, note: normalized };
}

function bulkUpdateNote(request: DemoRequest) {
  const { orderIds, note } = asRecord(request.body);
  if (!Array.isArray(orderIds)) return new DemoHttpResponse(BAD_REQUEST);
  const normalized = typeof note === 'string' && note.trim() !== '' ? note : null;
  const updatable = orderIds.filter((id): id is number => typeof id === 'number' && findOrder(id) !== undefined);
  updatable.forEach((id) => updateOrderOverride(id, { note: normalized }));
  return { updated: updatable.length, total: orderIds.length, note: normalized };
}

function changeOperationStatus(request: DemoRequest) {
  const orderId = Number(request.params.id);
  const statusId = asRecord(request.body).statusId;
  if (!findOrder(orderId) || typeof statusId !== 'number') return new DemoHttpResponse(NOT_FOUND);
  updateOrderOverride(orderId, { operationStatusId: statusId });
  return new DemoHttpResponse(NO_CONTENT);
}

/** Bazı siparişlerde ERP ile pazaryeri adres bilgisinde çelişki göster. */
function sourceDiscrepancies(request: DemoRequest): OrderSourceDiscrepancy[] {
  const orderId = Number(request.params.id);
  const order = findOrder(orderId);
  if (!order || orderId % DISCREPANCY_EVERY_NTH_ORDER !== 0) return [];
  return [{
    id: orderId,
    field: 'Teslimat ilçesi',
    ownerValue: order.addressDistrict,
    reportedValue: 'Merkez',
    reportedBy: order.platformName,
    detectedAt: ago(1),
  }];
}

export const orderListRoutes: DemoRoute[] = [
  get('/order', listOrders),
  put('/order/bulk/note', bulkUpdateNote),
  put('/order/:id/note', updateNote),
  get('/order/:id/source-discrepancies', sourceDiscrepancies),
  put('/orders/:id/operation-status', changeOperationStatus),
];
