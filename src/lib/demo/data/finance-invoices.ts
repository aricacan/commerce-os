// Fatura mock verisi: kesilen (satış) ve gelen (alış) faturalar.
import type { EInvoiceStatus, Invoice, InvoiceLine, InvoiceStatus } from '../../api/invoice';
import { DEMO_PRODUCTS, DEMO_STORES } from './core';
import { TR_ENTITY_ID, UK_ENTITY_ID, BILLING_ENTITIES } from './finance-accounting';
import { GBP_TRY_RATE, round2 } from './finance-base';
import { ago, createRng, dayAgo } from '../seed';

const INVOICE_COUNT = 72;
const VAT_RATE = 20;
const MAX_INVOICE_AGE_DAYS = 120;

export const INVOICE_SUPPLIERS = [
  'Örnek Tedarik Sanayi Ltd.', 'Anadolu Aksesuar Üretim A.Ş.', 'Demo Plastik ve Kauçuk San.', 'Birlik Elektronik Dağıtım',
  'Yıldız Ambalaj Ticaret', 'Pacific Auto Components Ltd',
];
const BUYERS = [
  'Güneş Oto Yedek Parça', 'Marmara Aksesuar Ticaret', 'Anadolu Oto Market', 'Ege Araç Donanım', 'Boğaz Oto Center',
  'Kuzey Filo Hizmetleri', 'Karadeniz Oto Pazarı', 'Pazaryeri Hizmet Platformu A.Ş.',
];
const OUTGOING_STATUSES: InvoiceStatus[] = ['Issued', 'Issued', 'Issued', 'Issued', 'Approved', 'Draft', 'Cancelled'];
const EINVOICE_BY_STATUS: Record<InvoiceStatus, EInvoiceStatus> = {
  Issued: 'Accepted', Approved: 'Prepared', Draft: 'NotCreated', Cancelled: 'Cancelled', Error: 'Failed',
};

function buildLines(rng: ReturnType<typeof createRng>, seedIndex: number): InvoiceLine[] {
  const count = rng.int(1, 4);
  return Array.from({ length: count }, (_, lineIndex) => {
    const product = DEMO_PRODUCTS[(seedIndex * 5 + lineIndex * 3) % DEMO_PRODUCTS.length];
    const quantity = rng.int(1, 12);
    const unitPrice = round2(product.price / (1 + VAT_RATE / 100));
    const lineTotal = round2(unitPrice * quantity);
    return {
      id: seedIndex * 10 + lineIndex,
      description: product.name,
      quantity, unit: 'Adet', unitPrice, vatRate: VAT_RATE,
      vatAmount: round2(lineTotal * (VAT_RATE / 100)),
      lineTotal,
      taxCodeId: 1, taxCodeName: 'KDV %20',
      withholdingRate: null, withholdingAmount: null, exemptionReasonCode: null, withholdingCode: null,
      allowanceCharges: [],
    };
  });
}

function buildInvoice(index: number): Invoice {
  const rng = createRng(index * 13 + 7);
  const outgoing = index % 3 !== 2;
  const ageDays = Math.floor((index / INVOICE_COUNT) * MAX_INVOICE_AGE_DAYS);
  const billingEntityId = index % 9 === 0 ? UK_ENTITY_ID : TR_ENTITY_ID;
  const isUk = billingEntityId === UK_ENTITY_ID;
  const status = outgoing ? OUTGOING_STATUSES[index % OUTGOING_STATUSES.length] : 'Issued';
  const lines = buildLines(rng, index).map((line) => (isUk ? { ...line, unitPrice: round2(line.unitPrice / GBP_TRY_RATE), lineTotal: round2(line.lineTotal / GBP_TRY_RATE), vatAmount: round2(line.vatAmount / GBP_TRY_RATE) } : line));
  const net = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const vatAmount = round2(lines.reduce((sum, line) => sum + line.vatAmount, 0));
  const supplierIndex = index % INVOICE_SUPPLIERS.length;
  const store = DEMO_STORES[index % DEMO_STORES.length];
  const number = `${isUk ? 'DMU' : 'DMO'}2026${String(1000 + index).padStart(9, '0')}`;
  return {
    id: index + 1,
    direction: outgoing ? 'Outgoing' : 'Incoming',
    supplierId: outgoing ? null : supplierIndex + 1,
    supplierName: outgoing ? null : INVOICE_SUPPLIERS[supplierIndex],
    orderId: outgoing && index % 2 === 0 ? 90000 + index : null,
    billingEntityId,
    billingEntityName: BILLING_ENTITIES.find((entity) => entity.id === billingEntityId)?.legalName ?? null,
    invoiceNumber: number,
    invoiceDate: dayAgo(ageDays),
    amount: round2(net + vatAmount),
    vatAmount,
    currency: isUk ? 'GBP' : 'TRY',
    status,
    source: 'Manual',
    providerReferenceId: null,
    ettn: outgoing && status === 'Issued' ? `00000000-0000-4000-8000-${String(100000000000 + index)}` : null,
    customizationNumber: null,
    scenario: outgoing ? (index % 4 === 0 ? 'EFatura' : 'EArsivFatura') : 'EFatura',
    issueTime: '10:30:00',
    buyerName: outgoing ? BUYERS[index % BUYERS.length] : null,
    buyerTaxNumber: outgoing ? `99900002${String(index % 100).padStart(2, '0')}` : null,
    buyerTaxOffice: outgoing ? 'Demo Vergi Dairesi' : null,
    buyerAddress: outgoing ? 'Örnek Mahallesi 12. Cadde No:5' : null,
    isCreditNote: false,
    originalInvoiceId: null,
    originalInvoiceNumber: null,
    notes: null,
    lines,
    createdAt: ago(ageDays),
    updatedAt: ago(Math.max(0, ageDays - 1)),
    einvoiceStatus: outgoing ? EINVOICE_BY_STATUS[status] : 'Accepted',
    providerStatusCode: null,
    providerStatusMessage: null,
    invoiceTypeCode: 'SATIS',
    approvedByUserId: status === 'Draft' ? null : 1,
    approvedAt: status === 'Draft' ? null : ago(ageDays),
    localInvoiceNumber: null,
    storeId: outgoing ? DEMO_STORES.indexOf(store) + 1 : null,
    storeName: outgoing ? store.name : null,
    cashRegisterCode: null,
    deliveryChannel: 'Elektronik',
    otvAmount: null,
    oivAmount: null,
    periodStartDate: null,
    periodEndDate: null,
    tags: null,
    roundingAmount: null,
    chargeTotal: null,
    manualPayableAmount: null,
  };
}

export const DEMO_INVOICES: Invoice[] = Array.from({ length: INVOICE_COUNT }, (_, index) => buildInvoice(index));
