// Depo operasyon verisi: hareketler, mal kabul, toplama, sayım, yerleşim önerileri ve KPI.
import type {
  WmsCountScheduleOverview, WmsKpiOverview, WmsMovementHistory, WmsPendingCountSession,
  WmsPickingLine, WmsPickingTask, WmsPickingWave, WmsProductKit, WmsReceivingDocument,
  WmsReplenishmentAlert, WmsSlottingOverview,
} from '../../api/warehouse';
import type { StockReconciliationOverview } from '../../api/stock-reconciliation';
import { ago, createRng, dayAgo } from '../seed';
import { DEMO_PRODUCTS } from './core';
import { DEMO_LOCATIONS, DEMO_LOCATION_STOCK, DEMO_WAREHOUSE_ID } from './logistics-warehouse';

const rng = createRng(5513);

const OPERATORS = ['depo1@example.com', 'depo2@example.com', 'depo3@example.com'];
const MOVEMENT_COUNT = 36;
const MOVEMENT_TYPES = ['PutAway', 'Transfer', 'Pick', 'Receive', 'CountAdjust', 'Return'];
const SLOTTING_FAR_THRESHOLD = 20;
const SLOTTING_SUGGESTION_COUNT = 7;
const REPLENISHMENT_LIMIT = 8;
const RECONCILIATION_ROWS = 10;
const KPI_WINDOW_DAYS = 30;

const productName = (productId: number): string =>
  DEMO_PRODUCTS.find((product) => product.id === productId)?.name ?? `Ürün #${productId}`;

const locationOf = (productId: number) => {
  const row = DEMO_LOCATION_STOCK.find((stock) => stock.productId === productId) ?? DEMO_LOCATION_STOCK[0];
  return { id: row.locationId, fullCode: row.locationFullCode };
};

export const DEMO_MOVEMENTS: WmsMovementHistory[] = Array.from({ length: MOVEMENT_COUNT }, (_, index) => {
  const stock = rng.pick(DEMO_LOCATION_STOCK);
  const other = rng.pick(DEMO_LOCATIONS);
  const type = rng.pick(MOVEMENT_TYPES);
  const isTransfer = type === 'Transfer';
  return {
    id: 900 - index,
    type,
    productId: stock.productId,
    quantity: rng.int(1, 24),
    fromLocationFullCode: isTransfer || type === 'Pick' ? stock.locationFullCode : null,
    toLocationFullCode: isTransfer ? other.fullCode : type === 'Pick' ? null : stock.locationFullCode,
    userName: rng.pick(OPERATORS),
    createdAt: ago(0, index * 3 + rng.int(0, 2), rng.int(0, 59)),
  };
});

export const DEMO_PENDING_COUNTS: WmsPendingCountSession[] = [
  { id: 41, locationId: 6, locationFullCode: 'A-03', startedByUserName: OPERATORS[0], startedAt: ago(0, 5) },
  { id: 42, locationId: 14, locationFullCode: 'B-04', startedByUserName: OPERATORS[1], startedAt: ago(1, 2) },
];

export const DEMO_RECEIVING_DOCUMENTS: WmsReceivingDocument[] = [
  {
    id: 301, warehouseId: DEMO_WAREHOUSE_ID, receivingLocationId: 25, supplierName: 'Örnek Tedarik A.Ş.',
    note: 'Sabah sevkiyatı', status: 'Open', createdByUserName: OPERATORS[0], createdAt: ago(0, 4),
    lines: [
      { id: 1, productId: 3, expectedQuantity: 60, acceptedQuantity: 60, status: 'Accepted', qualityNote: null },
      { id: 2, productId: 8, expectedQuantity: 120, acceptedQuantity: 0, status: 'Pending', qualityNote: null },
      { id: 3, productId: 14, expectedQuantity: 40, acceptedQuantity: 0, status: 'Pending', qualityNote: null },
    ],
  },
  {
    id: 302, warehouseId: DEMO_WAREHOUSE_ID, receivingLocationId: 25, supplierName: 'Demo Toptan Ltd.',
    note: null, status: 'Open', createdByUserName: OPERATORS[1], createdAt: ago(1, 3),
    lines: [
      { id: 4, productId: 21, expectedQuantity: 24, acceptedQuantity: 22, status: 'Accepted', qualityNote: '2 adet hasarlı kutu' },
      { id: 5, productId: 33, expectedQuantity: 80, acceptedQuantity: 0, status: 'Pending', qualityNote: null },
    ],
  },
];

function pickingLine(id: number, productId: number, required: number, picked: number, sequence: number): WmsPickingLine {
  const location = locationOf(productId);
  return {
    id, productId, requiredQuantity: required, pickedQuantity: picked,
    fromLocationId: picked > 0 ? location.id : null,
    suggestedLocationId: location.id, suggestedLocationFullCode: location.fullCode,
    sequenceOrder: sequence, kitGroupKey: null, kitProductId: null,
    status: picked >= required ? 'Picked' : 'Pending',
  };
}

