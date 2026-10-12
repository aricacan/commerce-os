// Demo siparişleri: ortak ürün/müşteri/mağaza verisinden türeyen, son 90 güne yayılmış kayıtlar.
import type { OrderDetail, OrderFeeLine, OrderItemDetail } from '../../../types/api';
import { ago, createRng, type Rng } from '../seed';
import { DEMO_CUSTOMERS, DEMO_PRODUCTS, DEMO_STORES, type DemoCustomer, type DemoStore } from './core';
import {
  OPERATION_STATUS_BY_UNIVERSAL,
  STATUS_APPROVED,
  STATUS_AWAITING,
  STATUS_CANCELLED,
  STATUS_DELIVERED,
  STATUS_NEW,
  STATUS_PREPARING,
  STATUS_RETURNED,
  STATUS_SHIPPED,
  STATUS_SOURCING,
} from './orders-statuses';

const ORDER_SEED = 4417;
const ORDER_COUNT = 400;
const ORDER_WINDOW_DAYS = 90;
const FIRST_ORDER_ID = 10001;
/** Bu gün sayısından eski ve hâlâ ilerlememiş siparişler "takılı" sayılır. */
const STUCK_AFTER_DAYS = 40;
const VAT_RATE = 0.2;
const VAT_SHARE = VAT_RATE / (1 + VAT_RATE);
/** Base (UK) siparişleri TL saklanır; GBP karşılığı bu kurdan türer. */
export const DEMO_GBP_TRY_RATE = 42.5;
export const UK_PRICE_FACTOR = 1.25;
const UK_CITIES: readonly string[] = ['London', 'Manchester', 'Leeds'];

interface PlatformProfile {
  name: string;
  commissionRate: number;
  serviceFee: number;
  /** Alıcı e-postasının türü: pazaryerleri çoğunlukla maskeli adres verir. */
  emailKind: 'Direct' | 'MarketplaceProxy' | 'Mixed';
  feeName: string;
}

const PLATFORMS: Record<string, PlatformProfile> = {
  Trendyol: { name: 'Trendyol', commissionRate: 0.15, serviceFee: 8.99, emailKind: 'Mixed', feeName: 'Komisyon' },
  Hepsiburada: { name: 'Hepsiburada', commissionRate: 0.14, serviceFee: 5.5, emailKind: 'Mixed', feeName: 'Komisyon' },
  Amazon: { name: 'Amazon', commissionRate: 0.12, serviceFee: 0, emailKind: 'MarketplaceProxy', feeName: 'Referral fee' },
  'Web Sitesi': { name: 'Web Sitesi', commissionRate: 0.02, serviceFee: 0, emailKind: 'Direct', feeName: 'Ödeme altyapısı komisyonu' },
  eBay: { name: 'eBay', commissionRate: 0.1, serviceFee: 0, emailKind: 'MarketplaceProxy', feeName: 'Final value fee' },
};

interface StoreProfile {
  store: DemoStore;
  id: number;
  color: string;
  sourceType: 'Sentos' | 'Base';
  platforms: PlatformProfile[];
}

const STORE_COLORS = ['#6366f1', '#f59e0b', '#10b981'];
const STORE_PLATFORMS: string[][] = [
  ['Trendyol', 'Trendyol', 'Hepsiburada', 'Web Sitesi'],
  ['Trendyol', 'Hepsiburada', 'Hepsiburada', 'Web Sitesi'],
  ['Amazon', 'Amazon', 'eBay', 'Web Sitesi'],
];

export const DEMO_STORE_PROFILES: StoreProfile[] = DEMO_STORES.map((store, index) => ({
  store,
  id: index + 1,
  color: STORE_COLORS[index % STORE_COLORS.length],
  sourceType: store.country === 'UK' ? 'Base' : 'Sentos',
  platforms: STORE_PLATFORMS[index].map((name) => PLATFORMS[name]),
}));

const TR_DISTRICTS: Record<string, string[]> = {
  İstanbul: ['Kadıköy', 'Esenyurt', 'Ümraniye', 'Başakşehir'],
  Ankara: ['Çankaya', 'Keçiören', 'Yenimahalle'],
  İzmir: ['Karşıyaka', 'Bornova', 'Buca'],
  Bursa: ['Nilüfer', 'Osmangazi'],
  Antalya: ['Muratpaşa', 'Konyaaltı'],
  Konya: ['Selçuklu', 'Meram'],
  Adana: ['Seyhan', 'Çukurova'],
  Gaziantep: ['Şahinbey', 'Şehitkamil'],
};
const TR_STREETS = ['Atatürk Cad.', 'Cumhuriyet Mah.', 'Gül Sok.', 'Fidan Sok.', 'Barış Mah.'];
const UK_STREETS = ['High Street', 'Station Road', 'Church Lane', 'Victoria Road', 'Park Avenue'];
const UK_POSTCODE_AREAS = ['M1', 'M14', 'LS6', 'SW11', 'E8', 'N7'];
const BOX_COSTS = [9, 12, 16, 22];
const PAYMENT_TR = ['Ödendi', 'Ödendi', 'Ödendi', 'Kapıda Ödeme'];

