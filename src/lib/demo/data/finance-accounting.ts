// Muhasebe mock verisi: fatura kesen şirketler, hesap planı ve yevmiye fişleri.
// Fişler aylık satış/alış/tahsilat/gider hareketlerinden üretilir ve her biri dengelidir.
import type { BillingEntity } from '../../api/billing-entity';
import type { JournalEntry, JournalEntryLine, LedgerAccount, LedgerAccountType } from '../../api/ledger';
import { ago } from '../seed';
import { lastMonths, monthFigures, round2 } from './finance-base';

export const TR_ENTITY_ID = 1;
export const UK_ENTITY_ID = 2;
const ACCOUNT_ID_STRIDE = 1000;
const ENTRY_ID_STRIDE = 10000;
const JOURNAL_MONTHS = 12;
const DRAFT_ENTRY_COUNT = 3;

export const BILLING_ENTITIES: BillingEntity[] = [
  {
    id: TR_ENTITY_ID,
    legalName: 'Demo Oto Aksesuar Ticaret A.Ş.',
    taxNumber: '9990000001',
    taxOffice: 'Demo Vergi Dairesi',
    mersisNumber: '0999000000000001',
    tradeRegistryNumber: '000001',
    addressLine: 'Örnek Sanayi Sitesi 12. Sokak No:4',
    city: 'İstanbul',
    district: 'Tuzla',
    postCode: '34000',
    phone: '+90 212 000 00 01',
    email: 'muhasebe@example.com',
    iban: null,
    bankName: 'Demo Banka',
    authorizedPersonName: 'Demo Yetkili',
    authorizedPersonTitle: 'Genel Müdür',
    isActive: true,
    requireApprovalBeforeIssue: true,
    storeCodes: ['store-a', 'store-b'],
    documents: [
      { id: 1, documentType: 'Vergi Levhası', fileName: 'vergi-levhasi.pdf', contentType: 'application/pdf', sizeBytes: 182_400, uploadedAt: ago(120) },
      { id: 2, documentType: 'İmza Sirküleri', fileName: 'imza-sirkuleri.pdf', contentType: 'application/pdf', sizeBytes: 241_900, uploadedAt: ago(120) },
    ],
    createdAt: ago(400),
    updatedAt: ago(30),
  },
  {
    id: UK_ENTITY_ID,
    legalName: 'Demo Auto Accessories Ltd',
    taxNumber: 'GB000000001',
    taxOffice: null,
    mersisNumber: null,
    tradeRegistryNumber: '00000001',
    addressLine: '1 Example Road',
    city: 'Manchester',
    district: null,
    postCode: 'M1 1AA',
    phone: '+44 161 000 0001',
    email: 'accounts@example.com',
    iban: null,
    bankName: 'Demo Bank UK',
    authorizedPersonName: 'Demo Director',
    authorizedPersonTitle: 'Director',
    isActive: true,
    requireApprovalBeforeIssue: false,
    storeCodes: ['store-c'],
    documents: [],
    createdAt: ago(380),
    updatedAt: ago(45),
  },
];

// ── Hesap planı ────────────────────────────────────────────────────────────────

interface AccountSeed {
  code: string;
  name: string;
  type: LedgerAccountType;
  postable: boolean;
}

const ACCOUNT_SEEDS: AccountSeed[] = [
  { code: '10', name: 'Hazır Değerler', type: 'Asset', postable: false },
  { code: '100', name: 'Kasa', type: 'Asset', postable: true },
  { code: '102', name: 'Bankalar', type: 'Asset', postable: true },
  { code: '12', name: 'Ticari Alacaklar', type: 'Asset', postable: false },
  { code: '120', name: 'Alıcılar', type: 'Asset', postable: true },
  { code: '15', name: 'Stoklar', type: 'Asset', postable: false },
  { code: '153', name: 'Ticari Mallar', type: 'Asset', postable: true },
  { code: '19', name: 'Diğer Dönen Varlıklar', type: 'Asset', postable: false },
  { code: '191', name: 'İndirilecek KDV', type: 'Asset', postable: true },
  { code: '32', name: 'Ticari Borçlar', type: 'Liability', postable: false },
  { code: '320', name: 'Satıcılar', type: 'Liability', postable: true },
  { code: '33', name: 'Diğer Borçlar', type: 'Liability', postable: false },
  { code: '335', name: 'Personele Borçlar', type: 'Liability', postable: true },
  { code: '36', name: 'Ödenecek Vergi ve Yükümlülükler', type: 'Liability', postable: false },
  { code: '360', name: 'Ödenecek Vergi ve Fonlar', type: 'Liability', postable: true },
  { code: '39', name: 'Diğer Kısa Vadeli Yabancı Kaynaklar', type: 'Liability', postable: false },
  { code: '391', name: 'Hesaplanan KDV', type: 'Liability', postable: true },
  { code: '50', name: 'Ödenmiş Sermaye', type: 'Equity', postable: false },
  { code: '500', name: 'Sermaye', type: 'Equity', postable: true },
  { code: '57', name: 'Geçmiş Yıllar Kârları', type: 'Equity', postable: false },
  { code: '570', name: 'Geçmiş Yıllar Kârları', type: 'Equity', postable: true },
  { code: '60', name: 'Brüt Satışlar', type: 'Revenue', postable: false },
  { code: '600', name: 'Yurt İçi Satışlar', type: 'Revenue', postable: true },
  { code: '601', name: 'Yurt Dışı Satışlar', type: 'Revenue', postable: true },
  { code: '62', name: 'Satışların Maliyeti', type: 'Expense', postable: false },
  { code: '621', name: 'Satılan Ticari Mallar Maliyeti', type: 'Expense', postable: true },
  { code: '76', name: 'Pazarlama Satış ve Dağıtım Giderleri', type: 'Expense', postable: false },
  { code: '760', name: 'Pazarlama ve Reklam Giderleri', type: 'Expense', postable: true },
  { code: '77', name: 'Genel Yönetim Giderleri', type: 'Expense', postable: false },
  { code: '770', name: 'Genel Yönetim Giderleri', type: 'Expense', postable: true },
];

