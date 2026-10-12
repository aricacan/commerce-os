// Kurgusal depo: koridorlar, raflar (3D/2D koordinatlı), yapı öğeleri ve raf stokları.
// Koordinatlar editör ızgarasıyla (800x800, hücre 40) uyumludur; 3D görünüm bunu 20'ye böler.
import type {
  WmsLayout, WmsLayoutLocation, WmsLevelType, WmsLocation, WmsLocationStock,
  WmsStructure, WmsWarehouse,
} from '../../api/warehouse';
import { createRng } from '../seed';
import { DEMO_PRODUCTS } from './core';

export const DEMO_WAREHOUSE_ID = 1;

const AISLES = ['A', 'B', 'C'] as const;
const SHELVES_PER_AISLE = 7;
const SHELF_WIDTH = 80;
const SHELF_DEPTH = 40;
const SHELF_HEIGHT = 80;
const SHELF_START_X = 80;
const SHELF_STEP_X = 100;
const AISLE_ROW_Y = [100, 220, 340];
const MAX_PRODUCTS_PER_SHELF = 4;
const MIN_PRODUCTS_PER_SHELF = 2;
const STOCK_RANGE: [number, number] = [6, 140];
const RESERVED_RATIO = 0.25;
const MIN_QTY_RANGE: [number, number] = [4, 20];
const MIN_QTY_PROBABILITY = 0.6;
const WALL_THICKNESS = 20;
const WALL_HEIGHT_UNITS = 200;

const rng = createRng(4402);

export const DEMO_WAREHOUSES: WmsWarehouse[] = [
  { id: DEMO_WAREHOUSE_ID, name: 'Demo Ana Depo', storeId: null, isActive: true },
];

const levelType = (id: number, order: number, name: string, extra: Partial<WmsLevelType>): WmsLevelType => ({
  id, warehouseId: DEMO_WAREHOUSE_ID, order, name, codeFormat: 'Number', separator: '-',
  holdsStock: true, isQuarantine: false, ...extra,
});

export const DEMO_LEVEL_TYPES: WmsLevelType[] = [
  levelType(1, 1, 'Koridor', { codeFormat: 'Letter', holdsStock: false }),
  levelType(2, 2, 'Raf', {}),
  levelType(3, 3, 'Mal Kabul Alanı', {}),
  levelType(4, 3, 'Karantina', { isQuarantine: true }),
];

interface PlacedLocation {
  location: WmsLocation;
  layout: WmsLayoutLocation;
}

let nextLocationId = 1;

function place(
  levelTypeId: number, parentId: number | null, code: string, fullCode: string,
  rect: { x: number; y: number; width: number; depth: number } | null,
): PlacedLocation {
  const id = nextLocationId++;
  return {
    location: {
      id, guid: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
      warehouseId: DEMO_WAREHOUSE_ID, parentId, levelTypeId, code, fullCode, storeId: null, isActive: true,
    },
    layout: {
      locationId: id, fullCode, levelTypeId,
      geometry: rect && { locationId: id, ...rect, z: 0, height: SHELF_HEIGHT, rotationDeg: 0 },
    },
  };
}

function buildPlacements(): PlacedLocation[] {
  const placements: PlacedLocation[] = [];
  AISLES.forEach((aisle, aisleIndex) => {
    const aisleLocation = place(1, null, aisle, aisle, null);
    placements.push(aisleLocation);
    for (let shelf = 1; shelf <= SHELVES_PER_AISLE; shelf += 1) {
      const code = String(shelf).padStart(2, '0');
      placements.push(place(2, aisleLocation.location.id, code, `${aisle}-${code}`, {
        x: SHELF_START_X + (shelf - 1) * SHELF_STEP_X,
        y: AISLE_ROW_Y[aisleIndex],
        width: SHELF_WIDTH,
        depth: SHELF_DEPTH,
      }));
    }
  });
  placements.push(place(3, null, '01', 'MK-01', { x: 80, y: 420, width: 160, depth: SHELF_DEPTH }));
  placements.push(place(4, null, '01', 'KRN-01', { x: 560, y: 420, width: 120, depth: SHELF_DEPTH }));
  return placements;
}

const PLACEMENTS = buildPlacements();

export const DEMO_LOCATIONS: WmsLocation[] = PLACEMENTS.map((placed) => placed.location);

const structure = (
  id: number, type: WmsStructure['type'], x: number, y: number, width: number, depth: number,
): WmsStructure => ({
  id, warehouseId: DEMO_WAREHOUSE_ID, type, x, y, z: 0, width, depth, height: WALL_HEIGHT_UNITS, rotationDeg: 0,
});

const STRUCTURES: WmsStructure[] = [
  structure(1, 'Wall', 40, 40, 720, WALL_THICKNESS),
  structure(2, 'Wall', 40, 60, WALL_THICKNESS, 420),
  structure(3, 'Wall', 740, 60, WALL_THICKNESS, 420),
  structure(4, 'Wall', 40, 480, 320, WALL_THICKNESS),
  structure(5, 'Door', 360, 480, 80, WALL_THICKNESS),
  structure(6, 'Wall', 440, 480, 320, WALL_THICKNESS),
  structure(7, 'Aisle', 80, 140, 640, 80),
  structure(8, 'Aisle', 80, 260, 640, 80),
  structure(9, 'Separator', 400, 400, 20, 80),
];

export const DEMO_LAYOUT: WmsLayout = {
  warehouseId: DEMO_WAREHOUSE_ID,
  locations: PLACEMENTS.map((placed) => placed.layout),
  structures: STRUCTURES,
};

const stockLocations = DEMO_LOCATIONS.filter((location) => location.levelTypeId === 2);

function buildStock(): WmsLocationStock[] {
  const rows: WmsLocationStock[] = [];
  stockLocations.forEach((location) => {
    const count = rng.int(MIN_PRODUCTS_PER_SHELF, MAX_PRODUCTS_PER_SHELF);
    const used = new Set<number>();
    while (used.size < count) used.add(rng.pick(DEMO_PRODUCTS).id);
    used.forEach((productId) => {
      const quantity = rng.int(STOCK_RANGE[0], STOCK_RANGE[1]);
      rows.push({
        locationId: location.id,
        locationFullCode: location.fullCode,
        productId,
        quantity,
        reservedQuantity: Math.floor(quantity * RESERVED_RATIO * rng.next()),
        minQty: rng.chance(MIN_QTY_PROBABILITY) ? rng.int(MIN_QTY_RANGE[0], MIN_QTY_RANGE[1]) : null,
      });
    });
  });
  return rows;
}

export const DEMO_LOCATION_STOCK: WmsLocationStock[] = buildStock();