const isUkCity = (city: string): boolean => UK_CITIES.includes(city);
const round2 = (value: number): number => Math.round(value * 100) / 100;

interface WeightedStatus {
  status: string;
  weight: number;
}

function statusWeightsForAge(days: number): WeightedStatus[] {
  if (days <= 1) {
    return [
      { status: STATUS_NEW, weight: 40 }, { status: STATUS_AWAITING, weight: 20 },
      { status: STATUS_APPROVED, weight: 20 }, { status: STATUS_PREPARING, weight: 20 },
    ];
  }
  if (days <= 4) {
    return [
      { status: STATUS_APPROVED, weight: 10 }, { status: STATUS_PREPARING, weight: 25 },
      { status: STATUS_SHIPPED, weight: 50 }, { status: STATUS_SOURCING, weight: 10 },
      { status: STATUS_CANCELLED, weight: 5 },
    ];
  }
  if (days <= 10) {
    return [
      { status: STATUS_SHIPPED, weight: 35 }, { status: STATUS_DELIVERED, weight: 55 },
      { status: STATUS_CANCELLED, weight: 6 }, { status: STATUS_RETURNED, weight: 4 },
    ];
  }
  const stuck = days >= STUCK_AFTER_DAYS ? 3 : 0;
  return [
    { status: STATUS_DELIVERED, weight: 88 }, { status: STATUS_CANCELLED, weight: 6 },
    { status: STATUS_RETURNED, weight: 6 }, { status: STATUS_SOURCING, weight: stuck },
  ];
}

function pickStatus(rng: Rng, days: number): string {
  const weights = statusWeightsForAge(days);
  let roll = rng.next() * weights.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll < 0) return entry.status;
  }
  return STATUS_DELIVERED;
}

function platformOrderNumber(rng: Rng, platform: string, index: number): string {
  if (platform === 'Amazon') return `402-${rng.int(1000000, 9999999)}-${rng.int(1000000, 9999999)}`;
  if (platform === 'eBay') return `27-${rng.int(10000, 99999)}-${rng.int(10000, 99999)}`;
  if (platform === 'Web Sitesi') return `WEB-${2600 + index}`;
  return String(rng.int(1000000000, 1999999999));
}

function buildItem(rng: Rng, platform: PlatformProfile, isUk: boolean): OrderItemDetail {
  const product = rng.pick(DEMO_PRODUCTS);
  const quantity = rng.chance(0.7) ? 1 : rng.chance(0.75) ? 2 : 3;
  const priceFactor = isUk ? UK_PRICE_FACTOR : 1;
  const unitPrice = round2(product.price * priceFactor * rng.float(0.92, 1));
  const revenue = unitPrice * quantity;
  const hasCostData = rng.chance(0.93);
  const buyingPrice = hasCostData ? product.cost : null;
  const costTotal = (buyingPrice ?? 0) * quantity;
  const boxCost = rng.pick(BOX_COSTS);
  const desi = rng.int(1, 8);
  const shippingKnown = !(isUk && rng.chance(0.05));
  const shippingCost = shippingKnown ? round2((isUk ? 58 : 22) + desi * (isUk ? 9 : 4.5)) : 0;
  const commissionAmount = round2(revenue * platform.commissionRate);
  const vatAmount = round2(Math.max(0, revenue - costTotal) * VAT_SHARE);
  const netProfit = round2(
    revenue - vatAmount - costTotal - boxCost * quantity - shippingCost - commissionAmount - platform.serviceFee,
  );
  return {
    productId: product.id,
    productName: product.name,
    supplierSku: product.sku,
    quantity,
    listPrice: round2(product.price * priceFactor),
    unitPrice,
    buyingPrice,
    boxCost,
    shippingCost,
    shippingCostKnown: shippingKnown,
    commissionAmount,
    commissionIsActual: rng.chance(0.6),
    serviceFeeAmount: platform.serviceFee,
    vatAmount,
    netProfit,
    hasCostData,
    boxCode: `KT-${desi}`,
    boxName: `Koli ${desi} desi`,
    desi,
  };
}

function buildFeeLines(platform: PlatformProfile, items: OrderItemDetail[], isUk: boolean): OrderFeeLine[] {
  const commission = round2(items.reduce((sum, item) => sum + item.commissionAmount, 0));
  const actual = items.every((item) => item.commissionIsActual);
  const lines: OrderFeeLine[] = [{
    name: platform.feeName,
    amountTry: commission,
    amount: isUk ? round2(commission / DEMO_GBP_TRY_RATE) : null,
    currency: isUk ? 'GBP' : null,
    isActual: actual,
    rate: actual ? null : platform.commissionRate,
  }];
  if (platform.serviceFee > 0) {
    lines.push({
      name: 'Hizmet bedeli',
      amountTry: round2(platform.serviceFee * items.length),
      amount: null,
      currency: null,
      isActual: true,
      rate: null,
    });
  }
  return lines;
}

