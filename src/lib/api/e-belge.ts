import { request, BASE, authHeader, getStoreHeaders, throwIfNotOk } from './core';

// ─── e-Belge paneli (QNB eSolutions muadili) ──────────────────────────────────
// Referans: docs/muhasebe/karsilastirma/uygulama-plani.md → FAZ 5
// Bu dosya FAZ 1-2'de yazılmış ama ekranı olmayan uçları tek yerde toplar.

// ── Fatura Serileri ───────────────────────────────────────────────────────────

export type EInvoiceScenario = 'EFatura' | 'EArsivFatura';

export const SCENARIO_LABEL: Record<EInvoiceScenario, string> = {
  EFatura: 'e-Fatura',
  EArsivFatura: 'e-Arşiv',
};

export interface InvoiceSeries {
  id: number;
  billingEntityId: number;
  billingEntityName: string;
  code: string;
  scenario: EInvoiceScenario;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  /** İlgili yılda bu seriden kesilmiş son fatura numarası; hiç kesilmemişse null. */
  lastInvoiceNumber: string | null;
  lastSequence: number;
  year: number;
}

export interface CreateInvoiceSeriesBody {
  billingEntityId: number;
  code: string;
  scenario: EInvoiceScenario;
  description?: string | null;
  isDefault?: boolean;
}

export const invoiceSeriesApi = {
  list: (billingEntityId?: number, year?: number) => {
    const qs = new URLSearchParams();
    if (billingEntityId) qs.set('billingEntityId', String(billingEntityId));
    if (year) qs.set('year', String(year));
    const suffix = qs.toString() ? `?${qs}` : '';
    return request<InvoiceSeries[]>(`/invoicing/series${suffix}`);
  },
  create: (body: CreateInvoiceSeriesBody) =>
    request<InvoiceSeries>('/invoicing/series', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { description: string | null; isActive: boolean; isDefault: boolean }) =>
    request<InvoiceSeries>(`/invoicing/series/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/invoicing/series/${id}`, { method: 'DELETE' }),
};

// ── KDV Özeti (KDV-1 beyanname tabanı) ────────────────────────────────────────

export interface VatRateBreakdown {
  vatRate: number;
  taxableAmount: number;
  vatAmount: number;
  invoiceCount: number;
}

/** Tevkifat kod bazında kırılım (FAZ 3.2 — D-08). Kod GİB'in tevkifat kod kataloğundan gelir,
 * kataloğu doğrulamadığımız için serbest string tutulur. */
export interface WithholdingBreakdown {
  withholdingCode: string | null;
  taxableAmount: number;
  withholdingAmount: number;
  lineCount: number;
}

export interface VatSummary {
  billingEntityId: number;
  billingEntityName: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  totalSalesRevenue: number;
  totalPurchaseExpenses: number;
  /** 391 Hesaplanan KDV */
  totalCalculatedVat: number;
  /** 191 İndirilecek KDV */
  totalDeductibleVat: number;
  /** 360 Ödenecek KDV */
  payableVat: number;
  /** 190 Devreden KDV */
  carryForwardVat: number;
  salesVatBreakdown: VatRateBreakdown[];
  purchaseVatBreakdown: VatRateBreakdown[];
  statusSummary: string;
  totalWithholdingAmount: number;
  withholdingBreakdown: WithholdingBreakdown[] | null;
  /** TL karşılığı hesaplanamadığı için (kur eksik) dönemin toplamlarına DAHİL EDİLMEYEN fatura sayısı. */
  unconvertedCurrencyInvoiceCount: number;
}

export interface EmailVatSummaryBody {
  billingEntityId: number;
  year: number;
  month: number;
  recipientEmail: string;
  recipientName?: string | null;
}

export const vatSummaryApi = {
  get: (billingEntityId: number, year: number, month: number) =>
    request<VatSummary>(`/accounting/vat-summary?billingEntityId=${billingEntityId}&year=${year}&month=${month}`),
  // Mali müşavire rapor e-postası (FAZ 7.2 — Y-17). SMTP yapılandırılmamışsa backend açık
  // hata döner — burada yutulmaz, çağıran yüzeye taşır.
  emailMonthlySummary: (body: EmailVatSummaryBody) =>
    request<void>('/accounting/vat-summary/email', { method: 'POST', body: JSON.stringify(body) }),
};

// ── e-Defter Dönem Özeti ──────────────────────────────────────────────────────

export interface ELedgerSummary {
  billingEntityId: number;
  legalName: string;
  taxNumber: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  totalJournalEntries: number;
  totalJournalLines: number;
  firstEntryNumber: string | null;
  lastEntryNumber: string | null;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  isBalanced: boolean;
  activeAccountsCount: number;
  /** Dönem içeriğinin SHA-256 özeti (iç bütünlük damgası — resmi GİB beratı DEĞİL). */
  sha256Hash: string;
  statusSummary: string;
}

