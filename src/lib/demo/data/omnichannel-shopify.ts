// Shopify Hub demo verisi: mağazalar, siparişler, ürünler, müşteriler (kurgusal, iki mağaza: TR ve UK).
import type { ShopifyStoreDto } from '../../api/shopify';
import type {
  ShopifyCustomerListItemDto, ShopifyOrderDetailDto, ShopifyOrderListItemDto, ShopifyProductListItemDto,
} from '../../api/shopify-explorer';
import type { ShopifyProductDetailDto } from '../../api/shopify-products';
import { DEMO_PRODUCTS } from './core';
import { DEMO_CONTACTS } from './omnichannel-core';
import { PRODUCT_VIEWS } from './omnichannel-scripts';
import { ago, createRng } from '../seed';

const STORE_TR = 1;
const STORE_UK = 2;
const FIRST_ORDER_ID = 5001;
const ORDER_COUNT = 30;
const SEED = 9090;
const FREE_SHIPPING_FROM = 750;
const PRODUCT_COUNT = 48;
const CUSTOMER_COUNT = 24;

const ALL_SCOPES = ['read_products', 'write_products', 'read_orders', 'write_orders', 'read_customers', 'write_customers', 'read_inventory'];

function storeOf(id: number, name: string, domain: string, country: string, currency: string, brand: string): ShopifyStoreDto {
  return {
    id, name, shopDomain: domain, adminUrl: `https://${domain}/admin`, countryCode: country, brandName: brand, currency,
    apiVersion: '2025-01', isConnected: true, usesOwnApp: false, appClientId: null, grantedScopes: ALL_SCOPES, status: 1,
    lastVerifiedAt: ago(0, 2), lastError: null, orderSyncEnabled: true, orderSyncEnabledAt: ago(30),
    codGatewayName: country === 'TR' ? 'Kapıda Ödeme' : null, codFinancialStatus: 0,
    bankTransferGatewayName: 'Havale/EFT', catalogAuthority: 0, priceChangeGuardPercent: 30,
    readiness: [{ phase: 'Sipariş okuma', requiredScopes: ['read_orders'], missingScopes: [], ready: true },
      { phase: 'Ürün yazma', requiredScopes: ['write_products'], missingScopes: [], ready: true }],
  };
}

export const SHOPIFY_STORES: ShopifyStoreDto[] = [
  storeOf(STORE_TR, 'Demo Mağaza (TR)', 'demo-magaza.example.com', 'TR', 'TRY', 'Demo Oto Aksesuar'),
  storeOf(STORE_UK, 'Demo Store (UK)', 'demo-store-uk.example.com', 'UK', 'GBP', 'Demo Auto UK'),
];

export const isUkStore = (storeId: number): boolean => storeId === STORE_UK;
export const currencyOf = (storeId: number): string => (isUkStore(storeId) ? 'GBP' : 'TRY');

const FINANCIAL = ['PAID', 'PAID', 'PENDING', 'PAID', 'PARTIALLY_PAID', 'REFUNDED'];
const FULFILLMENT = ['FULFILLED', 'UNFULFILLED', 'FULFILLED', 'PARTIALLY_FULFILLED', 'UNFULFILLED', 'FULFILLED'];
const GATEWAYS = ['Kapıda Ödeme', 'Havale/EFT', 'Kredi Kartı'];

function priceFor(index: number, storeId: number): number {
  const view = PRODUCT_VIEWS[index % PRODUCT_VIEWS.length];
  return isUkStore(storeId) ? view.priceGbp : view.priceTry;
}

