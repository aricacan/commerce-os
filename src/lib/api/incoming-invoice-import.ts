import { BASE, authHeader, getStoreHeaders, throwIfNotOk } from './core';
import type { Invoice } from './invoice';

// Tedarikçiden gelen UBL-TR e-Fatura XML'ini içe aktarır (bkz. backend ERP yol haritası Faz C.1).
// GİB'e gönderim/imzalama İLE İLGİSİ YOK — bize ulaşmış bir belgeyi Incoming Invoice'a çevirir.

export interface ParsedUblInvoiceLine {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
}

export interface ImportUblInvoicePreview {
  invoiceNumber: string;
  invoiceDate: string;
  ettn: string | null;
  currency: string;
  invoiceTypeCode: string | null;
  supplierTaxNumber: string | null;
  supplierName: string | null;
  supplierTaxOffice: string | null;
  supplierAddress: string | null;
  taxExclusiveAmount: number;
  taxAmount: number;
  lines: ParsedUblInvoiceLine[];
  matchedSupplierId: number | null;
  matchedSupplierName: string | null;
  isDuplicate: boolean;
  duplicateInvoiceId: number | null;
}

export const incomingInvoiceImportApi = {
  preview: async (file: File): Promise<ImportUblInvoicePreview> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/invoices/import-ubl/preview`, {
      method: 'POST',
      headers: { ...getStoreHeaders(), ...authHeader() },
      credentials: 'include',
      body: formData,
    });
    await throwIfNotOk(res);
    return res.json();
  },

  confirm: async (file: File, supplierId: number | undefined, force: boolean): Promise<Invoice> => {
    const formData = new FormData();
    formData.append('file', file);
    if (supplierId) formData.append('supplierId', String(supplierId));
    formData.append('force', String(force));
    const res = await fetch(`${BASE}/invoices/import-ubl/confirm`, {
      method: 'POST',
      headers: { ...getStoreHeaders(), ...authHeader() },
      credentials: 'include',
      body: formData,
    });
    await throwIfNotOk(res);
    return res.json();
  },
};
