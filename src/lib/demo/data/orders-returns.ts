// Demo iade talepleri (pazaryeri aynası) ve iade belgeleri; ikisi de gerçek siparişlerden türer.
import type { OrderDetail } from '../../../types/api';
import type { ClaimRow } from '../../api/claims';
import type { ReturnDocument, ReturnStatusName } from '../../api/returns';
import { ago, createRng } from '../seed';
import { DEMO_GBP_TRY_RATE, DEMO_ORDERS } from './orders-seed';
import { STATUS_DELIVERED, STATUS_RETURNED } from './orders-statuses';

const RETURN_SEED = 9021;
const EXTRA_CLAIM_EVERY_NTH_DELIVERED = 14;
const RETURN_DOCUMENT_COUNT = 14;
const CLAIM_STATUSES = ['Bekliyor', 'Onaylandı', 'Tamamlandı', 'Reddedildi'] as const;
const RETURN_STATUS_CYCLE: ReturnStatusName[] = [
  'Draft', 'Approved', 'Completed', 'Completed', 'Draft', 'Completed', 'Approved',
  'Completed', 'Rejected', 'Completed', 'Draft', 'Approved', 'Completed', 'Completed',
];
const REASONS_TR = ['Ürün hasarlı geldi', 'Yanlış ürün gönderildi', 'Araca uymadı', 'Vazgeçti', 'Kusurlu ürün', 'Geç teslimat'];
const REASONS_UK = ['Item arrived damaged', 'Wrong item sent', 'Does not fit my vehicle', 'Changed my mind', 'Faulty item'];
const CREDITED_RETURN_IDS = [3, 6, 8];
const CUSTOMER_LINKED_RETURN_IDS = [3, 6, 10];

const round2 = (value: number): number => Math.round(value * 100) / 100;
const isUk = (order: OrderDetail): boolean => order.country === 'UK';

function claimOrders(): OrderDetail[] {
  const returned = DEMO_ORDERS.filter((order) => order.universalStatus === STATUS_RETURNED);
  const delivered = DEMO_ORDERS.filter((order) => order.universalStatus === STATUS_DELIVERED)
    .filter((_, index) => index % EXTRA_CLAIM_EVERY_NTH_DELIVERED === 0);
  return [...returned, ...delivered].sort((a, b) => b.orderDate.localeCompare(a.orderDate));
}

function buildClaims(): ClaimRow[] {
  const rng = createRng(RETURN_SEED);
  return claimOrders().map((order, index) => {
    const item = order.items[0];
    const refundTry = round2(item.unitPrice * item.quantity);
    const uk = isUk(order);
    return {
      id: index + 1,
      platformOrderNumber: order.platformOrderNumber,
      sku: item.supplierSku,
      reason: rng.pick(uk ? REASONS_UK : REASONS_TR),
      status: rng.pick(CLAIM_STATUSES),
      claimDate: ago(rng.int(1, 55), rng.int(0, 20)),
      refundAmount: uk ? round2(refundTry / DEMO_GBP_TRY_RATE) : refundTry,
      currency: uk ? 'GBP' : 'TRY',
      syncedAt: ago(0, rng.int(1, 3)),
      storeName: order.storeName,
    };
  }).sort((a, b) => b.claimDate.localeCompare(a.claimDate));
}

export const DEMO_CLAIMS: ClaimRow[] = buildClaims();

function buildReturn(claim: ClaimRow, id: number, status: ReturnStatusName): ReturnDocument {
  const order = DEMO_ORDERS.find((candidate) => candidate.platformOrderNumber === claim.platformOrderNumber);
  const item = order?.items.find((candidate) => candidate.supplierSku === claim.sku) ?? order?.items[0];
  const completed = status === 'Completed';
  return {
    id,
    orderId: order?.orderId ?? null,
    customerId: CUSTOMER_LINKED_RETURN_IDS.includes(id) ? id : null,
    claimId: claim.id,
    status,
    reason: claim.reason,
    currency: claim.currency,
    refundAmount: claim.refundAmount ?? 0,
    stockHandledAt: completed && id % 2 === 0 ? ago(2) : null,
    creditNoteInvoiceId: CREDITED_RETURN_IDS.includes(id) ? 7000 + id : null,
    createdAt: claim.claimDate,
    completedAt: completed ? ago(1, id) : null,
    storeId: order?.storeId ?? null,
    lines: item ? [{
      id: id * 10,
      productId: item.productId,
      orderItemId: null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      condition: id % 3 === 0 ? 'Arizali' : 'Saglam',
      productName: item.productName,
      productSku: item.supplierSku,
    }] : [],
  };
}

export const DEMO_RETURNS: ReturnDocument[] = DEMO_CLAIMS.slice(0, RETURN_DOCUMENT_COUNT)
  .map((claim, index) => buildReturn(claim, index + 1, RETURN_STATUS_CYCLE[index % RETURN_STATUS_CYCLE.length]));
