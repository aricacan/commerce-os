// Sohbet siparişleri: sipariş aşamasındaki konuşmalardan ve geçmiş alışverişlerden türetilir.
import type { ChatOrderDto, ChatOrderEventDto, ChatOrderLineDto, ChatOrderListItemDto } from '../../api/omnichannel-chat-orders';
import { sessionGet } from '../session-store';
import { listRecords, type ConversationRecord } from './omnichannel-conversations';
import { PRODUCT_VIEWS } from './omnichannel-scripts';

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const FREE_SHIPPING_TRY = 750;
const SHIPPING_FEE_TRY = 49.9;
const SHIPPING_FEE_GBP = 3.99;
const HISTORIC_EVERY = 3;
const HISTORIC_BASE_DAYS = 9;
const PAYMENT_BANK = 1;
const PAYMENT_COD = 2;

const ORDER = {
  Collecting: 0, AwaitingConfirmation: 1, Confirmed: 2, AwaitingPayment: 3, Paid: 4, SentToShopify: 5, Shipped: 6,
} as const;

const STATUS_BY_SCRIPT: Record<string, number> = {
  collecting: ORDER.Collecting,
  confirm: ORDER.AwaitingConfirmation,
  payment: ORDER.AwaitingPayment,
  shipping: ORDER.Shipped,
  thanks: ORDER.Shipped,
  emailQuestion: ORDER.Shipped,
  enDelivery: ORDER.Shipped,
  invoice: ORDER.SentToShopify,
  enInvoice: ORDER.SentToShopify,
  complaintOpen: ORDER.Shipped,
  complaintHandled: ORDER.Shipped,
  returnRequest: ORDER.Shipped,
  enReturn: ORDER.Shipped,
  enComplaint: ORDER.Shipped,
};

const STATUS_CHAIN = [
  ORDER.Collecting, ORDER.AwaitingConfirmation, ORDER.Confirmed, ORDER.AwaitingPayment, ORDER.Paid, ORDER.SentToShopify, ORDER.Shipped,
];

function priceOf(record: ConversationRecord): number {
  const product = PRODUCT_VIEWS.find((view) => view.id === record.productId) ?? PRODUCT_VIEWS[0];
  return record.ctx.country === 'UK' ? product.priceGbp : product.priceTry;
}

function buildLines(record: ConversationRecord, quantity: number): ChatOrderLineDto[] {
  return [{
    productId: record.productId,
    sku: record.ctx.sku,
    title: record.ctx.productName,
    quantity,
    unitPrice: priceOf(record),
  }];
}

function buildEvents(status: number, createdAtMs: number): ChatOrderEventDto[] {
  const reached = STATUS_CHAIN.filter((step) => step <= status);
  return reached.slice(1).map((to, index): ChatOrderEventDto => ({
    from: reached[index] as ChatOrderEventDto['from'],
    to: to as ChatOrderEventDto['to'],
    actor: to === ORDER.Paid ? 2 : 0,
    note: null,
    at: new Date(createdAtMs + (index + 1) * MS_PER_HOUR).toISOString(),
  }));
}

function buildOrder(record: ConversationRecord, id: number, status: number, publicNo: string, ageDays: number, quantity: number): ChatOrderDto {
  const { ctx, summary } = record;
  const isUk = ctx.country === 'UK';
  const lines = buildLines(record, quantity);
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const shipping = isUk ? SHIPPING_FEE_GBP : subtotal >= FREE_SHIPPING_TRY ? 0 : SHIPPING_FEE_TRY;
  const createdAtMs = Date.parse(summary.lastMessageAt ?? new Date().toISOString()) - ageDays * MS_PER_DAY;
  const confirmed = status >= ORDER.Confirmed;
  const paid = status >= ORDER.Paid;
  return {
    id,
    publicNo,
    conversationId: summary.id,
    customerProfileId: summary.contactId,
    brandId: isUk ? 2 : 1,
    country: ctx.country,
    currency: isUk ? 'GBP' : 'TRY',
    status: status as ChatOrderDto['status'],
    paymentMethod: (status === ORDER.AwaitingPayment || isUk ? PAYMENT_BANK : PAYMENT_COD) as ChatOrderDto['paymentMethod'],
    fullName: ctx.full,
    phone: summary.contactExternalId.startsWith('+') ? summary.contactExternalId : null,
    email: null,
    city: ctx.city,
    district: 'Merkez',
    addressLine: 'Örnek Mah. Deneme Sk. No:12 D:4',
    postalCode: isUk ? 'AB1 2CD' : '34000',
    note: null,
    subtotal,
    shippingAmount: shipping,
    total: Number((subtotal + shipping).toFixed(2)),
    shopifyOrderName: status >= ORDER.SentToShopify ? `#${1000 + id}` : null,
    shopifyOrderUrl: null,
    shopifyError: null,
    destinationKind: status >= ORDER.SentToShopify ? 1 : 0,
    erpOrderNo: null,
    trackingNumber: status === ORDER.Shipped ? `00012345${String(id).padStart(4, '0')}` : null,
    trackingUrl: null,
    cancelReason: null,
    createdAt: new Date(createdAtMs).toISOString(),
    confirmedAt: confirmed ? new Date(createdAtMs + MS_PER_HOUR).toISOString() : null,
    paidAt: paid ? new Date(createdAtMs + 2 * MS_PER_HOUR).toISOString() : null,
    confirmationText: null,
    version: 1,
    createdByAgent: false,
    editLock: null,
    cancelLock: null,
    deleteLock: null,
    lines,
    events: buildEvents(status, createdAtMs),
  };
}

function buildAll(): ChatOrderDto[] {
  const orders: ChatOrderDto[] = [];
  listRecords().forEach((record) => {
    const status = STATUS_BY_SCRIPT[record.script.key];
    if (status === undefined) return;
    const id = orders.length + 1;
    orders.push(buildOrder(record, id, status, record.ctx.orderNo, 0, record.script.key === 'confirm' ? 2 : 1));
    if (id % HISTORIC_EVERY === 0) {
      orders.push(buildOrder(record, orders.length + 1, ORDER.Shipped, `${record.ctx.orderNo}-A`, HISTORIC_BASE_DAYS + id, 1));
    }
  });
  return orders.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function listOrders(): ChatOrderDto[] {
  return sessionGet('omnichannel.orders', buildAll);
}

export function orderById(orderId: number): ChatOrderDto | undefined {
  return listOrders().find((order) => order.id === orderId);
}

export function toListItem(order: ChatOrderDto, record: ConversationRecord | undefined): ChatOrderListItemDto {
  return {
    id: order.id,
    publicNo: order.publicNo,
    conversationId: order.conversationId,
    channelId: record?.summary.channelId ?? 0,
    channelName: record?.summary.channelName ?? null,
    channelType: record?.summary.channelType ?? null,
    country: order.country,
    currency: order.currency,
    status: order.status,
    paymentMethod: order.paymentMethod,
    fullName: order.fullName,
    total: order.total,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    shopifyOrderName: order.shopifyOrderName,
    hasShopifyError: false,
    destinationKind: order.destinationKind,
    trackingNumber: order.trackingNumber,
    createdByAgent: order.createdByAgent,
    items: order.lines.map((line) => ({ title: line.title, quantity: line.quantity })),
  };
}
