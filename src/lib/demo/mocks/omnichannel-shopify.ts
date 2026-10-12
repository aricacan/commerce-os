// Shopify Hub: mağazalar, sipariş/ürün/müşteri gezgini ve genel bakış uçları.
import type { ShopifyAppStatusDto, ShopifyEmbeddedConfigDto } from '../../api/shopify';
import type { ShopifyStockAlertsDto } from '../../api/shopify-bulk';
import type {
  ShopifyFulfillableLineDto, ShopifyCarrierDto, ShopifyDraftOrderListItemDto,
} from '../../api/shopify-payment-shipping';
import type {
  ShopifyPageDto, ShopifyPaymentGatewayDiagnosisDto, ShopifyShopSummaryDto, ShopifySkuDiagnosisDto,
} from '../../api/shopify-explorer';
import type { ShopifyEventDto, ShopifyEventPageDto } from '../../api/shopify-events';
import {
  SHOPIFY_STORES, currencyOf, shopifyCustomers, shopifyOrders, shopifyProductDetail, shopifyProducts,
} from '../data/omnichannel-shopify';
import { ago } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { cursorPage, idParam, notFound, numberQuery } from './omnichannel-http';
import { shopifyContentRoutes } from './omnichannel-shopify-content';

const LOW_STOCK_THRESHOLD = 5;
const EVENT_PAGE_SIZE = 20;
const EVENT_COUNT = 36;

const storeId = (request: DemoRequest): number => idParam(request, 'store');

function summary(request: DemoRequest): ShopifyShopSummaryDto | ReturnType<typeof notFound> {
  const store = SHOPIFY_STORES.find((candidate) => candidate.id === storeId(request));
  if (!store) return notFound();
  return {
    store,
    shop: {
      name: store.name, currency: store.currency, timeZone: store.countryCode === 'TR' ? 'Europe/Istanbul' : 'Europe/London', planName: 'Demo Plan',
      primaryDomainUrl: `https://${store.shopDomain}`, grantedScopes: store.grantedScopes, missingScopes: [],
    },
    liveError: null,
  };
}

function paymentGateways(): ShopifyPaymentGatewayDiagnosisDto {
  return {
    sampledOrders: 30, ordersWithoutGateway: 1,
    used: [{ name: 'Kapıda Ödeme', orderCount: 12 }, { name: 'Havale/EFT', orderCount: 10 }, { name: 'Kredi Kartı', orderCount: 7 }],
    configured: [
      { role: 'cod', configuredName: 'Kapıda Ödeme', match: 0, seenAs: 'Kapıda Ödeme' },
      { role: 'bankTransfer', configuredName: 'Havale/EFT', match: 0, seenAs: 'Havale/EFT' },
    ],
  };
}

function stockAlerts(request: DemoRequest): ShopifyStockAlertsDto {
  const low = shopifyProducts(storeId(request)).filter((product) => (product.totalInventory ?? 0) <= LOW_STOCK_THRESHOLD);
  return {
    threshold: LOW_STOCK_THRESHOLD,
    outOfStockCount: low.filter((product) => (product.totalInventory ?? 0) === 0).length,
    lowStockCount: low.filter((product) => (product.totalInventory ?? 0) > 0).length,
    items: low.slice(0, 8).map((product) => ({ id: product.id, title: product.title, totalInventory: product.totalInventory ?? 0, imageUrl: null })),
  };
}

function orderList(request: DemoRequest) {
  const search = request.query.get('search')?.toLocaleLowerCase('tr') ?? '';
  const financial = request.query.get('financialStatus');
  const fulfillment = request.query.get('fulfillmentStatus');
  const from = request.query.get('from');
  const to = request.query.get('to');
  const rows = shopifyOrders(storeId(request)).map((detail) => detail.order)
    .filter((order) => !search || `${order.name} ${order.customerName ?? ''}`.toLocaleLowerCase('tr').includes(search))
    .filter((order) => !financial || order.financialStatus === financial)
    .filter((order) => !fulfillment || order.fulfillmentStatus === fulfillment)
    .filter((order) => !from || order.createdAt.slice(0, 10) >= from)
    .filter((order) => !to || order.createdAt.slice(0, 10) <= to);
  return cursorPage(rows, request);
}

function orderDetail(request: DemoRequest) {
  const detail = shopifyOrders(storeId(request)).find((candidate) => candidate.order.id === idParam(request, 'order'));
  return detail ?? notFound();
}

function fulfillableLines(request: DemoRequest): ShopifyFulfillableLineDto[] {
  const detail = shopifyOrders(storeId(request)).find((candidate) => candidate.order.id === idParam(request, 'order'));
  if (!detail || detail.order.fulfillmentStatus === 'FULFILLED') return [];
  return detail.lines.map((line) => ({ id: line.id, fulfillmentOrderId: line.id + 1, title: line.title, sku: line.sku, remainingQuantity: line.quantity }));
}