export const eLedgerApi = {
  summary: (billingEntityId: number, year: number, month: number) =>
    request<ELedgerSummary>(`/accounting/e-ledger/summary?billingEntityId=${billingEntityId}&year=${year}&month=${month}`),
  /**
   * Dönem özeti XML'ini indirir. Resmi GİB beratı DEĞİLDİR — imzasız ve XBRL-GL
   * formatında değil (bkz. backend ELedgerService.GenerateBeratXmlAsync yorumu).
   */
  downloadSummaryXml: async (
    billingEntityId: number,
    year: number,
    month: number,
    ledgerType: 'YEVMIYE' | 'KEBIR',
  ): Promise<{ fileName: string; blob: Blob }> => {
    const qs = `billingEntityId=${billingEntityId}&year=${year}&month=${month}&ledgerType=${ledgerType}`;
    const res = await fetch(`${BASE}/accounting/e-ledger/berat-xml?${qs}`, {
      headers: { ...getStoreHeaders(), ...authHeader() },
      credentials: 'include',
    });
    await throwIfNotOk(res);
    return {
      fileName: `defter-ozeti-${ledgerType.toLowerCase()}-${year}-${String(month).padStart(2, '0')}.xml`,
      blob: await res.blob(),
    };
  },
};

// ── e-Arşiv Günlük Rapor İzleme ────────────────────────────────────────────────
// FAZ 7.1 — bu ekran GİB'e OTOMATİK RAPOR GÖNDERMEZ (henüz bağlı bir e-Belge
// entegratörü yok); yalnızca kullanıcının hangi günün e-Arşiv faturalarını GİB'e
// elle bildirdiğini işaretleyip takip etmesini sağlayan manuel bir kontrol listesidir.

export interface EArchiveDailyReportSummary {
  reportDate: string;
  invoiceCount: number;
  totalAmount: number;
  isReported: boolean;
  reportedAt: string | null;
  note: string | null;
}

export const eArchiveDailyReportApi = {
  list: (billingEntityId: number, from: string, to: string) =>
    request<EArchiveDailyReportSummary[]>(
      `/accounting/e-archive-daily-report?billingEntityId=${billingEntityId}&from=${from}&to=${to}`
    ),
  markReported: (billingEntityId: number, reportDate: string, note?: string | null) =>
    request<void>(`/accounting/e-archive-daily-report/${billingEntityId}/${reportDate}/mark-reported`, {
      method: 'POST',
      body: JSON.stringify({ note: note || null }),
    }),
  unmarkReported: (billingEntityId: number, reportDate: string) =>
    request<void>(`/accounting/e-archive-daily-report/${billingEntityId}/${reportDate}/unmark-reported`, {
      method: 'POST',
    }),
};

// ── Pazaryeri Mutabakatı ──────────────────────────────────────────────────────

export type ReconciliationStatus =
  | 'NoSettlementData'
  | 'PendingInvoice'
  | 'FullyReconciled'
  | 'DiscrepancyDetected';

export interface MarketplaceSettlementLine {
  orderNumber: string;
  orderDate: string | null;
  grossAmount: number;
  commissionAmount: number;
  commissionRate: number;
  cargoAmount: number;
  otherDeductions: number;
  netPayout: number;
  transactionStatus: string;
}

export interface MarketplaceReconciliationSummary {
  storeId: number | null;
  storeName: string;
  platformName: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  totalOrders: number;
  grossSales: number;
  totalCommission: number;
  totalCargo: number;
  totalOtherDeductions: number;
  netPayout: number;
  matchedInvoicesCount: number;
  matchedInvoicesTotal: number;
  discrepancyAmount: number;
  status: ReconciliationStatus;
  summaryNotes: string;
  recentLines: MarketplaceSettlementLine[];
}

export interface ReconcileResult {
  invoiceId: number;
  invoiceNumber: string;
  invoiceAmount: number;
  calculatedCommissionTotal: number;
  discrepancy: number;
  discrepancyPercent: number;
  isMatched: boolean;
  message: string;
}

