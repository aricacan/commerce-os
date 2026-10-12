// Genel muhasebe: şirketler, hesap planı, dönemler, yevmiye, mizan, defter-i kebir, sağlayıcı ayarları.
import type { AccountingProviderCapabilities, AccountingProviderConfig } from '../../api/accounting-provider';
import type { BillingEntity } from '../../api/billing-entity';
import type { EInvoiceProviderCapabilities, EInvoiceProviderConfig } from '../../api/einvoice-provider';
import type {
  AccountMapping,
  AccountMappingPurpose,
  AccountingPeriod,
  GeneralLedger,
  GeneralLedgerLine,
  JournalEntry,
  JournalEntryNumberIntegrityReport,
  TrialBalance,
  TrialBalanceRow,
} from '../../api/ledger';
import { BILLING_ENTITIES, TR_ENTITY_ID, accountId, chartFor, entityOfAccount, journalEntriesFor } from '../data/finance-accounting';
import { lastMonths, round2 } from '../data/finance-base';
import { ago, dayAgo } from '../seed';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';

const NOT_FOUND_STATUS = 404;
const PERIOD_COUNT = 14;
const OPEN_PERIOD_COUNT = 3;
const PERIOD_ID_STRIDE = 100;

function entityId(request: DemoRequest): number {
  return Number(request.query.get('billingEntityId')) || TR_ENTITY_ID;
}

function findEntity(id: number): BillingEntity | undefined {
  return BILLING_ENTITIES.find((entity) => entity.id === id);
}

// ── Dönemler ───────────────────────────────────────────────────────────────────

function periods(request: DemoRequest): AccountingPeriod[] {
  const billingEntityId = entityId(request);
  return lastMonths(PERIOD_COUNT).map(({ year, month }, index) => {
    const lastDay = new Date(year, month, 0).getDate();
    const closed = index < PERIOD_COUNT - OPEN_PERIOD_COUNT;
    return {
      id: billingEntityId * PERIOD_ID_STRIDE + month,
      billingEntityId, year, month,
      startDate: `${year}-${String(month).padStart(2, '0')}-01`,
      endDate: `${year}-${String(month).padStart(2, '0')}-${lastDay}`,
      status: closed ? 'Closed' : 'Open',
      closedAt: closed ? ago((PERIOD_COUNT - index) * 30 - 20) : null,
    };
  });
}

// ── Yevmiye ────────────────────────────────────────────────────────────────────

function journalEntries(request: DemoRequest): JournalEntry[] {
  const from = request.query.get('from');
  const to = request.query.get('to');
  const status = request.query.get('status');
  return journalEntriesFor(entityId(request))
    .filter((entry) => (!from || entry.entryDate >= from) && (!to || entry.entryDate <= to) && (!status || entry.status === status))
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate));
}

function numberIntegrity(request: DemoRequest): JournalEntryNumberIntegrityReport {
  const posted = journalEntriesFor(entityId(request)).filter((entry) => entry.status === 'Posted');
  return {
    year: Number(request.query.get('year')) || new Date().getFullYear(),
    totalPostedEntries: posted.length,
    highestSequence: posted.length,
    missingSequenceNumbers: [],
    duplicateEntryNumbers: [],
    unparsableEntryNumbers: [],
  };
}

// ── Mizan ve defter-i kebir ────────────────────────────────────────────────────

function trialBalance(request: DemoRequest): TrialBalance {
  const billingEntityId = entityId(request);
  const asOfDate = request.query.get('asOfDate') ?? dayAgo(0);
  const posted = journalEntriesFor(billingEntityId).filter((entry) => entry.status === 'Posted' && entry.entryDate <= asOfDate);
  const lines = posted.flatMap((entry) => entry.lines);
  const rows: TrialBalanceRow[] = chartFor(billingEntityId).filter((account) => account.isPostable).flatMap((account) => {
    const own = lines.filter((line) => line.ledgerAccountId === account.id);
    if (own.length === 0) return [];
    const totalDebit = round2(own.reduce((sum, line) => sum + line.debitAmount, 0));
    const totalCredit = round2(own.reduce((sum, line) => sum + line.creditAmount, 0));
    const net = round2(totalDebit - totalCredit);
    return [{
      ledgerAccountId: account.id, code: account.code, name: account.name, type: account.type,
      totalDebit, totalCredit, balanceDebit: net > 0 ? net : 0, balanceCredit: net < 0 ? -net : 0,
    }];
  });
  return {
    asOfDate, rows,
    totalDebit: round2(rows.reduce((sum, row) => sum + row.totalDebit, 0)),
    totalCredit: round2(rows.reduce((sum, row) => sum + row.totalCredit, 0)),
  };
}

