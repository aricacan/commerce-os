// Manuel sipariş ekranı: bağlam, ürün arama ve örnek taslaklar. Kayıt/onay işlemleri demo'da engelli.
import {
  ErpOperationStatus, ManualOrderDraftStatus,
  type ManualOrderContext, type ManualOrderDraft, type ManualOrderProduct,
} from '../../api/manual-orders';
import { DEMO_CUSTOMERS, DEMO_PRODUCTS, type DemoProduct } from '../data/core';
import { DEMO_GBP_TRY_RATE, DEMO_STORE_PROFILES, UK_PRICE_FACTOR } from '../data/orders-seed';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';
import { ago, matchesSearch } from '../seed';

const NOT_FOUND = 404;
const PRODUCT_RESULT_LIMIT = 30;
const VAT_RATE_PERCENT = 20;
const DESI_CYCLE = 8;
const BOX_PRICE_BASE_TRY = 6;
const BOX_PRICE_PER_DESI_TRY = 2.5;
const TR_SHIPPING_BASE_TRY = 22;
const TR_SHIPPING_PER_DESI_TRY = 4.5;
const UK_SHIPPING_BASE_TRY = 58;
const UK_SHIPPING_PER_DESI_TRY = 9;
const BREAK_EVEN_MARGIN = 1.35;
const TR_SHIPPING_CHARGE = 49.9;
const UK_SHIPPING_CHARGE = 4.99;
const LOCAL_TARGET = 0;
const ERP_TARGET = 1;
const DEMO_DISPATCH_NOTICE = 'Demo hesabında dış sisteme gönderim kapalıdır; kayıtlar yalnızca incelenebilir.';

const round2 = (value: number): number => Math.round(value * 100) / 100;
const profileById = (storeId: number) => DEMO_STORE_PROFILES.find((profile) => profile.id === storeId);

function context(): ManualOrderContext {
  return {
    externalDispatchEnabled: false,
    dispatchNotice: DEMO_DISPATCH_NOTICE,
    stores: DEMO_STORE_PROFILES.map((profile) => ({
      id: profile.id,
      name: profile.store.name,
      erpSources: [{
        id: profile.id * 10,
        name: `${profile.store.name} ERP`,
        connectorType: profile.sourceType,
        country: profile.store.country,
        supportsDispatch: false,
      }],
    })),
  };
}

function toManualProduct(product: DemoProduct, storeId: number): ManualOrderProduct {
  const isUk = profileById(storeId)?.store.country === 'UK';
  const toStorePrice = (tryAmount: number) => round2(isUk ? (tryAmount * UK_PRICE_FACTOR) / DEMO_GBP_TRY_RATE : tryAmount);
  const desi = (product.id % DESI_CYCLE) + 1;
  const shippingCostTry = isUk ? UK_SHIPPING_BASE_TRY + desi * UK_SHIPPING_PER_DESI_TRY : TR_SHIPPING_BASE_TRY + desi * TR_SHIPPING_PER_DESI_TRY;
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    barcode: `869${String(product.id).padStart(10, '0')}`,
    imageUrl: null,
    price: toStorePrice(product.price),
    stockQuantity: product.stock,
    buyingPrice: toStorePrice(product.cost),
    boxCode: `KT-${desi}`,
    boxName: `Koli ${desi} desi`,
    boxPrice: toStorePrice(BOX_PRICE_BASE_TRY + desi * BOX_PRICE_PER_DESI_TRY),
    desi,
    shippingCost: isUk ? round2(shippingCostTry / DEMO_GBP_TRY_RATE) : shippingCostTry,
    vatRate: VAT_RATE_PERCENT,
    breakEvenPrice: toStorePrice(product.cost * BREAK_EVEN_MARGIN),
    hasCostData: true,
  };
}

function products(request: DemoRequest): ManualOrderProduct[] {
  const storeId = Number(request.query.get('storeId'));
  const search = request.query.get('search');
  return DEMO_PRODUCTS
    .filter((product) => matchesSearch(product, search, ['sku', 'name', 'brand']))
    .slice(0, PRODUCT_RESULT_LIMIT)
    .map((product) => toManualProduct(product, storeId));
}

interface DraftSeed {
  storeId: number;
  status: number;
  destinationStatus: number;
  productIds: number[];
  rejectionReason?: string;
  cancellationReason?: string;
}

