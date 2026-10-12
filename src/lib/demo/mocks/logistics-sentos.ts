// Sentos Hub: iki hesabın (kodlar arayüzle sabit: storea / storeb) stok takibi, potansiyel stok ve uyarılar.
import type {
  PotentialStockItem, PotentialStockMovement, SentosStockItem, SentosStore, SentosTrackOverview,
  SentosTrackSettings, StockWarning, StockWarningSummary,
} from '../../api/sentostrack';
import { DEMO_PRODUCTS } from '../data/core';
import { ago, createRng, matchesSearch } from '../seed';
import { get, type DemoRoute } from '../router';

const rng = createRng(9916);

const STORES: SentosStore[] = [
  { code: 'storea', displayName: 'Mağaza A (Sentos)' },
  { code: 'storeb', displayName: 'Mağaza B (Sentos)' },
];
const ITEMS_PER_STORE = 34;
const BASELINE_RANGE: [number, number] = [60, 600];
const DEFAULT_STORE = STORES[0].code;
const SETTINGS: SentosTrackSettings = { orangeThreshold: 25, yellowThreshold: 60, depletionDaysThreshold: 14 };
const SYNC_MINUTES_AGO = 18;

const displayNameOf = (code: string): string => STORES.find((store) => store.code === code)?.displayName ?? code;

function levelOf(remaining: number): StockWarning['level'] {
  if (remaining <= 0) return 'red';
  if (remaining < SETTINGS.orangeThreshold) return 'orange';
  if (remaining < SETTINGS.yellowThreshold) return 'yellow';
  return 'green';
}

function buildPotential(store: string, storeIndex: number): PotentialStockItem[] {
  return Array.from({ length: ITEMS_PER_STORE }, (_, index) => {
    const product = DEMO_PRODUCTS[(index * 3 + storeIndex * 17) % DEMO_PRODUCTS.length];
    const baselineQty = rng.int(BASELINE_RANGE[0], BASELINE_RANGE[1]);
    // Her dokuzuncu kalem baseline'ı aşmış (kırmızı) olsun.
    const consumedQty = index % 9 === 0 ? baselineQty + 5 : Math.round(baselineQty * rng.float(0.1, 0.95));
    return {
      id: storeIndex * 1000 + index + 1, storeCode: store, sku: product.sku, productName: product.name,
      baselineQty, consumedQty, remainingQty: baselineQty - consumedQty,
      baselineAtUtc: ago(30), updatedAtUtc: ago(0, index % 10),
    };
  });
}

const POTENTIAL: Record<string, PotentialStockItem[]> = Object.fromEntries(
  STORES.map((store, index) => [store.code, buildPotential(store.code, index)]),
);

const potentialOf = (store: string | null): PotentialStockItem[] => POTENTIAL[store ?? DEFAULT_STORE] ?? [];

function warningOf(item: PotentialStockItem): StockWarning {
  const daily = item.consumedQty > 0 ? Number((item.consumedQty / 30).toFixed(2)) : null;
  const days = daily && item.remainingQty > 0 ? Math.round(item.remainingQty / daily) : null;
  return {
    storeCode: item.storeCode, storeDisplayName: displayNameOf(item.storeCode), sku: item.sku,
    productName: item.productName, baselineQty: item.baselineQty, orderedQty: item.consumedQty,
    remainingQty: item.remainingQty, shortageQty: Math.max(0, item.consumedQty - item.baselineQty),
    level: levelOf(item.remainingQty), lastOrderAtUtc: ago(0, item.id % 48),
    dailyConsumptionRate: daily, daysUntilStockout: days,
    isDepletionRisk: item.remainingQty > 0 && days !== null && days <= SETTINGS.depletionDaysThreshold,
  };
}

function warnings(query: URLSearchParams) {
  const store = query.get('store');
  const level = query.get('level');
  const pool = (store ? potentialOf(store) : STORES.flatMap((item) => potentialOf(item.code))).map(warningOf);
  const count = (target: StockWarning['level']) => pool.filter((item) => item.level === target).length;
  const summary: StockWarningSummary = {
    red: count('red'), orange: count('orange'), yellow: count('yellow'), green: count('green'),
    totalShortage: pool.reduce((total, item) => total + item.shortageQty, 0),
    itemCount: pool.length, lastCheckedAtUtc: ago(0, 0, SYNC_MINUTES_AGO),
  };
  return { summary, items: pool.filter((item) => !level || item.level === level) };
}

function overview(): SentosTrackOverview[] {
  return STORES.map((store) => {
    const pool = potentialOf(store.code).map(warningOf);
    return {
      storeCode: store.code, storeDisplayName: store.displayName,
      potentialSkuCount: pool.length, sentosSkuCount: pool.length + 120,
      warningRed: pool.filter((item) => item.level === 'red').length,
      warningOrange: pool.filter((item) => item.level === 'orange').length,
      totalShortage: pool.reduce((total, item) => total + item.shortageQty, 0),
      lastUploadAtUtc: ago(30), lastConsumptionAtUtc: ago(0, 0, SYNC_MINUTES_AGO),
    };
  });
}

function sentosStock(query: URLSearchParams): SentosStockItem[] {
  const store = query.get('store');
  const startIndex = store === STORES[1].code ? 40 : 0;
  return DEMO_PRODUCTS.slice(startIndex, startIndex + 70)
    .map((product) => ({ sku: product.sku, productName: product.name, qty: product.stock, syncedAtUtc: ago(0, 0, SYNC_MINUTES_AGO) }))
    .filter((item) => matchesSearch(item, query.get('search'), ['sku', 'productName']));
}

function movements(id: string): PotentialStockMovement[] {
  const base = Number(id) % 50;
  return [
    { id: 1, source: 'excel', qtyDelta: 300, remainingAfter: 300 + base, note: 'Excel yükleme (baseline)', createdBy: 'depo1@example.com', createdAtUtc: ago(30) },
    { id: 2, source: 'order', qtyDelta: -40, remainingAfter: 260 + base, note: 'Sipariş düşümü', createdBy: null, createdAtUtc: ago(14) },
    { id: 3, source: 'manual', qtyDelta: -12, remainingAfter: 248 + base, note: 'Hasarlı ürün düzeltmesi', createdBy: 'depo2@example.com', createdAtUtc: ago(3) },
  ];
}

export const logisticsSentosRoutes: DemoRoute[] = [
  get('/sentostrack/stores', () => STORES),
  get('/sentostrack/overview', () => overview()),
  get('/sentostrack/warnings', (req) => warnings(req.query)),
  get('/sentostrack/sentos-stock', (req) => sentosStock(req.query)),
  get('/sentostrack/potential-stock/:id/movements', (req) => movements(req.params.id)),
  get('/sentostrack/potential-stock', (req) => potentialOf(req.query.get('store'))
    .filter((item) => matchesSearch(item, req.query.get('search'), ['sku', 'productName']))),
  get('/sentostrack/settings', () => SETTINGS),
];