function generalLedger(request: DemoRequest): GeneralLedger | DemoHttpResponse {
  const ledgerAccountId = Number(request.params.id);
  const billingEntityId = entityOfAccount(ledgerAccountId);
  const account = chartFor(billingEntityId).find((item) => item.id === ledgerAccountId);
  if (!account) return new DemoHttpResponse(NOT_FOUND_STATUS);

  const from = request.query.get('from') ?? '0000-01-01';
  const to = request.query.get('to') ?? '9999-12-31';
  const isDebitSide = account.normalSide === 'Debit';
  const movements = journalEntriesFor(billingEntityId)
    .filter((entry) => entry.status === 'Posted')
    .flatMap((entry) => entry.lines.filter((line) => line.ledgerAccountId === ledgerAccountId).map((line) => ({ entry, line })))
    .sort((a, b) => a.entry.entryDate.localeCompare(b.entry.entryDate));
  const signed = (debit: number, credit: number) => round2(isDebitSide ? debit - credit : credit - debit);
  const openingBalance = movements
    .filter(({ entry }) => entry.entryDate < from)
    .reduce((sum, { line }) => sum + signed(line.debitAmount, line.creditAmount), 0);

  let running = openingBalance;
  const lines: GeneralLedgerLine[] = movements
    .filter(({ entry }) => entry.entryDate >= from && entry.entryDate <= to)
    .map(({ entry, line }) => {
      running = round2(running + signed(line.debitAmount, line.creditAmount));
      return {
        entryDate: entry.entryDate, entryNumber: entry.entryNumber, journalEntryId: entry.id,
        description: entry.description, debit: line.debitAmount, credit: line.creditAmount, runningBalance: running,
      };
    });
  return { ledgerAccountId, code: account.code, name: account.name, openingBalance: round2(openingBalance), lines, closingBalance: running };
}

// ── Hesap eşlemeleri ───────────────────────────────────────────────────────────

const MAPPING_CODES: Record<AccountMappingPurpose, string> = {
  AccountsReceivable: '120',
  AccountsPayable: '320',
  SalesRevenue: '600',
  SalesVatPayable: '391',
  PurchaseExpense: '153',
  PurchaseVatReceivable: '191',
};

function accountMappings(request: DemoRequest): AccountMapping[] {
  const billingEntityId = entityId(request);
  const chart = chartFor(billingEntityId);
  return (Object.keys(MAPPING_CODES) as AccountMappingPurpose[]).map((purpose, index) => {
    const account = chart.find((item) => item.id === accountId(billingEntityId, MAPPING_CODES[purpose]));
    return {
      id: index + 1, purpose,
      ledgerAccountId: account?.id ?? 0,
      ledgerAccountCode: account?.code ?? '',
      ledgerAccountName: account?.name ?? '',
    };
  });
}

// ── Sağlayıcılar ───────────────────────────────────────────────────────────────

const ACCOUNTING_CAPABILITIES: AccountingProviderCapabilities[] = [
  { providerType: 'Manual', supportsBalanceSync: false, supportsInvoiceIssuance: false, isConnected: true },
  { providerType: 'Logo', supportsBalanceSync: true, supportsInvoiceIssuance: true, isConnected: false },
  { providerType: 'Mikro', supportsBalanceSync: true, supportsInvoiceIssuance: true, isConnected: false },
  { providerType: 'Netsis', supportsBalanceSync: true, supportsInvoiceIssuance: false, isConnected: false },
];

const ACCOUNTING_PROVIDER: AccountingProviderConfig = {
  id: 1, providerType: 'Manual', isActive: true, apiBaseUrl: null, configuredCredentialKeys: [],
  lastConnectionTestAt: null, lastConnectionTestSuccess: null, lastConnectionTestError: null, updatedAt: ago(60),
};

const EINVOICE_CAPABILITIES: EInvoiceProviderCapabilities[] = [
  { providerType: 'Manual', isConnected: true },
  { providerType: 'Foriba', isConnected: false },
  { providerType: 'Uyumsoft', isConnected: false },
  { providerType: 'Efinans', isConnected: false },
  { providerType: 'Logo', isConnected: false },
];

function einvoiceProvider(request: DemoRequest): EInvoiceProviderConfig {
  return {
    id: Number(request.params.id), billingEntityId: Number(request.params.id), providerType: 'Manual', isActive: true,
    apiBaseUrl: null, configuredCredentialKeys: [], lastConnectionTestAt: null, lastConnectionTestSuccess: null,
    lastConnectionTestError: null, updatedAt: ago(40),
  };
}

// ── Katalog verileri ───────────────────────────────────────────────────────────

const TURKIYE_ILLERI = ['Adana', 'Ankara', 'Antalya', 'Aydın', 'Balıkesir', 'Bursa', 'Denizli', 'Diyarbakır', 'Eskişehir', 'Gaziantep', 'Hatay', 'İstanbul', 'İzmir', 'Kayseri', 'Kocaeli', 'Konya', 'Malatya', 'Manisa', 'Mersin', 'Muğla', 'Sakarya', 'Samsun', 'Tekirdağ', 'Trabzon'];

export const financeAccountingRoutes: DemoRoute[] = [
  get('/billing-entities/:id/einvoice-provider/capabilities', () => EINVOICE_CAPABILITIES),
  get('/billing-entities/:id/einvoice-provider/active', einvoiceProvider),
  get('/billing-entities/:id', (request) => findEntity(Number(request.params.id)) ?? new DemoHttpResponse(NOT_FOUND_STATUS)),
  get('/billing-entities', () => BILLING_ENTITIES),
  get('/accounting-provider/capabilities', () => ACCOUNTING_CAPABILITIES),
  get('/accounting-provider/active', () => ACCOUNTING_PROVIDER),
  get('/ledger-accounts', (request) => chartFor(entityId(request))),
  get('/accounting-periods', periods),
  get('/journal-entries/number-integrity', numberIntegrity),
  get('/journal-entries', journalEntries),
  get('/ledger-reports/trial-balance', trialBalance),
  get('/ledger-reports/general-ledger/:id', generalLedger),
  get('/account-mappings', accountMappings),
  get('/accounting/reference/turkiye-illeri', () => TURKIYE_ILLERI),
];