const DEBIT_TYPES: LedgerAccountType[] = ['Asset', 'Expense'];

export function accountId(billingEntityId: number, code: string): number {
  return billingEntityId * ACCOUNT_ID_STRIDE + ACCOUNT_SEEDS.findIndex((seed) => seed.code === code) + 1;
}

export function entityOfAccount(ledgerAccountId: number): number {
  return Math.floor(ledgerAccountId / ACCOUNT_ID_STRIDE);
}

export function chartFor(billingEntityId: number): LedgerAccount[] {
  return ACCOUNT_SEEDS.map((seed) => {
    const parentCode = seed.postable ? seed.code.slice(0, 2) : null;
    return {
      id: accountId(billingEntityId, seed.code),
      billingEntityId,
      code: seed.code,
      name: seed.name,
      type: seed.type,
      normalSide: DEBIT_TYPES.includes(seed.type) ? 'Debit' : 'Credit',
      parentAccountId: parentCode ? accountId(billingEntityId, parentCode) : null,
      parentAccountCode: parentCode,
      isPostable: seed.postable,
      isActive: true,
    };
  });
}

function accountName(code: string): string {
  return ACCOUNT_SEEDS.find((seed) => seed.code === code)?.name ?? code;
}

// ── Yevmiye fişleri ────────────────────────────────────────────────────────────

type LineSpec = [code: string, debit: number, credit: number];

interface EntrySpec {
  date: string;
  description: string;
  sourceType: string;
  lines: LineSpec[];
}

function monthEntrySpecs(year: number, month: number, scale: number): EntrySpec[] {
  const figures = monthFigures(year, month);
  const pad = String(month).padStart(2, '0');
  const sales = round2(figures.revenue * scale);
  const salesNet = round2(sales / 1.2);
  const purchases = round2(figures.buyingCost * scale);
  const purchasesNet = round2(purchases / 1.2);
  const expenses = round2(figures.shippingCost * scale + figures.commission * scale);
  return [
    { date: `${year}-${pad}-28`, description: `${pad}/${year} pazaryeri satışları`, sourceType: 'Invoice', lines: [['120', sales, 0], ['600', 0, salesNet], ['391', 0, round2(sales - salesNet)]] },
    { date: `${year}-${pad}-20`, description: `${pad}/${year} mal alışları`, sourceType: 'Invoice', lines: [['153', purchasesNet, 0], ['191', round2(purchases - purchasesNet), 0], ['320', 0, purchases]] },
    { date: `${year}-${pad}-25`, description: `${pad}/${year} pazaryeri tahsilatları`, sourceType: 'Payment', lines: [['102', round2(sales * 0.9), 0], ['120', 0, round2(sales * 0.9)]] },
    { date: `${year}-${pad}-27`, description: `${pad}/${year} kargo ve komisyon giderleri`, sourceType: 'Manual', lines: [['760', expenses, 0], ['102', 0, expenses]] },
  ];
}

/** Bir şirketin son 12 ay fişleri; UK şirketi daha küçük ölçeklidir. */
export function journalEntriesFor(billingEntityId: number): JournalEntry[] {
  const scale = billingEntityId === UK_ENTITY_ID ? 0.2 : 0.8;
  const specs = lastMonths(JOURNAL_MONTHS).flatMap(({ year, month }) => monthEntrySpecs(year, month, scale));
  const ordered = specs.sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date().toISOString().slice(0, 10);
  return ordered.filter((spec) => spec.date <= today).map((spec, index, all) => {
    const isDraft = index >= all.length - DRAFT_ENTRY_COUNT;
    const lines: JournalEntryLine[] = spec.lines.map(([code, debit, credit], lineIndex) => ({
      id: billingEntityId * ENTRY_ID_STRIDE * 10 + index * 10 + lineIndex,
      lineNumber: lineIndex + 1,
      ledgerAccountId: accountId(billingEntityId, code),
      ledgerAccountCode: code,
      ledgerAccountName: accountName(code),
      debitAmount: debit,
      creditAmount: credit,
      description: null,
    }));
    return {
      id: billingEntityId * ENTRY_ID_STRIDE + index + 1,
      billingEntityId,
      accountingPeriodId: billingEntityId * 100 + Number(spec.date.slice(5, 7)),
      entryNumber: isDraft ? null : `YV-${spec.date.slice(0, 4)}-${String(index + 1).padStart(4, '0')}`,
      entryDate: spec.date,
      description: spec.description,
      status: isDraft ? 'Draft' : 'Posted',
      sourceType: spec.sourceType,
      sourceId: null,
      reversalOfEntryId: null,
      postedAt: isDraft ? null : `${spec.date}T18:00:00.000Z`,
      lines,
    };
  });
}
