// Erpis mock verisi: kurgusal bir üretici firmanın stok kartları ve sipariş kalemleri.
// Marka/model adları kurgusaldır; filtre ayrıştırma ve toplama yardımcıları da burada.
import type { ErpisCompany, ErpisCurrencyTotal } from '../../api/erpis';
import type { ErpisItem, ErpisOrderLine } from '../../api/erpis-query';
import { createRng, dayAgo } from '../seed';
import { GBP_TRY_RATE, round2 } from './finance-base';

const ITEM_COUNT = 72;
const ORDER_COUNT = 90;
const MAX_LINES_PER_ORDER = 4;
const ORDER_AGE_RANGE_DAYS = 360;
const CLOSED_AFTER_DAYS = 45;
const MIN_DELIVERY_DAYS = 25;
const MAX_DELIVERY_DAYS = 70;

export const COMPANY_A_ID = 1;
export const COMPANY_B_ID = 2;

export const ERPIS_COMPANIES: ErpisCompany[] = [
  { id: COMPANY_A_ID, name: 'Demo Üretim A.Ş.', code: 'DEMO-A', billingEntityId: 1, isActive: true, sortOrder: 1, uploadCount: 14 },
  { id: COMPANY_B_ID, name: 'Demo Levha Sanayi Ltd.', code: 'DEMO-B', billingEntityId: null, isActive: true, sortOrder: 2, uploadCount: 6 },
];

/** TL karşılığı için sabit demo kurları. */
export const TRY_RATES: Record<string, number> = { TRY: 1, TL: 1, EUR: 38.4, USD: 35.2, GBP: GBP_TRY_RATE };

const BRANDS = ['Aurora', 'Valtera', 'Norden', 'Kestrel', 'Solano'];
const MODELS_BY_BRAND: Record<string, string[]> = {
  Aurora: ['Sport', 'City'], Valtera: ['Kombi', 'Sedan'], Norden: ['Cross', 'Van'], Kestrel: ['Pickup', 'Hatch'], Solano: ['Coupe', 'Estate'],
};
const PRODUCT_TYPES = ['Paspas', 'Bagaj Havuzu', 'Çamurluk Kaplama', 'Kapı Kaplama', 'Tavan Çıtası', 'Koltuk Kılıfı'];
const COLORS = ['Siyah', 'Gri', 'Bej'];
const ERP_CATEGORIES = [
  { id: 1, name: 'Mamul' }, { id: 2, name: 'Yarı Mamul' }, { id: 3, name: 'Hammadde' }, { id: 4, name: 'Sarf Malzeme' },
];
const ITEM_KINDS = ['Ürün', 'Ambalaj', 'Levha'];

export interface DemoParty {
  id: number;
  name: string;
  country: string;
  currency: string;
}

export const ERPIS_PARTIES: DemoParty[] = [
  { id: 1, name: 'Güneş Oto Yedek Parça', country: 'Türkiye', currency: 'TRY' },
  { id: 2, name: 'Marmara Aksesuar Ticaret', country: 'Türkiye', currency: 'TRY' },
  { id: 3, name: 'Anadolu Oto Market', country: 'Türkiye', currency: 'TRY' },
  { id: 4, name: 'Ege Araç Donanım', country: 'Türkiye', currency: 'TRY' },
  { id: 5, name: 'Nordic Fitting GmbH', country: 'Almanya', currency: 'EUR' },
  { id: 6, name: 'Atelier Auto SARL', country: 'Fransa', currency: 'EUR' },
  { id: 7, name: 'Polska Motor Parts Sp.', country: 'Polonya', currency: 'EUR' },
  { id: 8, name: 'Gulf Car Care Trading', country: 'Birleşik Arap Emirlikleri', currency: 'USD' },
  { id: 9, name: 'Iberia Accesorios SL', country: 'İspanya', currency: 'EUR' },
  { id: 10, name: 'Karadeniz Oto Pazarı', country: 'Türkiye', currency: 'TRY' },
];

