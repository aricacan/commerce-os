// e-İrsaliye (dahili sevkiyat belgeleri): sevk edilmiş siparişlerden türer.
import type { DeliveryNote, DeliveryNoteReport, DeliveryNoteStatus } from '../../api/delivery-note';
import { DEMO_COMPANY } from '../data/core';
import { DEMO_ORDERS } from '../data/orders-seed';
import { STATUS_DELIVERED, STATUS_SHIPPED } from '../data/orders-statuses';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';
import { ago } from '../seed';

const NOT_FOUND = 404;
const DELIVERY_NOTE_COUNT = 24;
const BILLING_ENTITY_ID = 1;
const STATUS_CYCLE: DeliveryNoteStatus[] = ['Issued', 'Issued', 'Draft', 'Issued', 'Issued', 'Cancelled'];
const INVOICE_LINK_EVERY_NTH = 3;
const DEFAULT_REPORT_DAYS = 30;

function buildNotes(): DeliveryNote[] {
  const shipped = [...DEMO_ORDERS].reverse()
    .filter((order) => order.universalStatus === STATUS_SHIPPED || order.universalStatus === STATUS_DELIVERED)
    .slice(0, DELIVERY_NOTE_COUNT);

  return shipped.map((order, index): DeliveryNote => {
    const status = STATUS_CYCLE[index % STATUS_CYCLE.length];
    const linked = status === 'Issued' && index % INVOICE_LINK_EVERY_NTH === 0;
    const day = order.orderDate;
    return {
      id: index + 1,
      orderId: order.orderId,
      billingEntityId: BILLING_ENTITY_ID,
      billingEntityName: DEMO_COMPANY,
      invoiceId: linked ? 5000 + index : null,
      invoiceNumber: linked ? `FTR2026${String(1000 + index)}` : null,
      deliveryNoteNumber: `IRS2026${String(100 + index).padStart(6, '0')}`,
      deliveryDate: day,
      status,
      recipientName: order.customerName,
      recipientAddress: [order.addressLine, order.addressDistrict, order.shipCity].filter(Boolean).join(', '),
      notes: null,
      lines: order.items.map((item, lineIndex) => ({
        id: (index + 1) * 10 + lineIndex,
        description: `${item.supplierSku} - ${item.productName}`,
        quantity: item.quantity,
        unit: 'Adet',
      })),
      createdAt: day,
      updatedAt: day,
    };
  });
}

const NOTES = buildNotes();

function listNotes(request: DemoRequest): DeliveryNote[] {
  const { query } = request;
  const orderId = query.get('orderId');
  const invoiceId = query.get('invoiceId');
  const status = query.get('status');
  return NOTES.filter((note) =>
    (!orderId || note.orderId === Number(orderId))
    && (!invoiceId || note.invoiceId === Number(invoiceId))
    && (!status || note.status === status));
}

function noteById(request: DemoRequest) {
  return NOTES.find((note) => note.id === Number(request.params.id)) ?? new DemoHttpResponse(NOT_FOUND);
}

function report(request: DemoRequest): DeliveryNoteReport {
  const { query } = request;
  const from = query.get('from') ?? ago(DEFAULT_REPORT_DAYS).slice(0, 10);
  const to = query.get('to') ?? ago(0).slice(0, 10);
  const inRange = NOTES.filter((note) => note.deliveryDate.slice(0, 10) >= from && note.deliveryDate.slice(0, 10) <= to);
  const count = (status: DeliveryNoteStatus) => inRange.filter((note) => note.status === status).length;
  const linked = inRange.filter((note) => note.invoiceId !== null).length;
  return {
    from,
    to,
    totalCount: inRange.length,
    draftCount: count('Draft'),
    issuedCount: count('Issued'),
    cancelledCount: count('Cancelled'),
    linkedToInvoiceCount: linked,
    unlinkedCount: inRange.length - linked,
  };
}

export const orderDeliveryRoutes: DemoRoute[] = [
  get('/delivery-notes/report', report),
  get('/delivery-notes/:id', noteById),
  get('/delivery-notes', listNotes),
];