function productList(request: DemoRequest) {
  const search = request.query.get('search')?.toLocaleLowerCase('tr') ?? '';
  const status = request.query.get('status');
  const stock = request.query.get('stock');
  const rows = shopifyProducts(storeId(request))
    .filter((product) => !search || `${product.title} ${product.variants[0]?.sku ?? ''}`.toLocaleLowerCase('tr').includes(search))
    .filter((product) => !status || product.status === status)
    .filter((product) => stock !== 'out' || (product.totalInventory ?? 0) === 0)
    .filter((product) => stock !== 'low' || ((product.totalInventory ?? 0) > 0 && (product.totalInventory ?? 0) <= LOW_STOCK_THRESHOLD));
  return cursorPage(rows, request);
}

function customerList(request: DemoRequest) {
  const search = request.query.get('search')?.toLocaleLowerCase('tr') ?? '';
  const rows = shopifyCustomers(storeId(request))
    .filter((customer) => !search || `${customer.name ?? ''} ${customer.email ?? ''}`.toLocaleLowerCase('tr').includes(search));
  return cursorPage(rows, request);
}

function skuDiagnosis(request: DemoRequest): ShopifySkuDiagnosisDto {
  const products = shopifyProducts(storeId(request));
  return {
    variantsScanned: products.length, truncated: false, withoutSkuCount: 1,
    duplicateSkus: [{ sku: 'DM-1004', products: [products[4]?.title ?? '', products[16]?.title ?? ''] }],
    unmatchedSkus: [{ sku: 'DM-9999', products: [products[7]?.title ?? ''] }],
  };
}

const EVENT_TOPICS = ['orders/create', 'orders/paid', 'orders/fulfilled', 'orders/cancelled', 'products/update', 'customers/create'];

function eventList(request: DemoRequest): ShopifyEventPageDto {
  const topic = request.query.get('topic');
  const status = numberQuery(request, 'status');
  const page = Math.max(1, numberQuery(request, 'page') ?? 1);
  const all: ShopifyEventDto[] = Array.from({ length: EVENT_COUNT }, (_, index) => {
    const failed = index % 11 === 0;
    return {
      id: index + 1, topic: EVENT_TOPICS[index % EVENT_TOPICS.length], status: (failed ? 2 : 1) as ShopifyEventDto['status'], receivedAt: ago(0, index),
      processedAt: ago(0, index, -1), note: failed ? 'Sipariş eşleşmesi bulunamadı (demo).' : null,
      summary: `Olay #${index + 1} işlendi`, orderId: index % 2 === 0 ? 5001 + (index % 30) : null,
    };
  }).filter((event) => (!topic || event.topic === topic) && (status === null || event.status === status));
  const slice = all.slice((page - 1) * EVENT_PAGE_SIZE, page * EVENT_PAGE_SIZE);
  return { items: slice, page, hasNextPage: page * EVENT_PAGE_SIZE < all.length };
}

const draftOrders = (request: DemoRequest): ShopifyPageDto<ShopifyDraftOrderListItemDto> => cursorPage([
  { id: 9001, name: '#D1', status: 'OPEN', email: 'musteri1@example.com', total: { amount: 1280, currency: currencyOf(storeId(request)) }, invoiceUrl: null, createdAt: ago(1), lines: [{ title: 'AeroLine Araç Paspası 3D Siyah', sku: 'DM-1000', quantity: 1 }] },
  { id: 9002, name: '#D2', status: 'INVOICE_SENT', email: 'musteri2@example.com', total: { amount: 640, currency: currencyOf(storeId(request)) }, invoiceUrl: null, createdAt: ago(3), lines: [{ title: 'TrackPro Bagaj Havuzu Gri', sku: 'DM-1001', quantity: 2 }] },
], request);

const carriers = (): ShopifyCarrierDto[] => [
  { id: 1, name: 'Demo Kargo', trackingUrlTemplate: 'https://example.com/track/{number}' },
  { id: 2, name: 'Demo Express', trackingUrlTemplate: null },
];

const appStatus = (): ShopifyAppStatusDto => ({ configured: true, missingSettings: [], callbackUrl: 'https://example.com/callback', defaultAppConfigured: true });
const embeddedConfig = (): ShopifyEmbeddedConfigDto => ({ clientId: null });

export const shopifyRoutes: DemoRoute[] = [
  get('/shopify/oauth/status', appStatus),
  get('/shopify/embedded/config', embeddedConfig),
  get('/shopify/stores', () => SHOPIFY_STORES),
  get('/shopify/stores/:store/summary', summary),
  get('/shopify/stores/:store/payment-gateways', paymentGateways),
  get('/shopify/stores/:store/stock-alerts', stockAlerts),
  get('/shopify/stores/:store/orders', orderList),
  get('/shopify/stores/:store/orders/:order', orderDetail),
  get('/shopify/stores/:store/orders/:order/fulfillable-lines', fulfillableLines),
  get('/shopify/stores/:store/products', productList),
  get('/shopify/stores/:store/products/collection-options', () => [{ id: 301, title: 'Paspaslar' }, { id: 302, title: 'Bagaj Ürünleri' }]),
  get('/shopify/stores/:store/products/:product', (request) => shopifyProductDetail(storeId(request), idParam(request, 'product')) ?? notFound()),
  get('/shopify/stores/:store/customers', customerList),
  get('/shopify/stores/:store/sku-diagnosis', skuDiagnosis),
  get('/shopify/stores/:store/events', eventList),
  get('/shopify/stores/:store/draft-orders', draftOrders),
  get('/shopify/stores/:store/carriers', carriers),
  ...shopifyContentRoutes,
];
