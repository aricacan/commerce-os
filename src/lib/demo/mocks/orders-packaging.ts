// Paketleme (koli tanımları, ürün-koli eşleşmesi, son siparişler).
import type { BoxInfo, ProductLookupResult, RecentOrder, TopProduct } from '../../api/packaging';
import { DEMO_PRODUCTS } from '../data/core';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';
import { matchesSearch } from '../seed';
import { currentOrders } from './orders-store';

const NOT_FOUND = 404;
const VOLUMETRIC_DIVISOR = 3000;
const MAX_DESI = 8;
const DEFAULT_COUNT = 10;
const DEFAULT_TOP_COUNT = 15;
/** Her bu kadar üründen biri koli eşleşmesi olmayan ürün sayılır. */
const UNMATCHED_EVERY_NTH_PRODUCT = 9;
const BOX_PRICE_BASE = 6;
const BOX_PRICE_PER_DESI = 2.5;

const round2 = (value: number): number => Math.round(value * 100) / 100;

function hasBox(productId: number): boolean {
  return productId % UNMATCHED_EVERY_NTH_PRODUCT !== 0;
}

function buildBoxes(): BoxInfo[] {
  return Array.from({ length: MAX_DESI }, (_, index): BoxInfo => {
    const desi = index + 1;
    const width = 20 + desi * 4;
    const length = 30 + desi * 5;
    const height = 10 + desi * 3;
    return {
      id: desi,
      boxCode: `KT-${desi}`,
      name: `Koli ${desi} desi`,
      width,
      length,
      height,
      manualDesi: null,
      price: round2(BOX_PRICE_BASE + desi * BOX_PRICE_PER_DESI),
      desi: round2((width * length * height) / VOLUMETRIC_DIVISOR),
      productCount: DEMO_PRODUCTS.filter((product) => hasBox(product.id) && product.id % MAX_DESI === index).length,
    };
  });
}

const BOXES = buildBoxes();
const boxForProduct = (productId: number): BoxInfo => BOXES[productId % BOXES.length];

function listBoxes(request: DemoRequest): BoxInfo[] {
  const search = request.query.get('search');
  return BOXES.filter((box) => matchesSearch(box, search, ['boxCode', 'name']));
}

function lookup(request: DemoRequest): ProductLookupResult | DemoHttpResponse {
  const product = DEMO_PRODUCTS.find((candidate) => candidate.sku.toLowerCase() === request.params.sku.toLowerCase());
  if (!product) return new DemoHttpResponse(NOT_FOUND);
  const box = hasBox(product.id) ? boxForProduct(product.id) : null;
  return {
    supplierSKU: product.sku,
    name: product.name,
    hasBox: box !== null,
    boxCode: box?.boxCode ?? null,
    boxName: box?.name ?? null,
    width: box?.width ?? null,
    length: box?.length ?? null,
    height: box?.height ?? null,
    desi: box?.desi ?? null,
    boxPrice: box?.price ?? null,
  };
}

function recentOrders(request: DemoRequest): RecentOrder[] {
  const count = Number(request.query.get('count') ?? DEFAULT_COUNT);
  return [...currentOrders()].reverse().slice(0, count).map((order) => ({
    id: order.orderId,
    platformOrderNumber: order.platformOrderNumber,
    platform: order.platformName,
    orderDate: order.orderDate,
    totalAmount: order.totalAmount,
    universalStatus: order.universalStatus,
    shipCity: order.shipCity ?? null,
    items: order.items.map((item) => ({
      supplierSKU: item.supplierSku,
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      hasBox: hasBox(item.productId),
    })),
  }));
}

function topProducts(request: DemoRequest): TopProduct[] {
  const count = Number(request.query.get('count') ?? DEFAULT_TOP_COUNT);
  const totals = new Map<string, TopProduct>();
  for (const item of currentOrders().flatMap((order) => order.items)) {
    const current = totals.get(item.supplierSku);
    totals.set(item.supplierSku, {
      supplierSKU: item.supplierSku,
      name: item.productName,
      totalOrdered: (current?.totalOrdered ?? 0) + item.quantity,
    });
  }
  return [...totals.values()].sort((a, b) => b.totalOrdered - a.totalOrdered).slice(0, count);
}

export const orderPackagingRoutes: DemoRoute[] = [
  get('/packaging/boxes', listBoxes),
  get('/packaging/lookup/:sku', lookup),
  get('/packaging/recent-orders', recentOrders),
  get('/packaging/top-products', topProducts),
  get('/packaging/unmatched-count', () => ({
    unmatchedCount: DEMO_PRODUCTS.filter((product) => !hasBox(product.id)).length,
    totalProducts: DEMO_PRODUCTS.length,
  })),
];
