import { request, BASE, getStoreHeaders, authHeader, throwIfNotOk } from './core';

// ─── Müşteri (Ön Muhasebe / Faz 2) ─────────────────────────────────────────────────────────

export type CustomerStatus = 'Active' | 'Inactive';

export interface Customer {
  id: number;
  name: string;
  taxNumber: string | null;
  taxOffice: string | null;
  phone: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  addressLine: string | null;
  paymentTermDays: number | null;
  currency: string;
  creditLimit: number | null;
  status: CustomerStatus;
  notes: string | null;
  createdAt: string;
}

export interface CreateCustomerBody {
  name: string; taxNumber?: string; taxOffice?: string; phone?: string; email?: string;
  country?: string; city?: string; addressLine?: string;
  paymentTermDays?: number; currency?: string; creditLimit?: number; notes?: string;
}

export const customerApi = {
  list: () => request<Customer[]>('/customers'),
  getById: (id: number) => request<Customer>(`/customers/${id}`),
  create: (body: CreateCustomerBody) => request<Customer>('/customers', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: CreateCustomerBody & { status: CustomerStatus }) =>
    request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};

// ─── Cari Hesap (Müşteri + Tedarikçi ortak yaşlandırma/export) ─────────────────────────────

export type LedgerEntryType = 'Debit' | 'Credit';

export interface CustomerLedgerEntry {
  id: number; customerId: number; entryDate: string; type: LedgerEntryType;
  amount: number; currency: string; description: string | null; referenceNumber: string | null;
  paymentId: number | null; createdAt: string;
}

export interface CurrencyBalance { currency: string; totalDebit: number; totalCredit: number; balance: number; }
export interface CustomerBalance { customerId: number; balances: CurrencyBalance[]; }

export interface AgingBucket { label: string; amount: number; }
export interface CurrencyAging { currency: string; openBalance: number; buckets: AgingBucket[]; }
// Para birimi bazında ayrı raporlanır — CurrencyBalance ile AYNI desen (bkz. backend
// AgingReportDto yorumu: farklı para birimleri asla aynı toplamda birbirine eklenmez).
export interface AgingReport { asOfDate: string; balances: CurrencyAging[]; }

export const customerLedgerApi = {
  getEntries: (customerId: number) => request<CustomerLedgerEntry[]>(`/customer-ledger/${customerId}/entries`),
  getBalance: (customerId: number) => request<CustomerBalance>(`/customer-ledger/${customerId}/balance`),
  getAging: (customerId: number, asOfDate?: string) =>
    request<AgingReport>(`/customer-ledger/${customerId}/aging${asOfDate ? `?asOfDate=${asOfDate}` : ''}`),
  addEntry: (body: { customerId: number; entryDate: string; type: LedgerEntryType; amount: number; currency?: string; description?: string; referenceNumber?: string }) =>
    request<CustomerLedgerEntry>('/customer-ledger', { method: 'POST', body: JSON.stringify(body) }),
  removeEntry: (id: number) => request<void>(`/customer-ledger/${id}`, { method: 'DELETE' }),
  exportStatement: async (customerId: number): Promise<{ fileName: string; blob: Blob }> => {
    const res = await fetch(`${BASE}/customer-ledger/${customerId}/export`, { headers: { ...getStoreHeaders(), ...authHeader() }, credentials: 'include' });
    await throwIfNotOk(res);
    return { fileName: `cari-ekstre-${customerId}.xlsx`, blob: await res.blob() };
  },
};

export const supplierAgingApi = {
  getAging: (supplierId: number, asOfDate?: string) =>
    request<AgingReport>(`/supplier-ledger/${supplierId}/aging${asOfDate ? `?asOfDate=${asOfDate}` : ''}`),
  exportStatement: async (supplierId: number): Promise<{ fileName: string; blob: Blob }> => {
    const res = await fetch(`${BASE}/supplier-ledger/${supplierId}/export`, { headers: { ...getStoreHeaders(), ...authHeader() }, credentials: 'include' });
    await throwIfNotOk(res);
    return { fileName: `cari-ekstre-${supplierId}.xlsx`, blob: await res.blob() };
  },
};

// ─── Kasa / Banka ───────────────────────────────────────────────────────────────────────────

export type TreasuryAccountType = 'Cash' | 'Bank';

export interface TreasuryAccount {
  id: number; billingEntityId: number; name: string; type: TreasuryAccountType; currency: string;
  iban: string | null; bankName: string | null; accountNumber: string | null;
  ledgerAccountId: number; ledgerAccountCode: string; ledgerAccountName: string;
  isActive: boolean; balance: number;
}

export interface CreateTreasuryAccountBody {
  billingEntityId: number; name: string; type: TreasuryAccountType; currency?: string;
  iban?: string; bankName?: string; accountNumber?: string; ledgerAccountId: number;
}

export interface TreasuryTransaction {
  id: number; treasuryAccountId: number; transactionDate: string; direction: 'In' | 'Out';
  amount: number; description: string | null; sourceType: string; sourceId: number | null;
  runningBalance: number; createdAt: string;
}

export const treasuryAccountApi = {
  list: (billingEntityId: number) => request<TreasuryAccount[]>(`/treasury-accounts?billingEntityId=${billingEntityId}`),
  create: (body: CreateTreasuryAccountBody) => request<TreasuryAccount>('/treasury-accounts', { method: 'POST', body: JSON.stringify(body) }),
  getTransactions: (treasuryAccountId: number) => request<TreasuryTransaction[]>(`/treasury-accounts/${treasuryAccountId}/transactions`),
  addManualTransaction: (body: { treasuryAccountId: number; transactionDate: string; direction: 'In' | 'Out'; amount: number; description?: string }) =>
    request<TreasuryTransaction>('/treasury-accounts/transactions', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Tahsilat / Ödeme ───────────────────────────────────────────────────────────────────────

export type PaymentDirection = 'Collection' | 'Disbursement';

export interface Payment {
  id: number; billingEntityId: number; direction: PaymentDirection; paymentDate: string;
  amount: number; currency: string;
  customerId: number | null; customerName: string | null;
  supplierId: number | null; supplierName: string | null;
  treasuryAccountId: number; treasuryAccountName: string; invoiceId: number | null;
  method: string | null; referenceNumber: string | null; description: string | null;
  journalEntryId: number | null; journalEntryNumber: string | null; createdAt: string;
}

export interface CreatePaymentBody {
  direction: PaymentDirection; paymentDate: string; amount: number; currency?: string;
  customerId?: number; supplierId?: number; treasuryAccountId: number; invoiceId?: number;
  method?: string; referenceNumber?: string; description?: string;
}

export const paymentApi = {
  list: (billingEntityId: number, params?: { customerId?: number; supplierId?: number }) => {
    const q = new URLSearchParams({ billingEntityId: String(billingEntityId) });
    if (params?.customerId) q.set('customerId', String(params.customerId));
    if (params?.supplierId) q.set('supplierId', String(params.supplierId));
    return request<Payment[]>(`/payments?${q}`);
  },
  create: (billingEntityId: number, body: CreatePaymentBody) =>
    request<Payment>(`/payments?billingEntityId=${billingEntityId}`, { method: 'POST', body: JSON.stringify(body) }),
};
