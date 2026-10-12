import { request, BASE, uploadHeaders, throwIfNotOk } from './core';

// ─── Fatura Kesen Şirket (BillingEntity, Faz 4) ───────────────────────────────

export interface BillingEntityDocument {
  id: number;
  documentType: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface BillingEntity {
  id: number;
  legalName: string;
  taxNumber: string;
  taxOffice: string | null;
  mersisNumber: string | null;
  tradeRegistryNumber: string | null;
  addressLine: string | null;
  city: string | null;
  district: string | null;
  postCode: string | null;
  phone: string | null;
  email: string | null;
  iban: string | null;
  bankName: string | null;
  authorizedPersonName: string | null;
  authorizedPersonTitle: string | null;
  isActive: boolean;
  // Açıksa yeni faturalar Draft'tan Issued'a geçmeden önce Approved adımından geçmeli
  // (bkz. backend Invoice.cs durum makinesi, opsiyonel onay akışı).
  requireApprovalBeforeIssue: boolean;
  storeCodes: string[];
  documents: BillingEntityDocument[];
  createdAt: string;
  updatedAt: string;
}

export type BillingEntityFormValues = Omit<
  BillingEntity, 'id' | 'storeCodes' | 'documents' | 'createdAt' | 'updatedAt'
>;

export const billingEntityApi = {
  list: () => request<BillingEntity[]>('/billing-entities'),

  getById: (id: number) => request<BillingEntity>(`/billing-entities/${id}`),

  create: (body: BillingEntityFormValues) =>
    request<BillingEntity>('/billing-entities', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: number, body: BillingEntityFormValues) =>
    request<BillingEntity>(`/billing-entities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  remove: (id: number) => request<void>(`/billing-entities/${id}`, { method: 'DELETE' }),

  uploadDocument: async (id: number, documentType: string, file: File): Promise<BillingEntityDocument> => {
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('file', file);
    const res = await fetch(`${BASE}/billing-entities/${id}/documents`, {
      method: 'POST',
      headers: uploadHeaders(),
      body: formData,
    });
    await throwIfNotOk(res);
    return res.json();
  },

  deleteDocument: (id: number, documentId: number) =>
    request<void>(`/billing-entities/${id}/documents/${documentId}`, { method: 'DELETE' }),
};
