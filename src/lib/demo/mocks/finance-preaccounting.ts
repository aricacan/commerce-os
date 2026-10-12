// Ön muhasebe: B2B müşteriler, cari hareketler, kasa/banka hesapları ve tahsilat/ödemeler.
import type {
  AgingReport,
  CurrencyBalance,
  Customer,
  CustomerBalance,
  CustomerLedgerEntry,
  Payment,
  TreasuryAccount,
  TreasuryTransaction,
} from '../../api/pre-accounting';
import { TR_ENTITY_ID, UK_ENTITY_ID, accountId } from '../data/finance-accounting';
import { GBP_TRY_RATE, round2 } from '../data/finance-base';
import { ago, createRng, dayAgo } from '../seed';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';

const NOT_FOUND_STATUS = 404;
const CUSTOMER_COUNT = 12;
const UK_CUSTOMER_COUNT = 3;
const ENTRIES_PER_CUSTOMER = 8;
const TREASURY_TRANSACTION_COUNT = 24;
const PAYMENT_COUNT = 22;
const AGING_LABELS = ['0-30 gün', '31-60 gün', '61-90 gün', '90+ gün'];

const CUSTOMER_NAMES = [
  'Güneş Oto Yedek Parça', 'Marmara Aksesuar Ticaret', 'Anadolu Oto Market', 'Ege Araç Donanım', 'Boğaz Oto Center',
  'Kuzey Filo Hizmetleri', 'Karadeniz Oto Pazarı', 'Başkent Araç Aksesuarları', 'Akdeniz Tuning Atölyesi',
  'Northern Auto Accessories Ltd', 'Midlands Car Parts Ltd', 'Thames Motor Supplies',
];
const TR_CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Konya', 'Adana', 'Kayseri', 'Mersin'];
const UK_CITIES = ['Manchester', 'Birmingham', 'London'];

const isUkCustomer = (index: number): boolean => index >= CUSTOMER_COUNT - UK_CUSTOMER_COUNT;

const CUSTOMERS: Customer[] = Array.from({ length: CUSTOMER_COUNT }, (_, index) => {
  const uk = isUkCustomer(index);
  return {
    id: index + 1,
    name: CUSTOMER_NAMES[index],
    taxNumber: uk ? `GB00000${index}` : `99900001${String(index).padStart(2, '0')}`,
    taxOffice: uk ? null : 'Demo Vergi Dairesi',
    phone: uk ? `+44 161 000 00${index}` : `+90 212 000 00${String(index).padStart(2, '0')}`,
    email: `satinalma${index + 1}@example.com`,
    country: uk ? 'UK' : 'TR',
    city: uk ? UK_CITIES[index % UK_CITIES.length] : TR_CITIES[index % TR_CITIES.length],
    addressLine: uk ? `${index + 1} Example Street` : `Örnek Mahallesi ${index + 1}. Cadde No:${index + 3}`,
    paymentTermDays: [15, 30, 45, 60][index % 4],
    currency: uk ? 'GBP' : 'TRY',
    creditLimit: uk ? 15_000 : 250_000,
    status: index === 7 ? 'Inactive' : 'Active',
    notes: null,
    createdAt: ago(300 - index * 14),
  };
});

function findCustomer(request: DemoRequest): Customer | undefined {
  return CUSTOMERS.find((customer) => customer.id === Number(request.params.id));
}

// ── Cari hareketler ────────────────────────────────────────────────────────────

function ledgerEntries(customerId: number): CustomerLedgerEntry[] {
  const customer = CUSTOMERS[customerId - 1];
  if (!customer) return [];
  const rng = createRng(customerId * 17);
  const scale = customer.currency === 'GBP' ? 1 : GBP_TRY_RATE;
  return Array.from({ length: ENTRIES_PER_CUSTOMER }, (_, index): CustomerLedgerEntry => {
    const isDebit = index % 3 !== 2;
    return {
      id: customerId * 100 + index,
      customerId,
      entryDate: dayAgo(ENTRIES_PER_CUSTOMER * 9 - index * 9),
      type: isDebit ? 'Debit' : 'Credit',
      amount: round2(rng.int(isDebit ? 900 : 700, isDebit ? 6500 : 5200) * scale),
      currency: customer.currency,
      description: isDebit ? 'Satış faturası' : 'Havale ile tahsilat',
      referenceNumber: isDebit ? `DMO2026${String(customerId * 100 + index).padStart(9, '0')}` : null,
      paymentId: null,
      createdAt: ago(ENTRIES_PER_CUSTOMER * 9 - index * 9),
    };
  });
}

function currencyBalance(customerId: number): CurrencyBalance {
  const entries = ledgerEntries(customerId);
  const totalDebit = round2(entries.filter((entry) => entry.type === 'Debit').reduce((sum, entry) => sum + entry.amount, 0));
  const totalCredit = round2(entries.filter((entry) => entry.type === 'Credit').reduce((sum, entry) => sum + entry.amount, 0));
  return { currency: CUSTOMERS[customerId - 1]?.currency ?? 'TRY', totalDebit, totalCredit, balance: round2(totalDebit - totalCredit) };
}

function customerAging(request: DemoRequest): AgingReport {
  const customerId = Number(request.params.id);
  const balance = currencyBalance(customerId);
  const open = Math.max(0, balance.balance);
  const shares = [0.4, 0.3, 0.2, 0.1];
  return {
    asOfDate: dayAgo(0),
    balances: [{
      currency: balance.currency,
      openBalance: open,
      buckets: AGING_LABELS.map((label, index) => ({ label, amount: round2(open * shares[index]) })),
    }],
  };
}