const task = (id: number, orderReference: string, status: WmsPickingTask['status'], hoursAgo: number, lines: WmsPickingLine[], extra: Partial<WmsPickingTask> = {}): WmsPickingTask => ({
  id, warehouseId: DEMO_WAREHOUSE_ID, orderReference, status, assignedUserName: OPERATORS[id % OPERATORS.length],
  createdAt: ago(0, hoursAgo), waveId: null, packageSize: null, weightKg: null, desi: null, lines, ...extra,
});

export const DEMO_PICKING_TASKS: WmsPickingTask[] = [
  task(11, 'DM-240026', 'InProgress', 2, [pickingLine(111, 5, 2, 1, 1), pickingLine(112, 9, 1, 0, 2)]),
  task(12, 'DM-240039', 'InProgress', 3, [pickingLine(121, 17, 3, 0, 1), pickingLine(122, 2, 1, 0, 2), pickingLine(123, 30, 2, 0, 3)]),
  task(13, 'DM-240052', 'ReadyToPack', 5, [pickingLine(131, 12, 1, 1, 1), pickingLine(132, 44, 2, 2, 2)]),
  task(14, 'DM-240065', 'InProgress', 1, [pickingLine(141, 6, 4, 2, 1)]),
];

export const DEMO_PICKING_WAVE: WmsPickingWave = {
  id: 1, warehouseId: DEMO_WAREHOUSE_ID, status: 'InProgress', createdAt: ago(0, 2),
  lines: DEMO_PICKING_TASKS.slice(0, 2).flatMap((pickingTask) => pickingTask.lines.map((line) => ({
    lineId: line.id, taskId: pickingTask.id, orderReference: pickingTask.orderReference,
    productId: line.productId, requiredQuantity: line.requiredQuantity, pickedQuantity: line.pickedQuantity,
    suggestedLocationId: line.suggestedLocationId, suggestedLocationFullCode: line.suggestedLocationFullCode,
    sequenceOrder: line.sequenceOrder, status: line.status,
  }))),
};

export const DEMO_KITS: WmsProductKit[] = [
  { id: 1, kitProductId: 25, components: [{ componentProductId: 2, quantity: 1 }, { componentProductId: 7, quantity: 2 }] },
  { id: 2, kitProductId: 61, components: [{ componentProductId: 4, quantity: 1 }, { componentProductId: 11, quantity: 1 }, { componentProductId: 15, quantity: 4 }] },
];

export const DEMO_REPLENISHMENT: WmsReplenishmentAlert[] = DEMO_LOCATION_STOCK
  .filter((stock) => stock.minQty !== null && stock.quantity <= stock.minQty + 10)
  .slice(0, REPLENISHMENT_LIMIT)
  .map((stock) => ({
    locationId: stock.locationId, locationFullCode: stock.locationFullCode,
    productId: stock.productId, quantity: Math.min(stock.quantity, stock.minQty ?? stock.quantity), minQty: stock.minQty ?? 0,
  }));

const slottingRows = DEMO_LOCATION_STOCK.slice(0, SLOTTING_SUGGESTION_COUNT);

export const DEMO_SLOTTING: WmsSlottingOverview = {
  from: dayAgo(KPI_WINDOW_DAYS), to: dayAgo(0), farThreshold: SLOTTING_FAR_THRESHOLD,
  totalSuggestions: slottingRows.length,
  suggestions: slottingRows.map((stock, index) => ({
    productId: stock.productId, productName: productName(stock.productId),
    abcClass: index < 4 ? 'A' : 'B', quantitySold: 180 - index * 17,
    locationId: stock.locationId, locationFullCode: stock.locationFullCode,
    distance: 24.5 + index * 3.2, farThreshold: SLOTTING_FAR_THRESHOLD,
  })),
};

export const DEMO_COUNT_SCHEDULE: WmsCountScheduleOverview = {
  totalDue: 4,
  dueLocations: DEMO_LOCATION_STOCK.slice(0, 4).map((stock, index) => ({
    locationId: stock.locationId, locationFullCode: stock.locationFullCode,
    abcClass: index < 2 ? 'A' : 'B', lastCountedAt: index === 3 ? null : ago(40 + index * 9), overdueDays: 12 + index * 6,
  })),
};

export const DEMO_KPI: WmsKpiOverview = {
  from: dayAgo(KPI_WINDOW_DAYS), to: dayAgo(0),
  pickRatesByUser: OPERATORS.map((userName, index) => ({
    userName, pickCount: 410 - index * 55, activeHours: 38 - index * 4, picksPerHour: Number(((410 - index * 55) / (38 - index * 4)).toFixed(1)),
  })),
  avgPickingDurationMinutes: 7.4,
  completedTaskCount: 286,
  countAccuracyPercent: 98.6,
  countedLines: 342,
};

export const DEMO_RECONCILIATION: StockReconciliationOverview = (() => {
  const rows = DEMO_PRODUCTS.slice(0, RECONCILIATION_ROWS).map((product, index) => {
    const difference = (index % 2 === 0 ? 1 : -1) * (2 + index);
    return {
      id: product.id, name: product.name, supplierSKU: product.sku, storeId: 1,
      erpStock: product.stock, physicalStock: product.stock - difference, difference,
    };
  });
  return { totalMismatches: rows.length, rows };
})();
