import { request, BASE, authHeader, getStoreHeaders, throwIfNotOk } from './core';

// ─── Fatura Takibi (Faz 3/4) ───────────────────────────────────────────────────
// Gerçek e-fatura KESME burada yapılmaz — bu sadece bir takip kaydı. Kullanıcı faturayı
// kendi muhasebe programında kesip numarasını buraya kaydeder (bkz. backend Invoice.cs).
// UBL-TR XML üretimi GERÇEK bir belge üretir ama İMZALAMAZ/GİB'e GÖNDERMEZ (bkz. getUblXmlUrl).

export type InvoiceDirection = 'Incoming' | 'Outgoing';
export type InvoiceStatus = 'Draft' | 'Approved' | 'Issued' | 'Cancelled' | 'Error';
export type InvoiceSource = 'Manual' | 'Provider';
// GİB'e GÖNDERİM durumu — Status'tan (yerel iş durumu) BİLİNÇLİ olarak ayrı (bkz. backend
// Invoice.cs yorumu). Sent/Delivered/Accepted sadece gerçek bir IEInvoiceProvider bağlanıp
// gerçekten gönderdiğinde set edilir — bugün hiçbiri bağlı değil.
export type EInvoiceStatus =
  | 'NotCreated' | 'Prepared' | 'Queued' | 'Sent' | 'Delivered' | 'Accepted' | 'Rejected' | 'Failed' | 'Cancelled';

export type EInvoiceSendJobStatus = 'Pending' | 'Processing' | 'Succeeded' | 'Failed';

export type InvoiceDeliveryChannel = 'Elektronik' | 'Kagit';

// GİB fatura tipi kataloğu (bkz. backend InvoiceTypeCodes.Labels) — sabit union DEĞİL, backend
// zaten serbest string kabul ediyor; burada sadece formdaki dropdown için etiketler tutulur.
export const INVOICE_TYPE_CODES: { value: string; label: string }[] = [
  { value: 'SATIS', label: 'Satış' },
  { value: 'IADE', label: 'İade' },
  { value: 'TEVKIFAT', label: 'Tevkifat' },
  { value: 'TEVKIFATIADE', label: 'Tevkifat İade' },
  { value: 'ISTISNA', label: 'İstisna' },
  { value: 'OZELMATRAH', label: 'Özel Matrah' },
  { value: 'IHRACKAYITLI', label: 'İhraç Kayıtlı' },
  { value: 'SGK', label: 'SGK' },
  { value: 'KOMISYONCU', label: 'Komisyoncu' },
  { value: 'KONAKLAMAVERGISI', label: 'Konaklama Vergisi' },
  { value: 'SARJ', label: 'Şarj' },
  { value: 'SARJANLIK', label: 'Şarj Anlık' },
  { value: 'HALSATIS', label: 'Hal Satış' },
  { value: 'HALKOMISYONCU', label: 'Hal Komisyoncu' },
  { value: 'TEKNOLOJIDESTEK', label: 'Teknoloji Destek' },
  { value: 'YATIRIMTESVIKSATIS', label: 'Yatırım Teşvik Satış' },
  { value: 'YATIRIMTESVIKISTISNA', label: 'Yatırım Teşvik İstisna' },
  { value: 'YATIRIMTESVIKIADE', label: 'Yatırım Teşvik İade' },
  { value: 'YATIRIMTESVIKTEVKIFAT', label: 'Yatırım Teşvik Tevkifat' },
  { value: 'YATIRIMTESVIKTEVKIFATIADE', label: 'Yatırım Teşvik Tevkifat İade' },
];