// ── Kasa / banka ───────────────────────────────────────────────────────────────

const TREASURY_SEEDS: [number, string, TreasuryAccount['type'], string, string | null, number][] = [
  [TR_ENTITY_ID, 'Merkez Kasa', 'Cash', 'TRY', null, 48_500],
  [TR_ENTITY_ID, 'Demo Banka - Vadesiz TL', 'Bank', 'TRY', 'Demo Banka', 1_284_300],
  [UK_ENTITY_ID, 'Demo Bank UK - Business', 'Bank', 'GBP', 'Demo Bank UK', 18_640],
];

const TREASURY_ACCOUNTS: TreasuryAccount[] = TREASURY_SEEDS.map(([billingEntityId, name, type, currency, bankName, balance], index) => ({
  id: index + 1,
  billingEntityId, name, type, currency,
  iban: null, bankName, accountNumber: null,
  ledgerAccountId: accountId(billingEntityId, type === 'Cash' ? '100' : '102'),
  ledgerAccountCode: type === 'Cash' ? '100' : '102',
  ledgerAccountName: type === 'Cash' ? 'Kasa' : 'Bankalar',
  isActive: true,
  balance,
}));

function treasuryTransactions(request: DemoRequest): TreasuryTransaction[] {
  const account = TREASURY_ACCOUNTS.find((item) => item.id === Number(request.params.id));
  if (!account) return [];
  const rng = createRng(account.id * 23);
  const scale = account.currency === 'GBP' ? 1 : GBP_TRY_RATE;
  const deltas = Array.from({ length: TREASURY_TRANSACTION_COUNT }, (_, index) => {
    const incoming = index % 3 !== 1;
    return { incoming, amount: round2(rng.int(400, 4200) * scale), age: (TREASURY_TRANSACTION_COUNT - index) * 3 };
  });
  const net = deltas.reduce((sum, row) => sum + (row.incoming ? row.amount : -row.amount), 0);
  let running = round2(account.balance - net);
  return deltas.map((row, index): TreasuryTransaction => {
    running = round2(running + (row.incoming ? row.amount : -row.amount));
    return {
      id: account.id * 1000 + index,
      treasuryAccountId: account.id,
      transactionDate: dayAgo(row.age),
      direction: row.incoming ? 'In' : 'Out',
      amount: row.amount,
      description: row.incoming ? 'Pazaryeri hakediş ödemesi' : 'Tedarikçi ödemesi',
      sourceType: row.incoming ? 'Payment' : 'Manual',
      sourceId: null,
      runningBalance: running,
      createdAt: ago(row.age),
    };
  }).reverse();
}

// ── Tahsilat / ödeme ───────────────────────────────────────────────────────────

function payments(request: DemoRequest): Payment[] {
  const billingEntityId = Number(request.query.get('billingEntityId')) || TR_ENTITY_ID;
  const customerId = Number(request.query.get('customerId')) || null;
  const rng = createRng(billingEntityId * 41);
  const treasury = TREASURY_ACCOUNTS.filter((account) => account.billingEntityId === billingEntityId);
  const entityCustomers = CUSTOMERS.filter((customer) => (billingEntityId === UK_ENTITY_ID) === (customer.currency === 'GBP'));
  const list = Array.from({ length: PAYMENT_COUNT }, (_, index): Payment => {
    const customer = entityCustomers[index % entityCustomers.length];
    const account = treasury[index % treasury.length];
    const collection = index % 4 !== 3;
    const scale = account.currency === 'GBP' ? 1 : GBP_TRY_RATE;
    return {
      id: billingEntityId * 100 + index,
      billingEntityId,
      direction: collection ? 'Collection' : 'Disbursement',
      paymentDate: dayAgo(index * 4 + 1),
      amount: round2(rng.int(800, 7200) * scale),
      currency: account.currency,
      customerId: collection ? customer.id : null,
      customerName: collection ? customer.name : null,
      supplierId: null,
      supplierName: collection ? null : 'Örnek Tedarik Sanayi Ltd.',
      treasuryAccountId: account.id,
      treasuryAccountName: account.name,
      invoiceId: null,
      method: collection ? 'Havale/EFT' : 'Havale',
      referenceNumber: null,
      description: collection ? 'Fatura tahsilatı' : 'Mal alım ödemesi',
      journalEntryId: null,
      journalEntryNumber: null,
      createdAt: ago(index * 4 + 1),
    };
  });
  return customerId ? list.filter((payment) => payment.customerId === customerId) : list;
}

export const financePreAccountingRoutes: DemoRoute[] = [
  get('/customers/:id', (request) => findCustomer(request) ?? new DemoHttpResponse(NOT_FOUND_STATUS)),
  get('/customers', () => CUSTOMERS),
  get('/customer-ledger/:id/entries', (request) => ledgerEntries(Number(request.params.id))),
  get('/customer-ledger/:id/balance', (request): CustomerBalance => ({
    customerId: Number(request.params.id),
    balances: [currencyBalance(Number(request.params.id))],
  })),
  get('/customer-ledger/:id/aging', customerAging),
  get('/treasury-accounts/:id/transactions', treasuryTransactions),
  get('/treasury-accounts', (request) => {
    const billingEntityId = Number(request.query.get('billingEntityId'));
    return billingEntityId ? TREASURY_ACCOUNTS.filter((account) => account.billingEntityId === billingEntityId) : TREASURY_ACCOUNTS;
  }),
  get('/payments', payments),
];
