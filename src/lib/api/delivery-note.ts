import { request, BASE, authHeader, getStoreHeaders, throwIfNotOk } from './core';

// e-İrsaliye — Sipariş→İrsaliye→Fatura akışı (bkz. backend ERP yol haritası Faz C.2). GİB'e
// gönderim/imzalama BURADA YAPILMAZ — sadece dahili sevkiyat takibi + faturaya konsolidasyon.

export type DeliveryNoteStatus = 'Draft' | 'Issued' | 'Cancelled';

export interface DeliveryNoteLine {
  id: number;
  description: string;
  quantity: number;
  unit: string;
}

export interface DeliveryNote {
  id: number;
  orderId: number | null;
  billingEntityId: number | null;
  billingEntityName: string | null;
  invoiceId: number | null;
  invoiceNumber: string | null;
  deliveryNoteNumber: string;
  deliveryDate: string;
  status: DeliveryNoteStatus;
  recipientName: string | null;
  recipientAddress: string | null;
  notes: string | null;
  lines: DeliveryNoteLine[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryNoteLineBody {
  description: string;
  quantity: number;
  unit?: string;
}

export interface DeliveryNoteReport {
  from: string;
  to: string;
  totalCount: number;
  draftCount: number;
  issuedCount: number;
  cancelledCount: number;
  linkedToInvoiceCount: number;
  unlinkedCount: number;
}

export interface CreateDeliveryNoteBody {
  orderId?: number;
  billingEntityId?: number;
  deliveryNoteNumber: string;
  deliveryDate: string;
  recipientName?: string;
  recipientAddress?: string;
  notes?: string;
  lines: CreateDeliveryNoteLineBody[];
}

// ─── Excel'den İrsaliye Kalemi İçe Aktarma (InvoiceLineExcelParser'ın irsaliye karşılığı) ───

export interface DeliveryNoteLineExcelWarning {
  rowNumber: number;
  message: string;
}

export interface DeliveryNoteLineExcelParseResult {
  lines: CreateDeliveryNoteLineBody[];
  warnings: DeliveryNoteLineExcelWarning[];
  headerRowNumber: number;
  columnMapping: Record<string, string>;
}

export const deliveryNoteApi = {
  list: (params?: { orderId?: number; invoiceId?: number; status?: DeliveryNoteStatus }) => {
    const q = new URLSearchParams();
    if (params?.orderId) q.set('orderId', String(params.orderId));
    if (params?.invoiceId) q.set('invoiceId', String(params.invoiceId));
    if (params?.status) q.set('status', params.status);
    return request<DeliveryNote[]>(`/delivery-notes?${q}`);
  },

  getById: (id: number) => request<DeliveryNote>(`/delivery-notes/${id}`),

  create: (body: CreateDeliveryNoteBody) =>
    request<DeliveryNote>('/delivery-notes', { method: 'POST', body: JSON.stringify(body) }),

  updateStatus: (id: number, status: DeliveryNoteStatus) =>
    request<DeliveryNote>(`/delivery-notes/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  remove: (id: number) => request<void>(`/delivery-notes/${id}`, { method: 'DELETE' }),

  // Çoklu irsaliye → tek fatura konsolidasyonu.
  linkToInvoice: (deliveryNoteIds: number[], invoiceId: number) =>
    request<DeliveryNote[]>('/delivery-notes/link-invoice', {
      method: 'POST',
      body: JSON.stringify({ deliveryNoteIds, invoiceId }),
    }),

  unlink: (id: number) => request<DeliveryNote>(`/delivery-notes/${id}/unlink`, { method: 'POST' }),

  // İrsaliye satırlarını .xlsx'ten okur — SADECE AYRIŞTIRIR, veritabanına yazmaz (bkz. backend
  // DeliveryNotesController.ParseLineExcel yorumu).
  parseLineExcel: async (file: File): Promise<DeliveryNoteLineExcelParseResult> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/delivery-notes/parse-line-excel`, {
      method: 'POST',
      headers: { ...getStoreHeaders(), ...authHeader() },
      credentials: 'include',
      body: form,
    });
    await throwIfNotOk(res);
    return res.json();
  },

  // Draft UBL Despatch Advice XML — İMZALANMAMIŞ, GİB'e GÖNDERİLMEMİŞ (bkz. Invoice UBL-TR'yle
  // aynı ilke, backend UblDespatchAdviceXmlBuilder yorumu).
  downloadUblXml: async (id: number): Promise<{ fileName: string; blob: Blob }> => {
    const res = await fetch(`${BASE}/delivery-notes/${id}/ubl-xml`, {
      headers: { ...getStoreHeaders(), ...authHeader() },
      credentials: 'include',
    });
    await throwIfNotOk(res);
    return { fileName: `irsaliye-${id}.xml`, blob: await res.blob() };
  },

  // GİDEN e-İrsaliye özet raporu (FAZ 7.3) — sadece bu firmanın kendi gönderdiği sevkiyatları
  // kapsar, tedarikçiden GELEN irsaliye takibi sistemde henüz modellenmedi.
  report: (params: { from: string; to: string; billingEntityId?: number }) => {
    const q = new URLSearchParams({ from: params.from, to: params.to });
    if (params.billingEntityId) q.set('billingEntityId', String(params.billingEntityId));
    return request<DeliveryNoteReport>(`/delivery-notes/report?${q}`);
  },
};