const DRAFT_SEEDS: DraftSeed[] = [
  { storeId: 1, status: ManualOrderDraftStatus.Draft, destinationStatus: ErpOperationStatus.Draft, productIds: [3, 14] },
  { storeId: 2, status: ManualOrderDraftStatus.AwaitingApproval, destinationStatus: ErpOperationStatus.AwaitingApproval, productIds: [8] },
  { storeId: 3, status: ManualOrderDraftStatus.Approved, destinationStatus: ErpOperationStatus.Approved, productIds: [21, 5] },
  { storeId: 1, status: ManualOrderDraftStatus.Rejected, destinationStatus: ErpOperationStatus.Rejected, productIds: [33], rejectionReason: 'Stok yetersiz, tedarik sonrası yeniden açılsın.' },
  { storeId: 2, status: ManualOrderDraftStatus.Completed, destinationStatus: ErpOperationStatus.Succeeded, productIds: [12, 40, 2] },
  { storeId: 3, status: ManualOrderDraftStatus.Cancelled, destinationStatus: ErpOperationStatus.Cancelled, productIds: [17], cancellationReason: 'Müşteri vazgeçti.' },
];

function buildDraft(seed: DraftSeed, index: number): ManualOrderDraft {
  const profile = profileById(seed.storeId);
  const customer = DEMO_CUSTOMERS[index * 7];
  const isUk = profile?.store.country === 'UK';
  const lines = seed.productIds.map((productId) => {
    const product = DEMO_PRODUCTS[productId - 1];
    const manual = toManualProduct(product, seed.storeId);
    const quantity = (index % 2) + 1;
    return {
      productId, quantity, unitPrice: manual.price,
      sku: manual.sku, productName: manual.name, imageUrl: null,
      lineTotal: round2(manual.price * quantity), listPrice: manual.price, stockQuantity: manual.stockQuantity,
      buyingPrice: manual.buyingPrice, boxCode: manual.boxCode, boxName: manual.boxName, boxPrice: manual.boxPrice,
      desi: manual.desi, shippingCost: manual.shippingCost, vatRate: manual.vatRate,
      breakEvenPrice: manual.breakEvenPrice, hasCostData: manual.hasCostData,
    };
  });
  const subtotal = round2(lines.reduce((total, line) => total + line.lineTotal, 0));
  const shippingAmount = isUk ? UK_SHIPPING_CHARGE : TR_SHIPPING_CHARGE;
  const createdAt = ago(index + 1, index * 2);
  return {
    id: `demo-draft-${index + 1}`,
    draftNumber: `MS-${2600 + index}`,
    storeId: seed.storeId,
    storeName: profile?.store.name ?? '',
    status: seed.status,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    shipCity: customer.city,
    shipDistrict: null,
    addressLine: isUk ? `${index + 12} High Street` : `Cumhuriyet Mah. Gül Sok. No:${index + 4}`,
    currency: isUk ? 'GBP' : 'TRY',
    shippingAmount,
    discountAmount: 0,
    subtotal,
    totalAmount: round2(subtotal + shippingAmount),
    note: index === 1 ? 'Telefonla alınan sipariş' : null,
    rejectionReason: seed.rejectionReason ?? null,
    cancellationReason: seed.cancellationReason ?? null,
    localOrderId: seed.status === ManualOrderDraftStatus.Completed ? 10000 + index : null,
    createdAt,
    updatedAt: createdAt,
    lines,
    destinations: [
      { target: LOCAL_TARGET, dataSourceId: null, name: 'Yerel kayıt', status: seed.destinationStatus, idempotencyKey: `demo-local-${index}` },
      { target: ERP_TARGET, dataSourceId: seed.storeId * 10, name: `${profile?.store.name ?? ''} ERP`, status: seed.destinationStatus, idempotencyKey: `demo-erp-${index}` },
    ],
  };
}

const DRAFTS: ManualOrderDraft[] = DRAFT_SEEDS.map(buildDraft);

function draftById(request: DemoRequest) {
  return DRAFTS.find((draft) => draft.id === request.params.id) ?? new DemoHttpResponse(NOT_FOUND);
}

export const orderManualRoutes: DemoRoute[] = [
  get('/manual-orders/context', context),
  get('/manual-orders/products', products),
  get('/manual-orders/:id', draftById),
  get('/manual-orders', () => DRAFTS),
];
