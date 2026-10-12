// e-Fatura / e-Belge: faturalar, irsaliyeler, seriler, adres defteri, zarflar, ticari yanıt, Trendyol fatura yükleme.
import type {
  AddressBookEntry,
  CommercialStatus,
  EInvoiceEnvelope,
  InvoiceSeries,
  PurchaseMatchingResult,
} from '../../api/e-belge';
import type {
  ErpSourceOption,
  InvoiceUploadBatch,
  InvoiceUploadBatchSummary,
  InvoiceUploadFile,
  MarketplaceConnectionOption,
} from '../../api/trendyol-invoices';
import { BILLING_ENTITIES, TR_ENTITY_ID, UK_ENTITY_ID } from '../data/finance-accounting';
import { round2 } from '../data/finance-base';
import { DEMO_INVOICES } from '../data/finance-invoices';
import { DEMO_CUSTOMERS, DEMO_PRODUCTS } from '../data/core';
import { ago, dayAgo } from '../seed';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';

const NOT_FOUND_STATUS = 404;
const COMMERCIAL_DEADLINE_DAYS = 8;
const MS_PER_DAY = 86_400_000;
const ENVELOPE_COUNT = 12;

// ── Faturalar ──────────────────────────────────────────────────────────────────

function invoices(request: DemoRequest) {
  const direction = request.query.get('direction');
  const status = request.query.get('status');
  const supplierId = Number(request.query.get('supplierId')) || null;
  return DEMO_INVOICES
    .filter((invoice) => (!direction || invoice.direction === direction) && (!status || invoice.status === status) && (!supplierId || invoice.supplierId === supplierId))
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
}

function invoiceById(request: DemoRequest) {
  return DEMO_INVOICES.find((invoice) => invoice.id === Number(request.params.id)) ?? new DemoHttpResponse(NOT_FOUND_STATUS);
}

// ── Seriler, adres defteri, zarflar ────────────────────────────────────────────

const SERIES: InvoiceSeries[] = [
  { id: 1, billingEntityId: TR_ENTITY_ID, billingEntityName: BILLING_ENTITIES[0].legalName, code: 'DMO', scenario: 'EArsivFatura', description: 'Pazaryeri e-Arşiv', isActive: true, isDefault: true, lastInvoiceNumber: 'DMO2026000001071', lastSequence: 1071, year: new Date().getFullYear() },
  { id: 2, billingEntityId: TR_ENTITY_ID, billingEntityName: BILLING_ENTITIES[0].legalName, code: 'DME', scenario: 'EFatura', description: 'Kurumsal e-Fatura', isActive: true, isDefault: true, lastInvoiceNumber: 'DME2026000000214', lastSequence: 214, year: new Date().getFullYear() },
  { id: 3, billingEntityId: TR_ENTITY_ID, billingEntityName: BILLING_ENTITIES[0].legalName, code: 'DMI', scenario: 'EArsivFatura', description: 'İade faturaları', isActive: false, isDefault: false, lastInvoiceNumber: null, lastSequence: 0, year: new Date().getFullYear() },
  { id: 4, billingEntityId: UK_ENTITY_ID, billingEntityName: BILLING_ENTITIES[1].legalName, code: 'DMU', scenario: 'EArsivFatura', description: 'UK satış faturaları', isActive: true, isDefault: true, lastInvoiceNumber: 'DMU2026000000096', lastSequence: 96, year: new Date().getFullYear() },
];

function series(request: DemoRequest): InvoiceSeries[] {
  const billingEntityId = Number(request.query.get('billingEntityId')) || null;
  return billingEntityId ? SERIES.filter((item) => item.billingEntityId === billingEntityId) : SERIES;
}

function addressBook(request: DemoRequest): AddressBookEntry[] {
  const search = request.query.get('search')?.toLocaleLowerCase('tr');
  return DEMO_CUSTOMERS.slice(0, 8).map((customer, index): AddressBookEntry => ({
    id: index + 1,
    billingEntityId: TR_ENTITY_ID,
    entryType: index % 4 === 3 ? 'Nakliye' : 'Alici',
    displayName: `${customer.name} Ticaret Ltd. Şti.`,
    taxNumber: `99900003${String(index).padStart(2, '0')}`,
    title: `${customer.name} Ticaret Ltd. Şti.`,
    firstName: null, lastName: null,
    alias: `urn:mail:defaultpk${index + 1}@example.com`,
    taxOffice: 'Demo Vergi Dairesi',
    streetName: `Örnek Cadde ${index + 3}`,
    buildingName: null, buildingNumber: String(index + 10), doorNumber: null,
    citySubdivisionName: null, district: 'Merkez', cityName: customer.city, postalZone: '34000', country: 'Türkiye',
    phone: customer.phone, email: customer.email, webSite: null, notes: null, isActive: true,
  })).filter((entry) => !search || entry.displayName.toLocaleLowerCase('tr').includes(search));
}