export interface ErpisLineRecord extends ErpisOrderLine {
  companyId: number;
  itemKind: string;
  seg1: string | null;
  seg2: string | null;
  seg3: string | null;
  categoryName: string | null;
}

export interface ErpisItemRecord extends ErpisItem {
  companyId: number;
  stockOnHand: number;
}

function buildItems(): ErpisItemRecord[] {
  const rng = createRng(4242);
  return Array.from({ length: ITEM_COUNT }, (_, index) => {
    const brand = BRANDS[index % BRANDS.length];
    const model = MODELS_BY_BRAND[brand][index % 2];
    const productType = PRODUCT_TYPES[index % PRODUCT_TYPES.length];
    const yearFrom = 2010 + (index % 10);
    const kind = index % 11 === 0 ? ITEM_KINDS[1] : index % 13 === 0 ? ITEM_KINDS[2] : ITEM_KINDS[0];
    const category = ERP_CATEGORIES[index % 2];
    const seg1 = `A${String(10 + (index % 5))}`;
    const seg2 = String(1000 + index * 7);
    const seg3 = COLORS[index % COLORS.length].slice(0, 2).toUpperCase();
    return {
      id: index + 1, sku: `${seg1}-${seg2}-${seg3}`, skuKind: 'Standart', seg1, seg2, seg3, itemKind: kind,
      name: `${brand} ${model} ${productType} ${COLORS[index % COLORS.length]}`, name2: null,
      brand, model, yearFrom, yearTo: yearFrom + rng.int(3, 8), yearText: null, productType,
      color: COLORS[index % COLORS.length], material: index % 2 === 0 ? 'TPE' : 'PVC', variant: null, side: null,
      categoryId: category.id, categoryName: category.name, ean: null,
      registeredAt: dayAgo(rng.int(60, 900)), isActive: true,
      parseConfidence: round2(rng.float(0.72, 0.99)), parseSource: index % 9 === 0 ? 'Manual' : 'Auto',
      companyId: index % 3 === 2 ? COMPANY_B_ID : COMPANY_A_ID,
      stockOnHand: rng.int(0, 420),
    };
  });
}

export const ERPIS_ITEMS: ErpisItemRecord[] = buildItems();

function buildLines(): ErpisLineRecord[] {
  const rng = createRng(9001);
  const lines: ErpisLineRecord[] = [];
  for (let orderIndex = 0; orderIndex < ORDER_COUNT; orderIndex += 1) {
    const party = ERPIS_PARTIES[orderIndex % ERPIS_PARTIES.length];
    const age = Math.floor((orderIndex / ORDER_COUNT) * ORDER_AGE_RANGE_DAYS) + rng.int(0, 3);
    const orderDate = dayAgo(age);
    const deliveryDate = dayAgo(age - rng.int(MIN_DELIVERY_DAYS, MAX_DELIVERY_DAYS));
    const closed = age > CLOSED_AFTER_DAYS;
    const lineCount = rng.int(1, MAX_LINES_PER_ORDER);
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const item = ERPIS_ITEMS[rng.int(0, ERPIS_ITEMS.length - 1)];
      const orderedQty = rng.int(2, 40) * 10;
      const shippedQty = closed ? orderedQty : rng.chance(0.35) ? Math.round(orderedQty * rng.float(0.2, 0.7)) : 0;
      const unitPrice = round2((party.currency === 'TRY' ? rng.float(180, 1400) : rng.float(6, 42)));
      lines.push({
        id: lines.length + 1, orderId: orderIndex + 1, orderNo: `SP-2026-${String(1000 + orderIndex)}`,
        orderDate, deliveryDate, partyName: party.name, partyId: party.id, countryName: party.country,
        itemId: item.id, sku: item.sku, itemName: item.name, brand: item.brand, model: item.model,
        yearFrom: item.yearFrom, yearTo: item.yearTo, productType: item.productType,
        orderedQty, shippedQty, remainingQty: orderedQty - shippedQty, unit: 'Adet', unitPrice,
        netAmount: round2(unitPrice * orderedQty), currency: party.currency, isClosed: closed,
        companyId: item.companyId, itemKind: item.itemKind, seg1: item.seg1, seg2: item.seg2, seg3: item.seg3,
        categoryName: item.categoryName,
      });
    }
  }
  return lines;
}

