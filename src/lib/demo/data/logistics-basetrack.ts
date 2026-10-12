// Sevkiyat hattı (depo -> yol -> UK depo) takibi için kurgusal veri. Tutarlar GBP.
import type {
  BaseTrackBatch, BaseTrackDepotItem, BaseTrackEvent, BaseTrackLinkedOrder,
  BaseTrackSettings, BaseTrackStockWarning, BaseTrackStockWarningSummary, BaseTrackSummary,
} from '../../api/basetrack';
import { ago, createRng, dayAgo } from '../seed';
import { DEMO_CUSTOMERS, DEMO_PLATFORMS, DEMO_PRODUCTS } from './core';

const rng = createRng(6624);

export const DEMO_BASETRACK_SETTINGS: BaseTrackSettings = {
  transitDays: 21, redRiskPct: 80, orangeRiskPct: 50, yellowRiskPct: 25, depotLabel: 'Ana',
};

const ROOM_AGES_DAYS = [48, 33, 19, 8];
const BATCHES_PER_ROOM = 6;
const UNMATCHED_EVERY = 11;
const GBP_PRICE_RANGE: [number, number] = [3.2, 38];
const ORDER_QTY_RANGE: [number, number] = [40, 400];
const OPERATORS = ['depo1@example.com', 'depo2@example.com'];
const WARNING_PRODUCT_COUNT = 36;
const DEPOT_ITEM_COUNT = 28;
const LINKED_ORDER_COUNT = 4;

function buildBatch(id: number, roomAgeDays: number, indexInRoom: number): BaseTrackBatch {
  const product = DEMO_PRODUCTS[(id * 7) % DEMO_PRODUCTS.length];
  const orderedQty = rng.int(ORDER_QTY_RANGE[0], ORDER_QTY_RANGE[1]);
  const unmatched = id % UNMATCHED_EVERY === 0;
  // Eski odalar çoğunlukla UK depoya varmış, yeni odalar hâlâ yolda ya da çıkış bekliyor.
  const arrivedShare = roomAgeDays > 30 ? 1 : roomAgeDays > 15 ? 0.6 : roomAgeDays > 6 ? 0.2 : 0;
  const ukDepot = Math.round(orderedQty * arrivedShare);
  const inTransit = roomAgeDays > 6 ? Math.round((orderedQty - ukDepot) * 0.7) : Math.round((orderedQty - ukDepot) * 0.3);
  return {
    id,
    supplierStockCode: `TD-${String(4000 + id)}`,
    sku: unmatched ? null : product.sku,
    productId: unmatched ? null : product.id,
    productName: unmatched ? `Eşleşmemiş ürün ${indexInRoom + 1}` : product.name,
    orderDate: dayAgo(roomAgeDays),
    orderedQty,
    unitPrice: rng.float(GBP_PRICE_RANGE[0], GBP_PRICE_RANGE[1]),
    currency: 'GBP',
    firstShipmentDate: roomAgeDays > 6 ? dayAgo(roomAgeDays - 5) : null,
    deliveryNoteNo: roomAgeDays > 6 ? `IRS-${20260000 + id}` : null,
    qtyTrDepot: orderedQty - ukDepot - inTransit,
    qtyInTransit: inTransit,
    qtyUkDepot: ukDepot,
    updatedAt: ago(Math.max(0, roomAgeDays - 6)),
    roomLabel: roomAgeDays === ROOM_AGES_DAYS[0] ? 'Kış Sezonu Siparişi' : null,
  };
}

export const DEMO_BATCHES: BaseTrackBatch[] = ROOM_AGES_DAYS.flatMap((age, roomIndex) =>
  Array.from({ length: BATCHES_PER_ROOM }, (_, index) => buildBatch(roomIndex * BATCHES_PER_ROOM + index + 1, age, index)));

export function summarize(batches: BaseTrackBatch[]): BaseTrackSummary {
  const sum = (pick: (batch: BaseTrackBatch) => number) => batches.reduce((total, batch) => total + pick(batch), 0);
  return {
    trDepotQty: sum((batch) => batch.qtyTrDepot),
    inTransitQty: sum((batch) => batch.qtyInTransit),
    ukDepotQty: sum((batch) => batch.qtyUkDepot),
    openBatchCount: batches.filter((batch) => batch.qtyTrDepot + batch.qtyInTransit > 0).length,
    unmatchedBatchCount: batches.filter((batch) => batch.productId === null).length,
  };
}

export function eventsOf(batch: BaseTrackBatch): BaseTrackEvent[] {
  const events: BaseTrackEvent[] = [
    { id: batch.id * 10, fromState: null, toState: 'TrDepot', quantity: batch.orderedQty, source: 'Excel içe aktarma', failed: false, note: null, createdBy: OPERATORS[0], createdAt: ago(0, 24 * 40) },
  ];
  if (batch.qtyInTransit + batch.qtyUkDepot > 0) {
    events.push({ id: batch.id * 10 + 1, fromState: 'TrDepot', toState: 'InTransit', quantity: batch.qtyInTransit + batch.qtyUkDepot, source: 'İrsaliye', failed: false, note: batch.deliveryNoteNo, createdBy: OPERATORS[1], createdAt: ago(0, 24 * 25) });
  }
  if (batch.qtyUkDepot > 0) {
    events.push({ id: batch.id * 10 + 2, fromState: 'InTransit', toState: 'UkDepot', quantity: batch.qtyUkDepot, source: 'Manuel varış', failed: false, note: 'UK depoya ulaştı', createdBy: OPERATORS[1], createdAt: ago(0, 24 * 5) });
  }
  return events;
}