const ENVELOPE_STATUSES: EInvoiceEnvelope['status'][] = ['Gonderildi', 'Gonderildi', 'Gonderildi', 'Gonderilecek', 'Gonderilemedi', 'Taslak'];

function envelopes(request: DemoRequest): EInvoiceEnvelope[] {
  const direction = request.query.get('direction');
  const status = request.query.get('status');
  return Array.from({ length: ENVELOPE_COUNT }, (_, index): EInvoiceEnvelope => {
    const invoice = DEMO_INVOICES[index * 2];
    const itemStatus = ENVELOPE_STATUSES[index % ENVELOPE_STATUSES.length];
    return {
      id: index + 1,
      envelopeId: itemStatus === 'Taslak' ? null : `00000000-0000-4000-9000-${String(200000000000 + index)}`,
      direction: index % 5 === 4 ? 'Incoming' : 'Outgoing',
      status: itemStatus,
      billingEntityId: invoice.billingEntityId,
      billingEntityName: invoice.billingEntityName,
      documentCount: 1,
      sentAt: itemStatus === 'Gonderildi' ? ago(index * 3 + 1) : null,
      gibStatusCode: itemStatus === 'Gonderildi' ? '1300' : null,
      gibStatusMessage: itemStatus === 'Gonderildi' ? 'Başarıyla tamamlandı' : null,
      errorMessage: itemStatus === 'Gonderilemedi' ? 'Alıcı posta kutusu bulunamadı (demo)' : null,
      createdAt: ago(index * 3 + 1),
      invoices: [{ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, amount: invoice.amount, currency: invoice.currency }],
    };
  }).filter((item) => (!direction || item.direction === direction) && (!status || item.status === status));
}

// ── Ticari yanıt ve 3'lü eşleştirme ────────────────────────────────────────────

function commercialStatus(request: DemoRequest): CommercialStatus | DemoHttpResponse {
  const invoice = DEMO_INVOICES.find((item) => item.id === Number(request.params.id));
  if (!invoice) return new DemoHttpResponse(NOT_FOUND_STATUS);
  const ageDays = Math.floor((Date.now() - new Date(invoice.invoiceDate).getTime()) / MS_PER_DAY);
  const daysRemaining = Math.max(0, COMMERCIAL_DEADLINE_DAYS - ageDays);
  return {
    invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, ettn: invoice.ettn, invoiceDate: invoice.invoiceDate,
    daysRemaining, isExpired: daysRemaining === 0,
    currentStatus: daysRemaining === 0 ? 'Süre doldu' : 'Yanıt bekleniyor',
    responseType: null, rejectionReason: null, profile: 'Ticari',
    canRespond: daysRemaining > 0, cannotRespondReason: daysRemaining > 0 ? null : '8 günlük yanıt süresi dolmuş.',
    receivedAt: invoice.invoiceDate, responses: [], objections: [],
  };
}

function supplierMatches(request: DemoRequest): PurchaseMatchingResult[] {
  const supplierId = Number(request.params.id);
  return DEMO_INVOICES.filter((invoice) => invoice.supplierId === supplierId).slice(0, 4).map((invoice, index) => {
    const matched = index % 2 === 0;
    const orderTotal = matched ? invoice.amount : round2(invoice.amount * 0.96);
    return {
      invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, purchaseOrderId: 500 + invoice.id, orderNumber: `SA-2026-${String(400 + invoice.id)}`,
      matchStatus: matched ? 'Matched' : 'PartialMatch', isMatched: matched,
      invoiceTotal: invoice.amount, orderTotal, totalDifference: round2(invoice.amount - orderTotal),
      discrepancies: matched ? [] : ['Birim fiyat siparişten yüksek'],
      lineMatches: invoice.lines.map((line) => ({
        description: line.description, poQuantity: line.quantity, invoiceQuantity: line.quantity,
        poUnitPrice: matched ? line.unitPrice : round2(line.unitPrice * 0.96), invoiceUnitPrice: line.unitPrice,
        hasPriceDifference: !matched, priceDifferencePercent: matched ? 0 : 4.2, hasQuantityDifference: false, notes: null,
      })),
      matchedAt: ago(index + 2),
    };
  });
}

