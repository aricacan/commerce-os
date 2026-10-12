import { BASE, uploadHeaders, throwIfNotOk, request } from './core';

// Toplu fatura PDF/görsel yükleme → Trendyol siparişleriyle isim eşleştirme → onaylı gönderim.
// İKİ AŞAMA BİLEREK AYRI (backend de aynı ayrımı taşır — bkz. ITrendyolInvoiceUploadService):
// Match hiçbir şey göndermez, yalnızca önizleme döner; Send yalnızca kullanıcının açıkça
// onayladığı dosyaları gönderir.
//
// KALICI: her yükleme bir "parti" (batch) olarak veritabanında durur — liste sayfası tüm
// geçmiş partileri gösterir, detay sayfası tek bir partinin eşleşmelerini/gönderim durumunu.

export type InvoiceMatchStatus = 'ParseFailed' | 'Unmatched' | 'Ambiguous' | 'AutoMatched' | 'UnsupportedFileType';
export type InvoiceSendStatus = 'NotSent' | 'Sent' | 'Failed';

export interface InvoiceMatchCandidate {
  platformOrderNumber: string;
  shipmentPackageId: number;
  customerName: string;
  totalAmount: number | null;
  orderDate: string;
  // BİZDEKİ sipariş içeriği ("Ürün Adı ×2" gibi satırlar) — Trendyol'un canlı yanıtı
  // yalnızca müşteri adı/tutar taşır, göz ucuyla doğrulama bundan gelir.
  productSummary: string[];
}

export interface InvoiceUploadFile {
  fileId: string;
  fileName: string;
  status: InvoiceMatchStatus;
  parsedCustomerName: string | null;
  invoiceNumber: string | null;
  candidates: InvoiceMatchCandidate[];
  sendStatus: InvoiceSendStatus;
  sendErrorMessage: string | null;
  selectedShipmentPackageId: number | null;
  selectedPlatformOrderNumber: string | null;
}

export interface InvoiceUploadBatch {
  batchId: string;
  erpLabel: string;
  connectionLabel: string;
  windowFromDate: string;
  windowToDate: string;
  files: InvoiceUploadFile[];
  // Bu aralıkta Trendyol'da toplam kaç sipariş vardı / kaçına dosya eşleştirildi — TAMLIK
  // metriği. Yığında başka firmaların faturaları karışmış olabilir; matchedOrderCount
  // totalOrdersInWindow'a eşit değilse "N faturanız eksik" gösterilir.
  totalOrdersInWindow: number;
  matchedOrderCount: number;
}

export interface InvoiceUploadBatchSummary {
  batchId: string;
  erpLabel: string;
  connectionLabel: string;
  windowFromDate: string;
  windowToDate: string;
  createdAt: string;
  fileCount: number;
  matchedCount: number;
  sentCount: number;
  totalOrdersInWindow: number;
  matchedOrderCount: number;
}

export interface InvoiceSendDecision {
  fileId: string;
  shipmentPackageId: number;
  platformOrderNumber: string;
}

export interface InvoiceSendResult {
  fileId: string;
  fileName: string;
  success: boolean;
  errorMessage: string | null;
}

// 1. adım — KAYNAK: aktif ERP kaynakları ("Sentos - StoreA", "Base - StoreB" …).
// Mağaza değil DataSource bazlı: bir mağazanın birden fazla ERP'si olabilir.
export interface ErpSourceOption {
  sourceId: number;
  storeId: number;
  label: string;
}

// 2. adım — HEDEF: aktif Trendyol bağlantıları ("Trendyol - Test" …). Kaynaktan BAĞIMSIZ.
export interface MarketplaceConnectionOption {
  connectionId: number;
  label: string;
}

export const trendyolInvoiceApi = {
  erpSources: () => request<ErpSourceOption[]>('/trendyol-invoices/erp-sources'),

  marketplaceConnections: () =>
    request<MarketplaceConnectionOption[]>('/trendyol-invoices/marketplace-connections'),

  batches: () => request<InvoiceUploadBatchSummary[]>('/trendyol-invoices/batches'),

  batchDetail: (batchId: string) =>
    request<InvoiceUploadBatch>(`/trendyol-invoices/batches/${encodeURIComponent(batchId)}`),

  // FormData ile gider — dosyalar + ERP + hedef bağlantı + tarih aralığı. financeApi
  // .shippingRates.importArasPriceList ile aynı ham fetch deseni (request() JSON body'ye kilitli,
  // multipart'ı desteklemiyor).
  match: async (
    sourceId: number,
    connectionId: number,
    files: File[],
    windowFromDate: string,
    windowToDate: string,
  ): Promise<InvoiceUploadBatch> => {
    const formData = new FormData();
    formData.append('sourceId', String(sourceId));
    formData.append('connectionId', String(connectionId));
    formData.append('windowFromDate', windowFromDate);
    formData.append('windowToDate', windowToDate);
    files.forEach((file) => formData.append('files', file));

    const res = await fetch(`${BASE}/trendyol-invoices/match`, {
      method: 'POST',
      headers: uploadHeaders(),
      body: formData,
    });
    await throwIfNotOk(res);
    return res.json();
  },

  // Gönderim hedefi batch oluşturulurken zaten sabitlenmiştir — batchId dışında bir
  // mağaza/bağlantı parametresi gerekmez.
  send: (batchId: string, decisions: InvoiceSendDecision[]) =>
    request<InvoiceSendResult[]>('/trendyol-invoices/send', {
      method: 'POST',
      body: JSON.stringify({ batchId, decisions }),
    }),
};
