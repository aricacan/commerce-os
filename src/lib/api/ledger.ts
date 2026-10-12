import { request } from './core';

// ─── Genel Muhasebe — çift taraflı defter (Faz 1) ─────────────────────────────

export type LedgerAccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export const LEDGER_ACCOUNT_TYPE_LABEL: Record<LedgerAccountType, string> = {
  Asset: 'Varlık', Liability: 'Yabancı Kaynak', Equity: 'Özkaynak', Revenue: 'Gelir', Expense: 'Gider',
};

export interface LedgerAccount {
  id: number;
  billingEntityId: number;
  code: string;
  name: string;
  type: LedgerAccountType;
  normalSide: 'Debit' | 'Credit';
  parentAccountId: number | null;
  parentAccountCode: string | null;
  isPostable: boolean;
  isActive: boolean;
}

export interface CreateLedgerAccountBody {
  billingEntityId: number;
  code: string;
  name: string;
  type: LedgerAccountType;
  parentAccountId?: number;
  isPostable?: boolean;
}

export const ledgerAccountApi = {
  list: (billingEntityId: number) => request<LedgerAccount[]>(`/ledger-accounts?billingEntityId=${billingEntityId}`),
  create: (body: CreateLedgerAccountBody) => request<LedgerAccount>('/ledger-accounts', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { name: string; isActive: boolean; isPostable: boolean }) =>
    request<LedgerAccount>(`/ledger-accounts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  seedStandardChart: (billingEntityId: number) =>
    request<{ added: number }>(`/ledger-accounts/seed-standard-chart?billingEntityId=${billingEntityId}`, { method: 'POST' }),
};

export type AccountingPeriodStatus = 'Open' | 'Closed';

export interface AccountingPeriod {
  id: number;
  billingEntityId: number;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  status: AccountingPeriodStatus;
  closedAt: string | null;
}

export const accountingPeriodApi = {
  list: (billingEntityId: number) => request<AccountingPeriod[]>(`/accounting-periods?billingEntityId=${billingEntityId}`),
  close: (id: number) => request<AccountingPeriod>(`/accounting-periods/${id}/close`, { method: 'POST' }),
  reopen: (id: number) => request<AccountingPeriod>(`/accounting-periods/${id}/reopen`, { method: 'POST' }),
};

export type JournalEntryStatus = 'Draft' | 'Posted' | 'Reversed';

export interface JournalEntryLine {
  id: number;
  lineNumber: number;
  ledgerAccountId: number;
  ledgerAccountCode: string;
  ledgerAccountName: string;
  debitAmount: number;
  creditAmount: number;
  description: string | null;
}

export interface JournalEntry {
  id: number;
  billingEntityId: number;
  accountingPeriodId: number;
  entryNumber: string | null;
  entryDate: string;
  description: string | null;
  status: JournalEntryStatus;
  sourceType: string;
  sourceId: number | null;
  reversalOfEntryId: number | null;
  postedAt: string | null;
  lines: JournalEntryLine[];
}

export interface CreateJournalEntryLineBody {
  ledgerAccountId: number;
  debitAmount: number;
  creditAmount: number;
  description?: string;
}

export interface CreateJournalEntryBody {
  billingEntityId: number;
  entryDate: string;
  description?: string;
  lines: CreateJournalEntryLineBody[];
}

export const journalEntryApi = {
  list: (billingEntityId: number, params?: { from?: string; to?: string; status?: JournalEntryStatus }) => {
    const q = new URLSearchParams({ billingEntityId: String(billingEntityId) });
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.status) q.set('status', params.status);
    return request<JournalEntry[]>(`/journal-entries?${q}`);
  },
  create: (body: CreateJournalEntryBody) => request<JournalEntry>('/journal-entries', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/journal-entries/${id}`, { method: 'DELETE' }),
  post: (id: number) => request<JournalEntry>(`/journal-entries/${id}/post`, { method: 'POST' }),
  reverse: (id: number, reversalDate: string) =>
    request<JournalEntry>(`/journal-entries/${id}/reverse`, { method: 'POST', body: JSON.stringify({ reversalDate }) }),
};

export interface TrialBalanceRow {
  ledgerAccountId: number;
  code: string;
  name: string;
  type: LedgerAccountType;
  totalDebit: number;
  totalCredit: number;
  balanceDebit: number;
  balanceCredit: number;
}

export interface TrialBalance {
  asOfDate: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
}

export interface GeneralLedgerLine {
  entryDate: string;
  entryNumber: string | null;
  journalEntryId: number;
  description: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface GeneralLedger {
  ledgerAccountId: number;
  code: string;
  name: string;
  openingBalance: number;
  lines: GeneralLedgerLine[];
  closingBalance: number;
}

export const ledgerReportApi = {
  trialBalance: (billingEntityId: number, asOfDate: string) =>
    request<TrialBalance>(`/ledger-reports/trial-balance?billingEntityId=${billingEntityId}&asOfDate=${asOfDate}`),
  generalLedger: (ledgerAccountId: number, from: string, to: string) =>
    request<GeneralLedger>(`/ledger-reports/general-ledger/${ledgerAccountId}?from=${from}&to=${to}`),
};

export type AccountMappingPurpose =
  | 'AccountsReceivable' | 'AccountsPayable' | 'SalesRevenue' | 'SalesVatPayable'
  | 'PurchaseExpense' | 'PurchaseVatReceivable';

export const ACCOUNT_MAPPING_LABEL: Record<AccountMappingPurpose, string> = {
  AccountsReceivable: 'Alıcılar (Satış — Borç)',
  AccountsPayable: 'Satıcılar (Alış — Alacak)',
  SalesRevenue: 'Satış Geliri (Satış — Alacak)',
  SalesVatPayable: 'Hesaplanan KDV (Satış — Alacak)',
  PurchaseExpense: 'Alış/Gider (Alış — Borç)',
  PurchaseVatReceivable: 'İndirilecek KDV (Alış — Borç)',
};

export interface AccountMapping {
  id: number;
  purpose: AccountMappingPurpose;
  ledgerAccountId: number;
  ledgerAccountCode: string;
  ledgerAccountName: string;
}

export const accountMappingApi = {
  list: (billingEntityId: number) => request<AccountMapping[]>(`/account-mappings?billingEntityId=${billingEntityId}`),
  upsert: (billingEntityId: number, body: { purpose: AccountMappingPurpose; ledgerAccountId: number }) =>
    request<AccountMapping>(`/account-mappings?billingEntityId=${billingEntityId}`, { method: 'PUT', body: JSON.stringify(body) }),
};

// ─── Yevmiye numarası boşluk/tekrar denetimi (FAZ 3.5) ────────────────────────

export interface JournalEntryNumberIntegrityReport {
  year: number;
  totalPostedEntries: number;
  highestSequence: number | null;
  missingSequenceNumbers: number[];
  duplicateEntryNumbers: string[];
  unparsableEntryNumbers: string[];
}

export const journalEntryIntegrityApi = {
  check: (billingEntityId: number, year: number) =>
    request<JournalEntryNumberIntegrityReport>(
      `/journal-entries/number-integrity?billingEntityId=${billingEntityId}&year=${year}`
    ),
};