// ── Trendyol fatura yükleme ────────────────────────────────────────────────────

const ERP_SOURCES: ErpSourceOption[] = [
  { sourceId: 1, storeId: 1, label: 'Demo ERP - Mağaza A' },
  { sourceId: 2, storeId: 2, label: 'Demo ERP - Mağaza B' },
];
const MARKETPLACE_CONNECTIONS: MarketplaceConnectionOption[] = [
  { connectionId: 1, label: 'Trendyol - Mağaza A' },
  { connectionId: 2, label: 'Trendyol - Mağaza B' },
];

const BATCH_SEEDS: [string, number, number, number, number][] = [
  ['batch-0003', 5, 64, 58, 52],
  ['batch-0002', 12, 120, 118, 118],
  ['batch-0001', 21, 86, 80, 80],
];

const BATCH_SUMMARIES: InvoiceUploadBatchSummary[] = BATCH_SEEDS.map(([batchId, age, files, matched, sent], index) => ({
  batchId, erpLabel: ERP_SOURCES[index % 2].label, connectionLabel: MARKETPLACE_CONNECTIONS[index % 2].label,
  windowFromDate: dayAgo(age + 7), windowToDate: dayAgo(age), createdAt: ago(age),
  fileCount: files, matchedCount: matched, sentCount: sent, totalOrdersInWindow: files + 3, matchedOrderCount: matched,
}));

function batchFiles(batchId: string, count: number): InvoiceUploadFile[] {
  return Array.from({ length: count }, (_, index) => {
    const customer = DEMO_CUSTOMERS[index % DEMO_CUSTOMERS.length];
    const product = DEMO_PRODUCTS[(index * 3) % DEMO_PRODUCTS.length];
    const matched = index % 7 !== 6;
    const orderNumber = `${10460000000 + index * 211}`;
    return {
      fileId: `${batchId}-f${index}`,
      fileName: `fatura-${String(index + 1).padStart(3, '0')}.pdf`,
      status: matched ? 'AutoMatched' : index % 2 === 0 ? 'Unmatched' : 'Ambiguous',
      parsedCustomerName: customer.name,
      invoiceNumber: `DMO2026${String(5000 + index).padStart(9, '0')}`,
      candidates: [{
        platformOrderNumber: orderNumber, shipmentPackageId: 7_000_000 + index, customerName: customer.name,
        totalAmount: product.price, orderDate: ago(index % 6 + 1), productSummary: [`${product.name} ×1`],
      }],
      sendStatus: matched && index % 5 !== 4 ? 'Sent' : 'NotSent',
      sendErrorMessage: null,
      selectedShipmentPackageId: matched ? 7_000_000 + index : null,
      selectedPlatformOrderNumber: matched ? orderNumber : null,
    };
  });
}

function batchDetail(request: DemoRequest): InvoiceUploadBatch | DemoHttpResponse {
  const summary = BATCH_SUMMARIES.find((item) => item.batchId === request.params.id);
  if (!summary) return new DemoHttpResponse(NOT_FOUND_STATUS);
  return {
    batchId: summary.batchId, erpLabel: summary.erpLabel, connectionLabel: summary.connectionLabel,
    windowFromDate: summary.windowFromDate, windowToDate: summary.windowToDate,
    files: batchFiles(summary.batchId, Math.min(summary.fileCount, 40)),
    totalOrdersInWindow: summary.totalOrdersInWindow, matchedOrderCount: summary.matchedOrderCount,
  };
}

export const financeInvoicingRoutes: DemoRoute[] = [
  get('/invoices/:id/send-jobs', () => []),
  get('/invoices/:id', invoiceById),
  get('/invoices', invoices),
  get('/invoicing/series', series),
  get('/invoicing/address-book', addressBook),
  get('/invoicing/envelopes', envelopes),
  get('/purchase-matching/invoices/:id/commercial-status', commercialStatus),
  get('/purchase-matching/suppliers/:id', supplierMatches),
  get('/trendyol-invoices/erp-sources', () => ERP_SOURCES),
  get('/trendyol-invoices/marketplace-connections', () => MARKETPLACE_CONNECTIONS),
  get('/trendyol-invoices/batches/:id', batchDetail),
  get('/trendyol-invoices/batches', () => BATCH_SUMMARIES),
];