export function linkedOrdersOf(batch: BaseTrackBatch): BaseTrackLinkedOrder[] {
  return Array.from({ length: LINKED_ORDER_COUNT }, (_, index) => ({
    orderId: 5000 + batch.id * 10 + index,
    platformOrderNumber: `UK-${700000 + batch.id * 31 + index * 7}`,
    orderDate: ago(index * 2 + 1),
    universalStatus: index === 0 ? 'Hazırlanıyor' : 'Kargoda',
    customerName: DEMO_CUSTOMERS[(batch.id + index) % DEMO_CUSTOMERS.length].name,
    platformName: DEMO_PLATFORMS[(batch.id + index) % DEMO_PLATFORMS.length],
    storeName: 'Store C (UK)',
    quantity: index + 1,
  }));
}

function warningFor(index: number): BaseTrackStockWarning {
  const product = DEMO_PRODUCTS[index * 3 % DEMO_PRODUCTS.length];
  const sold30 = rng.int(0, 90);
  const dailyDemand = Number((sold30 / 30).toFixed(2));
  const ukStock = rng.int(0, 120);
  const inTransitQty = rng.int(0, 60);
  const depotQty = rng.int(0, 80);
  const potentialStock = ukStock + inTransitQty + depotQty;
  const daysRemaining = dailyDemand > 0 ? Math.round(ukStock / dailyDemand) : null;
  const stockoutRisk = daysRemaining === null ? null : Math.min(100, Math.round((1 - daysRemaining / 60) * 100));
  const level = pickLevel(daysRemaining, stockoutRisk);
  return {
    productId: product.id, sku: product.sku, productName: product.name,
    ukStock, inTransitQty, depotQty, pendingShipQty: rng.int(0, 25), potentialStock,
    dailyDemand, daysRemaining, stockoutRisk,
    turnover30: sold30 > 0 ? Number((sold30 / Math.max(1, ukStock)).toFixed(2)) : null,
    turnover60: sold30 > 0 ? Number(((sold30 * 1.8) / Math.max(1, ukStock)).toFixed(2)) : null,
    turnover90: sold30 > 0 ? Number(((sold30 * 2.6) / Math.max(1, ukStock)).toFixed(2)) : null,
    avgOrderSize: rng.float(1, 2.4, 1),
    sold30, sold60: Math.round(sold30 * 1.8), sold90: Math.round(sold30 * 2.6),
    lowVolume: sold30 < 5,
    level,
    depotShortage: level === 'Red' ? rng.int(10, 80) : level === 'Orange' ? rng.int(0, 30) : 0,
    doubleOrderRisk: level === 'Red' && rng.chance(0.3),
    safetyNote: level === 'Red' ? 'Yoldaki sevkiyat talebi karşılamıyor.' : null,
    recommendedOrderQty: level === 'Red' || level === 'Orange' ? rng.int(30, 200) : 0,
  };
}

function pickLevel(daysRemaining: number | null, risk: number | null): BaseTrackStockWarning['level'] {
  if (daysRemaining === null || risk === null) return 'NoData';
  const { redRiskPct, orangeRiskPct, yellowRiskPct } = DEMO_BASETRACK_SETTINGS;
  if (risk >= redRiskPct) return 'Red';
  if (risk >= orangeRiskPct) return 'Orange';
  if (risk >= yellowRiskPct) return 'Yellow';
  return 'Green';
}

export const DEMO_STOCK_WARNINGS: BaseTrackStockWarning[] = Array.from({ length: WARNING_PRODUCT_COUNT }, (_, index) => warningFor(index))
  .sort((a, b) => (b.stockoutRisk ?? -1) - (a.stockoutRisk ?? -1));

export function warningSummary(items: BaseTrackStockWarning[]): BaseTrackStockWarningSummary {
  const count = (level: BaseTrackStockWarning['level']) => items.filter((item) => item.level === level).length;
  return {
    redCount: count('Red'), orangeCount: count('Orange'), yellowCount: count('Yellow'),
    greenCount: count('Green'), noDataCount: count('NoData'),
    depotShortageCount: items.filter((item) => item.depotShortage > 0).length,
    doubleOrderCount: items.filter((item) => item.doubleOrderRisk).length,
    transitDays: DEMO_BASETRACK_SETTINGS.transitDays, depotLabel: DEMO_BASETRACK_SETTINGS.depotLabel,
  };
}

export const DEMO_DEPOT_ITEMS: BaseTrackDepotItem[] = Array.from({ length: DEPOT_ITEM_COUNT }, (_, index) => {
  const product = DEMO_PRODUCTS[(index * 4 + 1) % DEMO_PRODUCTS.length];
  return { id: index + 1, sku: product.sku, productId: product.id, productName: product.name, quantity: rng.int(5, 220), updatedAt: ago(index % 12) };
});
