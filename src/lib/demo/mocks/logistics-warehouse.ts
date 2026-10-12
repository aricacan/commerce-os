// WMS: depo, raf yerleşimi (3D), stok sorgusu, mal kabul, toplama, yönetim ve ERP mutabakatı.
import type { WmsBarcodeResolveResult } from '../../api/warehouse';
import { DEMO_PRODUCTS } from '../data/core';
import {
  DEMO_LAYOUT, DEMO_LEVEL_TYPES, DEMO_LOCATIONS, DEMO_LOCATION_STOCK, DEMO_WAREHOUSES,
} from '../data/logistics-warehouse';
import {
  DEMO_COUNT_SCHEDULE, DEMO_KITS, DEMO_KPI, DEMO_MOVEMENTS, DEMO_PENDING_COUNTS,
  DEMO_PICKING_TASKS, DEMO_PICKING_WAVE, DEMO_RECEIVING_DOCUMENTS, DEMO_RECONCILIATION,
  DEMO_REPLENISHMENT, DEMO_SLOTTING,
} from '../data/logistics-warehouse-ops';
import { get, post, type DemoRoute } from '../router';

const DEFAULT_MOVEMENT_TAKE = 50;

// Okutulan değer raf kodu ya da ürün SKU'su/kimliği olabilir; ikisi de değilse bilinmeyen döner.
function resolveBarcode(raw: unknown): WmsBarcodeResolveResult {
  const value = typeof raw === 'string' ? raw.trim() : '';
  const location = DEMO_LOCATIONS.find((item) => item.fullCode.toLowerCase() === value.toLowerCase());
  if (location) return { kind: 'Location', productId: null, locationId: location.id, locationFullCode: location.fullCode };
  const product = DEMO_PRODUCTS.find((item) => item.sku.toLowerCase() === value.toLowerCase() || String(item.id) === value);
  if (product) return { kind: 'Product', productId: product.id, locationId: null, locationFullCode: null };
  return { kind: 'Unknown', productId: null, locationId: null, locationFullCode: null };
}

export const logisticsWarehouseRoutes: DemoRoute[] = [
  get('/warehouse/warehouses', () => DEMO_WAREHOUSES),
  get('/warehouse/warehouses/:id/level-types', () => DEMO_LEVEL_TYPES),
  get('/warehouse/warehouses/:id/locations', () => DEMO_LOCATIONS),
  get('/warehouse/warehouses/:id/layout', () => DEMO_LAYOUT),
  get('/warehouse/warehouses/:id/movements', (req) =>
    DEMO_MOVEMENTS.slice(0, Number(req.query.get('take') ?? DEFAULT_MOVEMENT_TAKE))),
  get('/warehouse/warehouses/:id/pending-counts', () => DEMO_PENDING_COUNTS),
  get('/warehouse/warehouses/:id/receiving-documents', () => DEMO_RECEIVING_DOCUMENTS),
  get('/warehouse/warehouses/:id/picking-tasks', () => DEMO_PICKING_TASKS),
  get('/warehouse/warehouses/:id/replenishment-alerts', () => DEMO_REPLENISHMENT),
  get('/warehouse/warehouses/:id/slotting/suggestions', () => DEMO_SLOTTING),
  get('/warehouse/warehouses/:id/count-schedule/due', () => DEMO_COUNT_SCHEDULE),
  get('/warehouse/warehouses/:id/kpi/overview', () => DEMO_KPI),
  get('/warehouse/locations/:id/stock', (req) =>
    DEMO_LOCATION_STOCK.filter((stock) => stock.locationId === Number(req.params.id))),
  get('/warehouse/products/:id/locations', (req) =>
    DEMO_LOCATION_STOCK.filter((stock) => stock.productId === Number(req.params.id))),
  get('/warehouse/picking-waves/:id', () => DEMO_PICKING_WAVE),
  get('/warehouse/product-kits', () => DEMO_KITS),
  post('/warehouse/barcodes/resolve', (req) => resolveBarcode(req.body)),
  get('/stock-reconciliation/overview', () => DEMO_RECONCILIATION),
];
