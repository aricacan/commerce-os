// Ürün alanı mock'larının ortak kataloğu: data/core.ts'teki ürünlerden türer, SKU'lar birebir aynıdır.
// Araç markaları/modelleri kurgusaldır.
import { ago, createRng } from '../seed';
import { DEMO_PLATFORMS, DEMO_PRODUCTS, DEMO_STORES, type DemoStore } from './core';

const CATALOG_SEED = 70011;
const GBP_TO_TRY = 42;
const PRODUCT_AGE_MAX_DAYS = 420;
const VEHICLE_FREE_CATEGORIES = ['Bakım', 'Elektronik'];
const YEAR_START_MIN = 2012;
const YEAR_START_MAX = 2021;
const YEAR_SPAN_MIN = 3;
const YEAR_SPAN_MAX = 7;
const DESI_BY_CATEGORY: Record<string, number> = {
  Paspas: 4,
  Bagaj: 6,
  'İç Aksesuar': 3,
  Bakım: 1,
  Aydınlatma: 1,
  Elektronik: 1,
  'Dış Aksesuar': 5,
};
const DEFAULT_DESI = 2;
const VAT_RATE = 20;

export const VEHICLE_MODELS: Record<string, string[]> = {
  Aurora: ['Vega', 'Orion', 'Lumen'],
  Kestrel: ['K3', 'K5', 'Ranger X'],
  Veloce: ['Sprint', 'GT Line'],
  Norden: ['N200', 'N400 Estate', 'Fjord'],
  Solara: ['City', 'Crossline'],
};

export interface DemoCategory {
  id: number;
  name: string;
  nameEn: string;
}

const CATEGORY_NAMES_EN: Record<string, string> = {
  Paspas: 'Floor Mats',
  Bagaj: 'Trunk',
  'İç Aksesuar': 'Interior',
  Bakım: 'Care',
  Aydınlatma: 'Lighting',
  Elektronik: 'Electronics',
  'Dış Aksesuar': 'Exterior',
};

export const DEMO_CATEGORIES: DemoCategory[] = [...new Set(DEMO_PRODUCTS.map((product) => product.category))].map(
  (name, index) => ({ id: index + 1, name, nameEn: CATEGORY_NAMES_EN[name] ?? name }),
);

/** Ürünün satıldığı ERP kaynağı = mağaza; kimlikler mağaza sırasına bağlıdır. */
export interface DemoDataSource {
  id: number;
  store: DemoStore;
  erp: 'Sentos' | 'Base';
  displayName: string;
}

export const DEMO_DATA_SOURCES: DemoDataSource[] = DEMO_STORES.map((store, index) => ({
  id: index + 1,
  store,
  erp: store.country === 'UK' ? 'Base' : 'Sentos',
  displayName: store.name,
}));

export const PLATFORMS = DEMO_PLATFORMS.map((name, index) => ({ id: index + 1, name }));

export interface CatalogProduct {
  productId: number;
  sku: string;
  barcode: string;
  name: string;
  /** Araç markası; evrensel ürünlerde null. */
  make: string | null;
  vehicleModel: string | null;
  modelYear: string | null;
  categoryId: number;
  categoryName: string;
  platform: { id: number; name: string };
  price: number;
  cost: number;
  stock: number;
  salesCount: number;
  todayOrderCount: number;
  desi: number;
  vatRate: number;
  createdAt: string;
  sources: DemoDataSource[];
  supplierId: number;
}

const SUPPLIER_COUNT = 8;
const rng = createRng(CATALOG_SEED);

function pickSources(index: number): DemoDataSource[] {
  const primary = DEMO_DATA_SOURCES[index % DEMO_DATA_SOURCES.length];
  const shared = rng.chance(0.3);
  if (!shared) return [primary];
  return [primary, DEMO_DATA_SOURCES[(index + 1) % DEMO_DATA_SOURCES.length]];
}

function pickVehicle(category: string) {
  if (VEHICLE_FREE_CATEGORIES.includes(category) && rng.chance(0.85)) {
    return { make: null, vehicleModel: null, modelYear: null };
  }
  const make = rng.pick(Object.keys(VEHICLE_MODELS));
  const start = rng.int(YEAR_START_MIN, YEAR_START_MAX);
  return {
    make,
    vehicleModel: rng.pick(VEHICLE_MODELS[make]),
    modelYear: `${start}-${start + rng.int(YEAR_SPAN_MIN, YEAR_SPAN_MAX)}`,
  };
}

export const CATALOG_PRODUCTS: CatalogProduct[] = DEMO_PRODUCTS.map((product, index) => {
  const category = DEMO_CATEGORIES.find((item) => item.name === product.category) ?? DEMO_CATEGORIES[0];
  const platform = PLATFORMS[rng.int(0, PLATFORMS.length - 1)];
  return {
    productId: product.id,
    sku: product.sku,
    barcode: `869${String(1000000000 + product.id * 7919).slice(0, 10)}`,
    name: product.name,
    ...pickVehicle(product.category),
    categoryId: category.id,
    categoryName: category.name,
    platform,
    price: product.price,
    cost: product.cost,
    stock: product.stock,
    salesCount: rng.int(0, 320),
    todayOrderCount: rng.chance(0.3) ? rng.int(1, 6) : 0,
    desi: DESI_BY_CATEGORY[product.category] ?? DEFAULT_DESI,
    vatRate: VAT_RATE,
    createdAt: ago(rng.int(3, PRODUCT_AGE_MAX_DAYS)),
    sources: pickSources(index),
    supplierId: (index % SUPPLIER_COUNT) + 1,
  };
});

export function findCatalogProduct(skuOrBarcode: string): CatalogProduct | undefined {
  return CATALOG_PRODUCTS.find((product) => product.sku === skuOrBarcode || product.barcode === skuOrBarcode);
}

/** Ürünün TRY fiyatı; UK kaynakta GBP karşılığı. */
export function priceInCurrency(product: CatalogProduct, source: DemoDataSource): { amount: number; currency: 'TRY' | 'GBP' } {
  if (source.store.currency === 'GBP') return { amount: Number((product.price / GBP_TO_TRY).toFixed(2)), currency: 'GBP' };
  return { amount: product.price, currency: 'TRY' };
}

/** Seçili mağaza kodları tanınıyorsa o mağazalarda bulunan ürünler; aksi halde hepsi. */
export function productsForStores(stores: string[]): CatalogProduct[] {
  const known = stores.filter((code) => DEMO_STORES.some((store) => store.code === code));
  if (known.length === 0) return CATALOG_PRODUCTS;
  return CATALOG_PRODUCTS.filter((product) => product.sources.some((source) => known.includes(source.store.code)));
}

/** Yer tutucu ürün görseli (dış istek yok): SKU yazılı gri SVG. */
export function placeholderImage(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#e5e7eb"/><text x="120" y="126" font-family="sans-serif" font-size="20" fill="#6b7280" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