export const ERPIS_LINES: ErpisLineRecord[] = buildLines();

// ── Filtre ─────────────────────────────────────────────────────────────────────

const DOMESTIC_COUNTRY = 'Türkiye';

function listParam(query: URLSearchParams, key: string): string[] {
  return query.getAll(key).filter(Boolean);
}

/** Sorgu parametrelerinin desteklenen alt kümesini uygular (sorgu ve filtre uçları aynı kümeyi görür). */
export function filterLines(query: URLSearchParams): ErpisLineRecord[] {
  const companyId = Number(query.get('companyId')) || null;
  const dateField = query.get('dateField') === 'delivery' ? 'deliveryDate' : 'orderDate';
  const from = query.get('from');
  const to = query.get('to');
  const brands = listParam(query, 'brands');
  const models = listParam(query, 'models');
  const productTypes = listParam(query, 'productTypes');
  const currencies = listParam(query, 'currencies');
  const countries = listParam(query, 'countries');
  const partyIds = listParam(query, 'partyIds').map(Number);
  const itemKinds = listParam(query, 'itemKinds');
  const scope = query.get('scope');
  const search = query.get('search')?.toLocaleLowerCase('tr');
  const onlyOpen = query.get('onlyOpen') === 'true';

  return ERPIS_LINES.filter((line) => {
    const date = line[dateField];
    if (companyId && line.companyId !== companyId) return false;
    if (from && date && date < from) return false;
    if (to && date && date > to) return false;
    if (brands.length && !brands.includes(line.brand ?? '')) return false;
    if (models.length && !models.includes(line.model ?? '')) return false;
    if (productTypes.length && !productTypes.includes(line.productType ?? '')) return false;
    if (currencies.length && !currencies.includes(line.currency ?? '')) return false;
    if (countries.length && !countries.includes(line.countryName ?? '')) return false;
    if (partyIds.length && !partyIds.includes(line.partyId ?? 0)) return false;
    if (itemKinds.length && !itemKinds.includes(line.itemKind)) return false;
    if (scope === 'domestic' && line.countryName !== DOMESTIC_COUNTRY) return false;
    if (scope === 'foreign' && line.countryName === DOMESTIC_COUNTRY) return false;
    if (onlyOpen && line.isClosed) return false;
    if (search && !`${line.orderNo} ${line.sku} ${line.itemName} ${line.partyName}`.toLocaleLowerCase('tr').includes(search)) return false;
    return true;
  });
}

// ── Toplama yardımcıları ───────────────────────────────────────────────────────

export function currencyTotals(lines: ErpisLineRecord[], amountOf: (line: ErpisLineRecord) => number = (line) => line.netAmount ?? 0): ErpisCurrencyTotal[] {
  const byCurrency = new Map<string, { total: number; rowCount: number }>();
  for (const line of lines) {
    const key = line.currency ?? 'TRY';
    const entry = byCurrency.get(key) ?? { total: 0, rowCount: 0 };
    entry.total += amountOf(line);
    entry.rowCount += 1;
    byCurrency.set(key, entry);
  }
  return [...byCurrency.entries()].map(([currency, { total, rowCount }]) => ({ currency, total: round2(total), rowCount }));
}

export function toTry(amount: number, currency: string | null): number {
  return amount * (TRY_RATES[currency ?? 'TRY'] ?? 1);
}

export const sumQuantity = (lines: ErpisLineRecord[], pick: (line: ErpisLineRecord) => number | null): number =>
  lines.reduce((total, line) => total + (pick(line) ?? 0), 0);