function buildOrders(storeId: number): ShopifyOrderDetailDto[] {
  const rng = createRng(SEED + storeId);
  const currency = currencyOf(storeId);
  const contacts = DEMO_CONTACTS.filter((contact) => (storeId === STORE_UK ? contact.lang === 'en' : contact.lang === 'tr'));
  return Array.from({ length: ORDER_COUNT }, (_, index): ShopifyOrderDetailDto => {
    const contact = contacts[index % contacts.length];
    const quantity = rng.int(1, 3);
    const unit = priceFor(index * 3, storeId);
    const subtotal = unit * quantity;
    const shipping = isUkStore(storeId) ? 3.99 : subtotal >= FREE_SHIPPING_FROM ? 0 : 49.9;
    const financial = FINANCIAL[index % FINANCIAL.length];
    const fulfillment = FULFILLMENT[index % FULFILLMENT.length];
    const id = FIRST_ORDER_ID + index;
    const view = PRODUCT_VIEWS[(index * 3) % PRODUCT_VIEWS.length];
    const order: ShopifyOrderListItemDto = {
      id, name: `#${1000 + index}`, createdAt: ago(Math.floor(index / 2), index % 7), cancelledAt: null, financialStatus: financial,
      fulfillmentStatus: fulfillment, total: { amount: Number((subtotal + shipping).toFixed(2)), currency }, itemCount: quantity,
      customerName: contact.name, city: contact.city, countryCode: isUkStore(storeId) ? 'GB' : 'TR',
      paymentGateways: [GATEWAYS[index % GATEWAYS.length]], tags: index % 5 === 0 ? ['vip'] : [], chatOrderId: index % 4 === 0 ? index + 1 : null,
    };
    return {
      order, note: index % 6 === 0 ? 'Hediye paketi istendi.' : null, email: contact.email, phone: contact.phone, cancelReason: null,
      shippingAddress: { name: contact.name, address1: 'Örnek Mah. Deneme Sk. No:12', address2: null, city: contact.city, postalCode: isUkStore(storeId) ? 'AB1 2CD' : '34000', countryCode: order.countryCode, phone: contact.phone },
      lines: [{ id: id * 10, title: isUkStore(storeId) ? view.nameEn : view.nameTr, variantTitle: null, sku: view.sku, quantity, unitPrice: { amount: unit, currency }, refundableQuantity: quantity }],
      subtotal: { amount: subtotal, currency }, shipping: { amount: shipping, currency }, tax: { amount: Number((subtotal * 0.18).toFixed(2)), currency },
      refunded: financial === 'REFUNDED' ? { amount: subtotal, currency } : null,
      tracking: fulfillment === 'FULFILLED' ? [{ company: 'Demo Kargo', number: `00099${id}`, url: null }] : [],
      adminUrl: `${SHOPIFY_STORES.find((store) => store.id === storeId)?.adminUrl ?? ''}/orders/${id}`, cancelBlockedReason: fulfillment === 'FULFILLED' ? 'Gönderilmiş sipariş iptal edilemez.' : null,
    };
  });
}

const orderCache = new Map<number, ShopifyOrderDetailDto[]>();
export function shopifyOrders(storeId: number): ShopifyOrderDetailDto[] {
  if (!orderCache.has(storeId)) orderCache.set(storeId, buildOrders(storeId));
  return orderCache.get(storeId) ?? [];
}

export function shopifyProducts(storeId: number): ShopifyProductListItemDto[] {
  const rng = createRng(SEED + 10 + storeId);
  return DEMO_PRODUCTS.slice(0, PRODUCT_COUNT).map((product, index): ShopifyProductListItemDto => {
    const view = PRODUCT_VIEWS[index];
    const price = isUkStore(storeId) ? view.priceGbp : view.priceTry;
    const stock = index % 9 === 0 ? 0 : index % 7 === 0 ? rng.int(1, 4) : rng.int(8, 160);
    return {
      id: 7000 + index, title: isUkStore(storeId) ? view.nameEn : view.nameTr, status: index % 11 === 0 ? 'DRAFT' : 'ACTIVE',
      productType: product.category, vendor: product.brand, imageUrl: null, totalInventory: stock, variantCount: 1,
      variants: [{ sku: view.sku, title: 'Default', price, inventoryQuantity: stock }],
    };
  });
}

export function shopifyProductDetail(storeId: number, productId: number): ShopifyProductDetailDto | undefined {
  const item = shopifyProducts(storeId).find((product) => product.id === productId);
  if (!item) return undefined;
  return {
    id: item.id, title: item.title, descriptionHtml: `<p>${item.title} - yüksek kaliteli, araca özel üretim.</p>`, status: item.status,
    productType: item.productType, vendor: item.vendor, tags: ['paspas', 'oto-aksesuar'], seoTitle: item.title, seoDescription: `${item.title} en uygun fiyatla.`,
    images: [], variants: item.variants.map((variant, index) => ({ id: item.id * 10 + index, sku: variant.sku, title: variant.title, price: variant.price, barcode: null, inventoryQuantity: variant.inventoryQuantity })),
    collections: [{ id: 301, title: 'Paspaslar' }], options: [{ id: item.id * 100, name: 'Title', values: ['Default'] }],
  };
}

export function shopifyCustomers(storeId: number): ShopifyCustomerListItemDto[] {
  const contacts = DEMO_CONTACTS.filter((contact) => (storeId === STORE_UK ? contact.lang === 'en' : contact.lang === 'tr'));
  return contacts.slice(0, CUSTOMER_COUNT).map((contact, index): ShopifyCustomerListItemDto => ({
    id: 8000 + index, name: contact.name, email: contact.email, phone: contact.phone, orderCount: 1 + (index % 4), createdAt: ago(10 + index * 3),
  }));
}
