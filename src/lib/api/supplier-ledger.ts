import { request, BASE, uploadHeaders, throwIfNotOk } from './core';

// ─── Cari Hesap (Supplier Ledger) ─────────────────────────────────────────────
// Muhasebe API'si henüz bağlı değil — bu, manuel girilen tek doğruluk kaynağı
// (bkz. backend SupplierLedgerService yorumu).

export type LedgerEntryType = 'Debit' | 'Credit';

export interface LedgerEntry {
  id: number;
  supplierId: number;
  entryDate: string;
  type: LedgerEntryType;
  amount: number;
  currency: string;
  description: string | null;
  referenceNumber: string | null;
  createdAt: string;
}

export interface CurrencyBalance {
  currency: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface SupplierBalance {
  supplierId: number;
  balances: CurrencyBalance[];
}

export interface CreateLedgerEntryBody {
  supplierId: number;
  entryDate: string;
  type: LedgerEntryType;
  amount: number;
  currency?: string;
  description?: string;
  referenceNumber?: string;
}

export const supplierLedgerApi = {
  getEntries: (supplierId: number) =>
    request<LedgerEntry[]>(`/supplier-ledger/${supplierId}/entries`),

  getBalance: (supplierId: number) =>
    request<SupplierBalance>(`/supplier-ledger/${supplierId}/balance`),

  addEntry: (body: CreateLedgerEntryBody) =>
    request<LedgerEntry>('/supplier-ledger', { method: 'POST', body: JSON.stringify(body) }),

  removeEntry: (entryId: number) =>
    request<void>(`/supplier-ledger/${entryId}`, { method: 'DELETE' }),

  importExcel: async (supplierId: number, file: File): Promise<LedgerImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/supplier-ledger/${supplierId}/import-excel`, {
      method: 'POST',
      headers: uploadHeaders(),
      body: formData,
    });
    await throwIfNotOk(res);
    return res.json();
  },
};

export interface LedgerImportResult {
  inserted: number;
  skipped: number;
  warnings: string[];
}
