// Sipariş raporları: kalem bazlı kârlılık ve müşteri e-posta kapsamı.
import type { OrderDetail } from '../../../types/api';
import type {
  CustomerEmailKind, CustomerEmailPlatformRow, CustomerEmailReport, CustomerEmailRow,
} from '../../api/customer-emails';
import type {
  OrderProfitabilityDailyPoint, OrderProfitabilityReport, OrderProfitabilityRow, ProfitFigureSource,
} from '../../api/order-profitability';
import { FIGURE_SOURCE } from '../../api/order-profitability';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { paginate } from '../seed';
import { currentOrders, filterOrdersByDate, filterOrdersByStores } from './orders-store';
import { STATUS_DELIVERED } from '../data/orders-statuses';

const DEFAULT_EMAIL_LIMIT = 200;
const PROFIT_PAGE_SIZE = 50;

const round2 = (value: number): number => Math.round(value * 100) / 100;
const sum = (values: number[]): number => round2(values.reduce((total, value) => total + value, 0));

// ─── Kârlılık ────────────────────────────────────────────────────────────────

function commissionSource(isActual: boolean | undefined): ProfitFigureSource {
  return isActual ? FIGURE_SOURCE.MarketplaceReported : FIGURE_SOURCE.Estimated;
}

function shippingSource(order: OrderDetail, known: boolean | undefined): ProfitFigureSource {
  if (known === false) return FIGURE_SOURCE.Missing;
  return order.universalStatus === STATUS_DELIVERED ? FIGURE_SOURCE.MarketplaceReported : FIGURE_SOURCE.Estimated;
}

function toProfitRows(orders: OrderDetail[]): OrderProfitabilityRow[] {
  return orders.flatMap((order) => order.items.map((item): OrderProfitabilityRow => ({
    orderId: order.orderId,
    platformOrderNumber: order.platformOrderNumber,
    orderDate: order.orderDate,
    storeName: order.storeName,
    platformName: order.platformName,
    productName: item.productName,
    sku: item.supplierSku,
    quantity: item.quantity,
    salePrice: round2(item.unitPrice * item.quantity),
    vat: item.vatAmount,
    commission: item.commissionAmount,
    commissionSource: commissionSource(item.commissionIsActual),
    shipping: item.shippingCost,
    shippingSource: shippingSource(order, item.shippingCostKnown),
    productCost: round2((item.buyingPrice ?? 0) * item.quantity),
    serviceFee: item.serviceFeeAmount,
    netProfit: item.hasCostData ? item.netProfit : 0,
  })));
}

function dailyPoints(rows: OrderProfitabilityRow[]): OrderProfitabilityDailyPoint[] {
  const byDay = new Map<string, OrderProfitabilityRow[]>();
  for (const row of rows) {
    const day = row.orderDate.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), row]);
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, dayRows]) => ({
    date,
    revenue: sum(dayRows.map((row) => row.salePrice)),
    commission: sum(dayRows.map((row) => row.commission)),
    shipping: sum(dayRows.map((row) => row.shipping)),
    vat: sum(dayRows.map((row) => row.vat)),
    netProfit: sum(dayRows.map((row) => row.netProfit)),
    orderCount: new Set(dayRows.map((row) => row.orderId)).size,
  }));
}

function profitability(request: DemoRequest): OrderProfitabilityReport {
  const { query } = request;
  const scoped = filterOrdersByDate(filterOrdersByStores(currentOrders(), request.stores), query.get('from'), query.get('to'));
  const platformName = query.get('platformName');
  const orders = platformName ? scoped.filter((order) => order.platformName === platformName) : scoped;
  const rows = toProfitRows(orders).sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  const reported = rows.filter((row) => row.commissionSource === FIGURE_SOURCE.MarketplaceReported).length;
  const page = paginate(rows, query, PROFIT_PAGE_SIZE);

  return {
    items: page.items,
    daily: dailyPoints(rows),
    summary: {
      totalRevenue: sum(rows.map((row) => row.salePrice)),
      totalCommission: sum(rows.map((row) => row.commission)),
      totalShipping: sum(rows.map((row) => row.shipping)),
      totalVat: sum(rows.map((row) => row.vat)),
      totalProductCost: sum(rows.map((row) => row.productCost)),
      totalNetProfit: sum(rows.map((row) => row.netProfit)),
      orderCount: orders.length,
      itemCount: rows.length,
      marketplaceReportedCommissionRatio: rows.length > 0 ? round2(reported / rows.length) : 0,
      missingShippingItemCount: rows.filter((row) => row.shippingSource === FIGURE_SOURCE.Missing).length,
    },
    page: page.page,
    pageSize: page.pageSize,
    totalCount: page.totalCount,
  };
}

// ─── Müşteri e-postaları ─────────────────────────────────────────────────────

function toEmailRow(order: OrderDetail): CustomerEmailRow {
  return {
    id: order.orderId,
    platformOrderNumber: order.platformOrderNumber,
    orderDate: order.orderDate,
    customerName: order.customerName,
    customerEmail: order.customerEmail ?? '',
    totalAmount: order.totalAmount,
    currency: order.currency,
    platformName: order.platformName,
    storeName: order.storeName,
    kind: order.customerEmailKind,
  };
}

function platformRows(withEmail: OrderDetail[]): CustomerEmailPlatformRow[] {
  const platforms = [...new Set(withEmail.map((order) => order.platformName))];
  return platforms.map((platform) => {
    const rows = withEmail.filter((order) => order.platformName === platform);
    return {
      platform,
      withEmail: rows.length,
      direct: rows.filter((order) => order.customerEmailKind === 'Direct').length,
      marketplaceProxy: rows.filter((order) => order.customerEmailKind === 'MarketplaceProxy').length,
    };
  });
}

function customerEmails(request: DemoRequest): CustomerEmailReport {
  const orders = filterOrdersByStores(currentOrders(), request.stores);
  const withEmail = orders.filter((order) => order.customerEmailKind !== 'None');
  const kind = (request.query.get('kind') ?? 'all') as 'all' | CustomerEmailKind;
  const limit = Number(request.query.get('limit') ?? DEFAULT_EMAIL_LIMIT);
  const matching = kind === 'all' ? withEmail : withEmail.filter((order) => order.customerEmailKind === kind);
  const newestFirst = [...matching].sort((a, b) => b.orderDate.localeCompare(a.orderDate)).slice(0, limit);
  const direct = withEmail.filter((order) => order.customerEmailKind === 'Direct');

  return {
    summary: {
      totalOrders: orders.length,
      withEmail: withEmail.length,
      direct: direct.length,
      marketplaceProxy: withEmail.length - direct.length,
      uniqueDirectAddresses: new Set(direct.map((order) => order.customerEmail)).size,
    },
    byPlatform: platformRows(withEmail),
    items: newestFirst.map(toEmailRow),
    returnedCount: newestFirst.length,
    matchingCount: matching.length,
  };
}

export const orderReportRoutes: DemoRoute[] = [
  get('/order-profitability', profitability),
  get('/order/customer-emails', customerEmails),
];
