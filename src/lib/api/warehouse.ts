'use client';

import { request } from './core';

export interface WmsWarehouse {
  id: number;
  name: string;
  storeId: number | null;
  isActive: boolean;
}

export interface WmsLevelType {
  id: number;
  warehouseId: number;
  order: number;
  name: string;
  codeFormat: 'Number' | 'Letter';
  separator: string;
  holdsStock: boolean;
  isQuarantine: boolean;
}

export interface WmsLocation {
  id: number;
  guid: string;
  warehouseId: number;
  parentId: number | null;
  levelTypeId: number;
  code: string;
  fullCode: string;
  storeId: number | null;
  isActive: boolean;
}

export interface WmsGeometry {
  locationId: number;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotationDeg: number;
}

export interface WmsStructure {
  id: number;
  warehouseId: number;
  type: 'Wall' | 'Separator' | 'Aisle' | 'Door' | 'Column';
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotationDeg: number;
}

export interface WmsLayoutLocation {
  locationId: number;
  fullCode: string;
  levelTypeId: number;
  geometry: WmsGeometry | null;
}

export interface WmsLayout {
  warehouseId: number;
  locations: WmsLayoutLocation[];
  structures: WmsStructure[];
}

export interface WmsLocationStock {
  locationId: number;
  locationFullCode: string;
  productId: number;
  quantity: number;
  reservedQuantity: number;
  minQty: number | null;
}

export interface WmsReturnResult {
  movementId: number;
  locationId: number;
  newQuantity: number;
  isQuarantine: boolean;
}

export interface WmsReplenishmentAlert {
  locationId: number;
  locationFullCode: string;
  productId: number;
  quantity: number;
  minQty: number;
}

export interface WmsSlottingSuggestion {
  productId: number;
  productName: string;
  abcClass: 'A' | 'B' | 'C';
  quantitySold: number;
  locationId: number;
  locationFullCode: string;
  distance: number;
  farThreshold: number;
}

export interface WmsSlottingOverview {
  from: string;
  to: string;
  farThreshold: number;
  totalSuggestions: number;
  suggestions: WmsSlottingSuggestion[];
}

export interface WmsCountScheduleSuggestion {
  locationId: number;
  locationFullCode: string;
  abcClass: 'A' | 'B' | 'C';
  lastCountedAt: string | null;
  overdueDays: number;
}

export interface WmsCountScheduleOverview {
  totalDue: number;
  dueLocations: WmsCountScheduleSuggestion[];
}

export interface WmsUserPickRate {
  userName: string;
  pickCount: number;
  activeHours: number;
  picksPerHour: number;
}

export interface WmsKpiOverview {
  from: string;
  to: string;
  pickRatesByUser: WmsUserPickRate[];
  avgPickingDurationMinutes: number | null;
  completedTaskCount: number;
  countAccuracyPercent: number;
  countedLines: number;
}

export interface WmsBarcodeResolveResult {
  kind: 'Product' | 'Location' | 'Unknown';
  productId: number | null;
  locationId: number | null;
  locationFullCode: string | null;
}

export interface WmsCountSession {
  id: number;
  locationId: number;
  status: 'InProgress' | 'Approved' | 'NoVariance';
  startedByUserName: string;
  hasVariance: boolean;
}

export interface WmsCountLine {
  id: number;
  productId: number;
  countedQuantity: number;
  expectedQuantity: number | null;
}

export interface WmsMovementHistory {
  id: number;
  type: string;
  productId: number;
  quantity: number;
  fromLocationFullCode: string | null;
  toLocationFullCode: string | null;
  userName: string;
  createdAt: string;
}

export interface WmsPendingCountSession {
  id: number;
  locationId: number;
  locationFullCode: string;
  startedByUserName: string;
  startedAt: string;
}

export interface WmsReceivingLine {
  id: number;
  productId: number;
  expectedQuantity: number;
  acceptedQuantity: number;
  status: 'Pending' | 'Accepted' | 'Rejected';
  qualityNote: string | null;
}

export interface WmsReceivingDocument {
  id: number;
  warehouseId: number;
  receivingLocationId: number;
  supplierName: string;
  note: string | null;
  status: 'Open' | 'Completed';
  createdByUserName: string;
  createdAt: string;
  lines: WmsReceivingLine[];
}

export interface WmsPickingLine {
  id: number;
  productId: number;
  requiredQuantity: number;
  pickedQuantity: number;
  fromLocationId: number | null;
  suggestedLocationId: number | null;
  suggestedLocationFullCode: string | null;
  sequenceOrder: number;
  kitGroupKey: string | null;
  kitProductId: number | null;
  status: 'Pending' | 'Picked';
}

export interface WmsKitComponent {
  componentProductId: number;
  quantity: number;
}

export interface WmsProductKit {
  id: number;
  kitProductId: number;
  components: WmsKitComponent[];
}