function buyerEmail(rng: Rng, platform: PlatformProfile, customer: DemoCustomer): Pick<OrderDetail, 'customerEmail' | 'customerEmailKind'> {
  const kind = platform.emailKind === 'Mixed' ? (rng.chance(0.4) ? 'MarketplaceProxy' : 'None') : platform.emailKind;
  if (kind === 'Direct') return { customerEmail: customer.email, customerEmailKind: 'Direct' };
  if (kind === 'MarketplaceProxy') {
    return { customerEmail: `${rng.int(100000, 999999)}-relay@marketplace.example.com`, customerEmailKind: 'MarketplaceProxy' };
  }
  return { customerEmail: null, customerEmailKind: 'None' };
}

function buildAddress(rng: Rng, customer: DemoCustomer, isUk: boolean) {
  if (isUk) {
    return {
      addressDistrict: null,
      addressLine: `${rng.int(1, 120)} ${rng.pick(UK_STREETS)}`,
      deliveryPostcode: `${rng.pick(UK_POSTCODE_AREAS)} ${rng.int(1, 9)}${rng.pick(['AB', 'QX', 'LT', 'RD'])}`,
    };
  }
  const districts = TR_DISTRICTS[customer.city] ?? ['Merkez'];
  return {
    addressDistrict: rng.pick(districts),
    addressLine: `${rng.pick(TR_STREETS)} No:${rng.int(1, 90)} D:${rng.int(1, 12)}`,
    deliveryPostcode: null,
  };
}

function buildOrder(rng: Rng, index: number, orderId: number, daysAgo: number): OrderDetail {
  const profile = rng.pick(DEMO_STORE_PROFILES);
  const isUk = profile.store.country === 'UK';
  const platform = rng.pick(profile.platforms);
  const pool = DEMO_CUSTOMERS.filter((customer) => isUkCity(customer.city) === isUk);
  const customer = rng.pick(pool);
  const itemCount = rng.chance(0.75) ? 1 : rng.chance(0.8) ? 2 : 3;
  const items = Array.from({ length: itemCount }, () => buildItem(rng, platform, isUk));
  const shippingTotal = platform.name === 'Web Sitesi' ? (rng.chance(0.5) ? 0 : 49.9) : null;
  const totalAmount = round2(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) + (shippingTotal ?? 0));
  const universalStatus = pickStatus(rng, daysAgo);
  const address = buildAddress(rng, customer, isUk);
  const orderNumber = platformOrderNumber(rng, platform.name, index);

  return {
    orderId,
    storeId: profile.id,
    storeName: profile.store.name,
    storeColor: profile.color,
    sourceType: profile.sourceType,
    platformOrderNumber: orderNumber,
    platformName: platform.name,
    universalStatus,
    orderDate: ago(daysAgo, rng.int(0, 23), rng.int(0, 59)),
    totalAmount,
    currency: 'TRY',
    shipCity: customer.city,
    note: null,
    orderCode: platform.name === 'Web Sitesi' ? null : `${platform.name.slice(0, 2).toUpperCase()}${orderId}`,
    packageCode: universalStatus === STATUS_SHIPPED || universalStatus === STATUS_DELIVERED ? `PK${rng.int(10000000, 99999999)}` : null,
    shippingTotal,
    paymentStatus: isUk ? 'Paid' : rng.pick(PAYMENT_TR),
    customerName: customer.name,
    ...buyerEmail(rng, platform, customer),
    originalCurrency: isUk ? 'GBP' : null,
    originalTotal: isUk ? round2(totalAmount / DEMO_GBP_TRY_RATE) : null,
    operationStatusId: OPERATION_STATUS_BY_UNIVERSAL[universalStatus] ?? null,
    invoicedAt: universalStatus === STATUS_SHIPPED || universalStatus === STATUS_DELIVERED ? ago(Math.max(0, daysAgo - 1)) : null,
    country: profile.store.country,
    shippingZone: isUk ? 'Mainland' : undefined,
    shippingCostOrigin: isUk ? 'DesiBand' : 'Actual',
    feeLines: buildFeeLines(platform, items, isUk),
    items,
    ...address,
  };
}

function buildOrders(): OrderDetail[] {
  const rng = createRng(ORDER_SEED);
  // Yakın günler daha yoğun: gün = pencere * u^1.4
  const ages = Array.from({ length: ORDER_COUNT }, () => Math.floor(Math.pow(rng.next(), 1.4) * ORDER_WINDOW_DAYS))
    .sort((older, newer) => newer - older);
  return ages.map((daysAgo, index) => buildOrder(rng, index, FIRST_ORDER_ID + index, daysAgo));
}

/** Eskiden yeniye sıralı; orderId tarihle birlikte artar. */
export const DEMO_ORDERS: OrderDetail[] = buildOrders();