export interface EInvoiceSendJob {
  id: number;
  invoiceId: number;
  status: EInvoiceSendJobStatus;
  attemptCount: number;
  nextAttemptAt: string;
  lastAttemptAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineAllowanceCharge {
  id: number;
  chargeIndicator: boolean;
  reason: string | null;
  amount: number;
  multiplierFactorNumeric: number | null;
}

export interface InvoiceLine {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  taxCodeId: number | null;
  taxCodeName: string | null;
  // ACCOUNTANT_REVIEW_REQUIRED — bilgi amaçlı, fatura toplamlarını otomatik netlemez
  // (bkz. backend ITaxEngine.cs yorumu).
  withholdingRate: number | null;
  withholdingAmount: number | null;
  exemptionReasonCode: string | null;
  withholdingCode: string | null;
  allowanceCharges: InvoiceLineAllowanceCharge[];
}

export interface Invoice {
  id: number;
  direction: InvoiceDirection;
  supplierId: number | null;
  supplierName: string | null;
  orderId: number | null;
  billingEntityId: number | null;
  billingEntityName: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  vatAmount: number | null;
  currency: string;
  status: InvoiceStatus;
  source: InvoiceSource;
  providerReferenceId: string | null;
  ettn: string | null;
  customizationNumber: string | null;
  scenario: string | null;
  issueTime: string | null;
  buyerName: string | null;
  buyerTaxNumber: string | null;
  buyerTaxOffice: string | null;
  buyerAddress: string | null;
  isCreditNote: boolean;
  originalInvoiceId: number | null;
  originalInvoiceNumber: string | null;
  notes: string | null;
  lines: InvoiceLine[];
  createdAt: string;
  updatedAt: string;
  einvoiceStatus: EInvoiceStatus;
  providerStatusCode: string | null;
  providerStatusMessage: string | null;
  // GİB'in bilinen fatura tipleri (SATIS/IADE/TEVKIFAT/ISTISNA/OZELMATRAH/IHRACKAYITLI) —
  // sabit bir union DEĞİL, backend'de de serbest string (yeni bir tip eklendiğinde tek satır
  // sabit ekler, deploy gerekmez).
  invoiceTypeCode: string | null;
  approvedByUserId: number | null;
  approvedAt: string | null;
  // FAZ 6 — QNB'deki "Yerel Fatura No" / şube-kasa / kağıt-elektronik karşılıkları.
  localInvoiceNumber: string | null;
  storeId: number | null;
  storeName: string | null;
  cashRegisterCode: string | null;
  deliveryChannel: InvoiceDeliveryChannel;
  // ── FAZ 8 ────────────────────────────────────────────────────────────────
  otvAmount: number | null;
  oivAmount: number | null;
  periodStartDate: string | null;
  periodEndDate: string | null;
  tags: string | null;
  // ── FAZ 3.4 (GİB UBL cac:LegalMonetaryTotal) ────────────────────────────────
  roundingAmount: number | null;
  chargeTotal: number | null;
  manualPayableAmount: number | null;
}

export interface CreateInvoiceLineBody {
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  vatRate: number;
  // Doluysa VatRate/VatAmount backend'de ITaxEngine tarafından katalogdan YENİDEN hesaplanır
  // (girilen vatRate göz ardı edilir) — katalog otoriter kaynak.
  taxCodeId?: number;
  discountAmount?: number;
  withholdingRate?: number;
  exemptionReasonCode?: string;
  withholdingCode?: string;
}

export interface InvoiceLineExcelWarning {
  rowNumber: number;
  message: string;
}

export interface InvoiceLineExcelParseResult {
  lines: CreateInvoiceLineBody[];
  warnings: InvoiceLineExcelWarning[];
  headerRowNumber: number;
  columnMapping: Record<string, string>;
}

export interface CreateInvoiceBody {
  direction: InvoiceDirection;
  supplierId?: number;
  orderId?: number;
  billingEntityId?: number;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  vatAmount?: number;
  currency?: string;
  /** Fatura para birimi TRY değilse ZORUNLU (1 birim döviz = kaç TL). */
  exchangeRate?: number;
  exchangeRateDate?: string;
  notes?: string;
  lines?: CreateInvoiceLineBody[];
  buyerName?: string;
  buyerTaxNumber?: string;
  buyerTaxOffice?: string;
  buyerAddress?: string;
  isCreditNote?: boolean;
  originalInvoiceId?: number;
  invoiceTypeCode?: string;
  localInvoiceNumber?: string;
  storeId?: number;
  cashRegisterCode?: string;
  deliveryChannel?: InvoiceDeliveryChannel;
  otvAmount?: number;
  oivAmount?: number;
  periodStartDate?: string;
  periodEndDate?: string;
  tags?: string;
  roundingAmount?: number;
  chargeTotal?: number;
  manualPayableAmount?: number;
}

export const invoiceApi = {
  list: (params?: { direction?: InvoiceDirection; status?: InvoiceStatus; supplierId?: number }) => {
    const q = new URLSearchParams();
    if (params?.direction) q.set('direction', params.direction);
    if (params?.status) q.set('status', params.status);
    if (params?.supplierId) q.set('supplierId', String(params.supplierId));
    return request<Invoice[]>(`/invoices?${q}`);
  },

  getById: (id: number) => request<Invoice>(`/invoices/${id}`),

  create: (body: CreateInvoiceBody) =>
    request<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(body) }),

  updateStatus: (id: number, status: InvoiceStatus, notes?: string) =>
    request<Invoice>(`/invoices/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, notes }) }),

  // Draft -> Approved (BillingEntity.requireApprovalBeforeIssue açıksa UI'da gösterilir).
  approve: (id: number) => request<Invoice>(`/invoices/${id}/approve`, { method: 'PUT' }),

  // Asenkron gönderim kuyruğuna alır (bkz. backend EInvoiceSendQueueService). Gerçek bir
  // entegratör bağlı olmadığı sürece kuyruktaki her deneme dürüstçe başarısız olur ve
  // einvoiceStatus/providerStatusMessage üzerinden görünür — asla sahte "gönderildi" göstermez.
  send: (id: number) => request<EInvoiceSendJob>(`/invoices/${id}/send`, { method: 'POST' }),
  getSendJobs: (id: number) => request<EInvoiceSendJob[]>(`/invoices/${id}/send-jobs`),

  // Taslak kopyalama — kaynak faturanın başlık+satırlarını kopyalayarak yeni bir Draft
  // fatura oluşturur; fatura numarası taşınmaz, yeniden üretilir (bkz. backend
  // InvoicesController.Duplicate).
  duplicate: (id: number) => request<Invoice>(`/invoices/${id}/duplicate`, { method: 'POST' }),

  remove: (id: number) => request<void>(`/invoices/${id}`, { method: 'DELETE' }),

  // UBL-TR XML'i indirir — dosya indirme akışı diğer domain dosyalarındaki (SupplierLedger
  // Excel import vb.) doğrudan fetch desenini izler (throwIfNotOk ile aynı hata işleme).
  downloadUblXml: async (id: number): Promise<{ fileName: string; blob: Blob }> => {
    const res = await fetch(`${BASE}/invoices/${id}/ubl-xml`, {
      headers: { ...getStoreHeaders(), ...authHeader() },
      credentials: 'include',
    });
    await throwIfNotOk(res);
    return { fileName: `fatura-${id}.xml`, blob: await res.blob() };
  },

  // Görsel PDF taslağı — RESMİ e-Arşiv PDF'i DEĞİLDİR (bkz. backend InvoicePdfBuilder yorumu).
  downloadPdf: async (id: number): Promise<{ fileName: string; blob: Blob }> => {
    const res = await fetch(`${BASE}/invoices/${id}/pdf`, {
      headers: { ...getStoreHeaders(), ...authHeader() },
      credentials: 'include',
    });
    await throwIfNotOk(res);
    return { fileName: `fatura-${id}.pdf`, blob: await res.blob() };
  },

  // PDF'in HTML/XSLT alternatifi (bkz. backend InvoiceHtmlViewBuilder) — RESMİ e-Arşiv
  // çıktısı DEĞİLDİR. Blob URL olarak döner, çağıran yeni sekmede açar.
  getHtmlViewUrl: async (id: number): Promise<string> => {
    const res = await fetch(`${BASE}/invoices/${id}/html-view`, {
      headers: { ...getStoreHeaders(), ...authHeader() },
      credentials: 'include',
    });
    await throwIfNotOk(res);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // Otomatik Muhasebeleştirme (bkz. ERP yol haritası Faz 1) — sadece Issued faturalar için,
  // önce Muhasebe Ayarları'nda Hesap Eşlemeleri tanımlanmış olmalı. İdempotent: fatura zaten
  // muhasebeleştirilmişse mevcut fişi döner, ikinci bir kayıt üretmez.
  postToLedger: (id: number) =>
    request<{ id: number; entryNumber: string | null; status: string }>(`/invoices/${id}/post-to-ledger`, { method: 'POST' }),

  // Fatura satırlarını .xlsx'ten okur (QNB'nin "Excel'den Yükle" karşılığı) — SADECE AYRIŞTIRIR,
  // veritabanına yazmaz. Kullanıcı dönen satırları formda görüp kaydeder (bkz. backend
  // InvoicesController.ParseLineExcel yorumu).
  parseLineExcel: async (file: File): Promise<InvoiceLineExcelParseResult> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/invoices/parse-line-excel`, {
      method: 'POST',
      headers: { ...getStoreHeaders(), ...authHeader() },
      credentials: 'include',
      body: form,
    });
    await throwIfNotOk(res);
    return res.json();
  },
};

// Doğrulanmış 81 il listesi (FAZ 6.6) — vergi dairesi kataloğu QNB taramasının yarıda kalması
// nedeniyle BİLİNÇLİ olarak eklenmedi (bkz. backend TurkiyeIlleri.cs yorumu).
export const accountingReferenceApi = {
  getTurkiyeIlleri: () => request<string[]>('/accounting/reference/turkiye-illeri'),
};