export interface WmsPickingTask {
  id: number;
  warehouseId: number;
  orderReference: string;
  status: 'InProgress' | 'ReadyToPack' | 'Completed';
  assignedUserName: string;
  createdAt: string;
  waveId: number | null;
  packageSize: 'Small' | 'Medium' | 'Large' | null;
  weightKg: number | null;
  desi: number | null;
  lines: WmsPickingLine[];
}

export interface WmsPickingWaveLine {
  lineId: number;
  taskId: number;
  orderReference: string;
  productId: number;
  requiredQuantity: number;
  pickedQuantity: number;
  suggestedLocationId: number | null;
  suggestedLocationFullCode: string | null;
  sequenceOrder: number;
  status: 'Pending' | 'Picked';
}

export interface WmsPickingWave {
  id: number;
  warehouseId: number;
  status: 'InProgress' | 'Completed';
  createdAt: string;
  lines: WmsPickingWaveLine[];
}

export const warehouseApi = {
  listWarehouses: () => request<WmsWarehouse[]>('/warehouse/warehouses'),
  createWarehouse: (name: string, storeId: number | null) =>
    request<WmsWarehouse>('/warehouse/warehouses', { method: 'POST', body: JSON.stringify({ name, storeId }) }),

  listLevelTypes: (warehouseId: number) => request<WmsLevelType[]>(`/warehouse/warehouses/${warehouseId}/level-types`),
  createLevelType: (warehouseId: number, dto: { order: number; name: string; codeFormat: string; separator: string; holdsStock: boolean; isQuarantine?: boolean }) =>
    request<WmsLevelType>(`/warehouse/warehouses/${warehouseId}/level-types`, { method: 'POST', body: JSON.stringify(dto) }),

  listLocations: (warehouseId: number) => request<WmsLocation[]>(`/warehouse/warehouses/${warehouseId}/locations`),
  createLocation: (warehouseId: number, dto: { warehouseId: number; parentId: number | null; levelTypeId: number; code: string; storeId: number | null }) =>
    request<WmsLocation>(`/warehouse/warehouses/${warehouseId}/locations`, { method: 'POST', body: JSON.stringify(dto) }),

  getLayout: (warehouseId: number) => request<WmsLayout>(`/warehouse/warehouses/${warehouseId}/layout`),
  upsertGeometry: (locationId: number, dto: Omit<WmsGeometry, 'locationId'>) =>
    request<WmsGeometry>(`/warehouse/locations/${locationId}/geometry`, { method: 'PUT', body: JSON.stringify(dto) }),

  createStructure: (warehouseId: number, dto: Omit<WmsStructure, 'id' | 'warehouseId'>) =>
    request<WmsStructure>(`/warehouse/warehouses/${warehouseId}/structures`, { method: 'POST', body: JSON.stringify(dto) }),
  updateStructure: (id: number, dto: Omit<WmsStructure, 'id' | 'warehouseId' | 'type'>) =>
    request<WmsStructure>(`/warehouse/structures/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deleteStructure: (id: number) => request<void>(`/warehouse/structures/${id}`, { method: 'DELETE' }),

  getLocationStock: (locationId: number) => request<WmsLocationStock[]>(`/warehouse/locations/${locationId}/stock`),

  returnStock: (dto: { productId: number; toLocationId: number; quantity: number; userName: string; idempotencyKey: string; note: string | null }) =>
    request<WmsReturnResult>('/warehouse/returns', { method: 'POST', body: JSON.stringify(dto) }),

  resolveBarcode: (rawValue: string) => request<WmsBarcodeResolveResult>('/warehouse/barcodes/resolve', { method: 'POST', body: JSON.stringify(rawValue) }),
  addProductBarcode: (dto: { productId: number; value: string; type: string; isPrimary: boolean; packQuantity: number }) =>
    request<void>('/warehouse/barcodes', { method: 'POST', body: JSON.stringify(dto) }),

  getProductLocations: (productId: number) => request<WmsLocationStock[]>(`/warehouse/products/${productId}/locations`),

  putAway: (dto: { productId: number; toLocationId: number; quantity: number; userName: string; idempotencyKey: string; sourceDocument: string | null }) =>
    request<{ movementId: number; locationId: number; newQuantity: number }>('/warehouse/movements/putaway', { method: 'POST', body: JSON.stringify(dto) }),

  transfer: (dto: { productId: number; fromLocationId: number; toLocationId: number; quantity: number; userName: string; idempotencyKey: string }) =>
    request<{ movementId: number; locationId: number; newQuantity: number }>('/warehouse/movements/transfer', { method: 'POST', body: JSON.stringify(dto) }),

  startCount: (locationId: number, userName: string) =>
    request<WmsCountSession>('/warehouse/counts', { method: 'POST', body: JSON.stringify({ locationId, userName }) }),
  addCountLine: (sessionId: number, dto: { productId: number; countedQuantity: number; varianceReason: string | null }) =>
    request<WmsCountLine>(`/warehouse/counts/${sessionId}/lines`, { method: 'POST', body: JSON.stringify(dto) }),
  approveCount: (sessionId: number, approverUserName: string) =>
    request<WmsCountSession>(`/warehouse/counts/${sessionId}/approve`, { method: 'POST', body: JSON.stringify({ approverUserName }) }),
  cancelCount: (sessionId: number) => request<void>(`/warehouse/counts/${sessionId}/cancel`, { method: 'POST' }),

  getRecentMovements: (warehouseId: number, take = 50) =>
    request<WmsMovementHistory[]>(`/warehouse/warehouses/${warehouseId}/movements?take=${take}`),
  getPendingCounts: (warehouseId: number) =>
    request<WmsPendingCountSession[]>(`/warehouse/warehouses/${warehouseId}/pending-counts`),

  createReceivingDocument: (dto: { warehouseId: number; receivingLocationId: number; supplierName: string; note: string | null; createdByUserName: string }) =>
    request<WmsReceivingDocument>('/warehouse/receiving-documents', { method: 'POST', body: JSON.stringify(dto) }),
  getOpenReceivingDocuments: (warehouseId: number) =>
    request<WmsReceivingDocument[]>(`/warehouse/warehouses/${warehouseId}/receiving-documents`),
  addReceivingLine: (documentId: number, dto: { productId: number; expectedQuantity: number }) =>
    request<WmsReceivingLine>(`/warehouse/receiving-documents/${documentId}/lines`, { method: 'POST', body: JSON.stringify(dto) }),
  acceptReceivingLine: (documentId: number, lineId: number, dto: { acceptedQuantity: number; userName: string; qualityNote: string | null }) =>
    request<WmsReceivingLine>(`/warehouse/receiving-documents/${documentId}/lines/${lineId}/accept`, { method: 'POST', body: JSON.stringify(dto) }),
  rejectReceivingLine: (documentId: number, lineId: number, note: string) =>
    request<WmsReceivingLine>(`/warehouse/receiving-documents/${documentId}/lines/${lineId}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),

  createPickingTask: (dto: { warehouseId: number; orderReference: string; assignedUserName: string }) =>
    request<WmsPickingTask>('/warehouse/picking-tasks', { method: 'POST', body: JSON.stringify(dto) }),
  getOpenPickingTasks: (warehouseId: number) =>
    request<WmsPickingTask[]>(`/warehouse/warehouses/${warehouseId}/picking-tasks`),
  addPickingLine: (taskId: number, dto: { productId: number; requiredQuantity: number }) =>
    request<WmsPickingLine[]>(`/warehouse/picking-tasks/${taskId}/lines`, { method: 'POST', body: JSON.stringify(dto) }),
  pickLine: (taskId: number, lineId: number, dto: { fromLocationId: number; pickedQuantity: number; userName: string }) =>
    request<WmsPickingLine>(`/warehouse/picking-tasks/${taskId}/lines/${lineId}/pick`, { method: 'POST', body: JSON.stringify(dto) }),

  createPickingWave: (dto: { warehouseId: number; taskIds: number[] }) =>
    request<WmsPickingWave>('/warehouse/picking-waves', { method: 'POST', body: JSON.stringify(dto) }),
  getPickingWave: (waveId: number) => request<WmsPickingWave>(`/warehouse/picking-waves/${waveId}`),

  packPickingTask: (taskId: number, dto: { packageSize: 'Small' | 'Medium' | 'Large'; weightKg: number | null; desi: number | null }) =>
    request<WmsPickingTask>(`/warehouse/picking-tasks/${taskId}/pack`, { method: 'POST', body: JSON.stringify(dto) }),

  setMinQty: (locationId: number, productId: number, minQty: number | null) =>
    request<WmsLocationStock>(`/warehouse/locations/${locationId}/stock/${productId}/min-qty`, { method: 'PUT', body: JSON.stringify({ minQty }) }),
  getReplenishmentAlerts: (warehouseId: number) =>
    request<WmsReplenishmentAlert[]>(`/warehouse/warehouses/${warehouseId}/replenishment-alerts`),

  getSlottingSuggestions: (warehouseId: number) =>
    request<WmsSlottingOverview>(`/warehouse/warehouses/${warehouseId}/slotting/suggestions`),

  createProductKit: (dto: { kitProductId: number; components: WmsKitComponent[] }) =>
    request<WmsProductKit>('/warehouse/product-kits', { method: 'POST', body: JSON.stringify(dto) }),
  listProductKits: () => request<WmsProductKit[]>('/warehouse/product-kits'),
  deleteProductKit: (id: number) => request<void>(`/warehouse/product-kits/${id}`, { method: 'DELETE' }),

  getCountScheduleDue: (warehouseId: number) =>
    request<WmsCountScheduleOverview>(`/warehouse/warehouses/${warehouseId}/count-schedule/due`),

  getKpiOverview: (warehouseId: number) =>
    request<WmsKpiOverview>(`/warehouse/warehouses/${warehouseId}/kpi/overview`),
};