export const marketplaceReconciliationApi = {
  summary: (year: number, month: number, storeId?: number | null) => {
    const qs = new URLSearchParams({ year: String(year), month: String(month) });
    if (storeId) qs.set('storeId', String(storeId));
    return request<MarketplaceReconciliationSummary>(`/accounting/marketplace-reconciliation/summary?${qs}`);
  },
  matchInvoice: (body: { invoiceId: number; storeId: number | null; year: number; month: number; tolerancePercent?: number }) =>
    request<ReconcileResult>('/accounting/marketplace-reconciliation/match-invoice', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── 3-Way Matching (fatura ↔ sipariş ↔ mal kabul) ─────────────────────────────

export type PurchaseMatchStatus = 'Unmatched' | 'Matched' | 'PartialMatch' | 'Disputed';

export const MATCH_STATUS_LABEL: Record<PurchaseMatchStatus, string> = {
  Unmatched: 'Eşleşmedi',
  Matched: 'Tam Eşleşti',
  PartialMatch: 'Kısmi Eşleşme',
  Disputed: 'Uyuşmazlık',
};

export interface PurchaseOrderLineMatch {
  description: string;
  poQuantity: number;
  invoiceQuantity: number;
  poUnitPrice: number;
  invoiceUnitPrice: number;
  hasPriceDifference: boolean;
  priceDifferencePercent: number;
  hasQuantityDifference: boolean;
  notes: string | null;
}

export interface PurchaseMatchingResult {
  invoiceId: number;
  invoiceNumber: string;
  purchaseOrderId: number;
  orderNumber: string;
  matchStatus: PurchaseMatchStatus;
  isMatched: boolean;
  invoiceTotal: number;
  orderTotal: number;
  totalDifference: number;
  discrepancies: string[];
  lineMatches: PurchaseOrderLineMatch[];
  matchedAt: string;
}

export const purchaseMatchingApi = {
  match: (invoiceId: number, purchaseOrderId?: number) => {
    const qs = purchaseOrderId ? `?purchaseOrderId=${purchaseOrderId}` : '';
    return request<PurchaseMatchingResult>(`/purchase-matching/invoices/${invoiceId}/match${qs}`, { method: 'POST' });
  },
  forSupplier: (supplierId: number) =>
    request<PurchaseMatchingResult[]>(`/purchase-matching/suppliers/${supplierId}`),
};

// ── Adres Defteri ─────────────────────────────────────────────────────────────

export type AddressBookEntryType = 'Alici' | 'YabanciFirma' | 'Nakliye';

export const ADDRESS_BOOK_TYPE_LABEL: Record<AddressBookEntryType, string> = {
  Alici: 'Alıcı',
  YabanciFirma: 'Yabancı Firma',
  Nakliye: 'Nakliye',
};

export interface AddressBookEntry {
  id: number;
  billingEntityId: number;
  entryType: AddressBookEntryType;
  displayName: string;
  taxNumber: string | null;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  /** Alıcının GİB posta kutusu etiketi — yanlışsa zarf ULAŞMAZ. */
  alias: string | null;
  taxOffice: string | null;
  streetName: string | null;
  buildingName: string | null;
  buildingNumber: string | null;
  doorNumber: string | null;
  citySubdivisionName: string | null;
  district: string | null;
  cityName: string | null;
  postalZone: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  webSite: string | null;
  notes: string | null;
  isActive: boolean;
}

export type SaveAddressBookEntryBody = Omit<AddressBookEntry, 'id' | 'displayName'>;

export const addressBookApi = {
  list: (billingEntityId?: number, entryType?: string, search?: string) => {
    const qs = new URLSearchParams();
    if (billingEntityId) qs.set('billingEntityId', String(billingEntityId));
    if (entryType) qs.set('entryType', entryType);
    if (search) qs.set('search', search);
    const suffix = qs.toString() ? `?${qs}` : '';
    return request<AddressBookEntry[]>(`/invoicing/address-book${suffix}`);
  },
  create: (body: SaveAddressBookEntryBody) =>
    request<AddressBookEntry>('/invoicing/address-book', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: SaveAddressBookEntryBody) =>
    request<AddressBookEntry>(`/invoicing/address-book/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/invoicing/address-book/${id}`, { method: 'DELETE' }),
};

// ── Zarflar ───────────────────────────────────────────────────────────────────

export type EnvelopeDirection = 'Outgoing' | 'Incoming';
export type EnvelopeStatus = 'Taslak' | 'Gonderilecek' | 'Gonderildi' | 'Gonderilemedi' | 'AliciyaUlasmadi';

export const ENVELOPE_STATUS_LABEL: Record<EnvelopeStatus, string> = {
  Taslak: 'Taslak',
  Gonderilecek: 'Gönderilecek',
  Gonderildi: 'Gönderildi',
  Gonderilemedi: 'Gönderilemedi',
  AliciyaUlasmadi: 'Alıcısına Ulaşmadı',
};

export interface EnvelopeInvoice {
  invoiceId: number;
  invoiceNumber: string;
  amount: number;
  currency: string;
}

export interface EInvoiceEnvelope {
  id: number;
  envelopeId: string | null;
  direction: EnvelopeDirection;
  status: EnvelopeStatus;
  billingEntityId: number | null;
  billingEntityName: string | null;
  documentCount: number;
  sentAt: string | null;
  gibStatusCode: string | null;
  gibStatusMessage: string | null;
  errorMessage: string | null;
  createdAt: string;
  invoices: EnvelopeInvoice[];
}

export const envelopeApi = {
  list: (direction?: string, status?: string, billingEntityId?: number) => {
    const qs = new URLSearchParams();
    if (direction) qs.set('direction', direction);
    if (status) qs.set('status', status);
    if (billingEntityId) qs.set('billingEntityId', String(billingEntityId));
    const suffix = qs.toString() ? `?${qs}` : '';
    return request<EInvoiceEnvelope[]>(`/invoicing/envelopes${suffix}`);
  },
};

// ── Ticari Yanıt ve İtiraz ────────────────────────────────────────────────────

export type ApplicationResponseType = 'Kabul' | 'Red' | 'Iade';
export type ApplicationResponseStatus = 'Taslak' | 'Gonderilecek' | 'Gonderildi' | 'Gonderilemedi';

export const RESPONSE_TYPE_LABEL: Record<ApplicationResponseType, string> = {
  Kabul: 'Kabul', Red: 'Red', Iade: 'İade',
};

export const RESPONSE_STATUS_LABEL: Record<ApplicationResponseStatus, string> = {
  Taslak: 'Taslak', Gonderilecek: 'Gönderilecek', Gonderildi: 'Gönderildi', Gonderilemedi: 'Gönderilemedi',
};

export type ObjectionChannel = 'UygulamaYaniti' | 'Kep' | 'GibPortal' | 'ResmiYazi';
export type ObjectionStatus = 'Hazirlaniyor' | 'Yapildi' | 'IptalEdildi';

export const OBJECTION_CHANNEL_LABEL: Record<ObjectionChannel, string> = {
  UygulamaYaniti: 'Uygulama Yanıtı',
  Kep: 'KEP',
  GibPortal: 'GİB Portalı',
  ResmiYazi: 'Resmi Yazı',
};

export const OBJECTION_STATUS_LABEL: Record<ObjectionStatus, string> = {
  Hazirlaniyor: 'Hazırlanıyor', Yapildi: 'Yapıldı', IptalEdildi: 'İptal Edildi',
};

export interface ApplicationResponse {
  id: number;
  invoiceId: number;
  responseType: ApplicationResponseType;
  status: ApplicationResponseStatus;
  responseNumber: string | null;
  reason: string | null;
  note: string | null;
  createdAt: string;
  sentAt: string | null;
  gibStatusCode: string | null;
  gibStatusMessage: string | null;
}

export interface InvoiceObjection {
  id: number;
  invoiceId: number;
  channel: ObjectionChannel;
  status: ObjectionStatus;
  objectionDate: string | null;
  reference: string | null;
  reason: string;
  documentPath: string | null;
  createdAt: string;
}

export interface CommercialStatus {
  invoiceId: number;
  invoiceNumber: string;
  ettn: string | null;
  invoiceDate: string;
  daysRemaining: number;
  isExpired: boolean;
  currentStatus: string;
  responseType: string | null;
  rejectionReason: string | null;
  /** GİB fatura türü — yalnızca "Ticari" olana yanıt verilebilir. */
  profile: string | null;
  canRespond: boolean;
  cannotRespondReason: string | null;
  /** 8 günlük sürenin işlemeye başladığı an. */
  receivedAt: string | null;
  responses: ApplicationResponse[];
  objections: InvoiceObjection[];
}

export const commercialApi = {
  status: (invoiceId: number) =>
    request<CommercialStatus>(`/purchase-matching/invoices/${invoiceId}/commercial-status`),
  createResponse: (invoiceId: number, body: { responseType: ApplicationResponseType; reason?: string | null; note?: string | null }) =>
    request<ApplicationResponse>(`/purchase-matching/invoices/${invoiceId}/commercial-responses`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  queueResponse: (responseId: number) =>
    request<ApplicationResponse>(`/purchase-matching/commercial-responses/${responseId}/queue`, { method: 'POST' }),
  deleteResponse: (responseId: number) =>
    request<void>(`/purchase-matching/commercial-responses/${responseId}`, { method: 'DELETE' }),
  createObjection: (invoiceId: number, body: {
    channel: ObjectionChannel;
    reason: string;
    objectionDate?: string | null;
    reference?: string | null;
  }) =>
    request<InvoiceObjection>(`/purchase-matching/invoices/${invoiceId}/objections`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateObjection: (objectionId: number, body: {
    status: ObjectionStatus;
    objectionDate?: string | null;
    reference?: string | null;
  }) =>
    request<InvoiceObjection>(`/purchase-matching/objections/${objectionId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};
