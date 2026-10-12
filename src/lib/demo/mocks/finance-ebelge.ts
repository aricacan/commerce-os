// Muhasebe raporları: KDV özeti, e-Defter özeti, e-Arşiv günlük rapor, pazaryeri mutabakatı.
import type {
  EArchiveDailyReportSummary,
  ELedgerSummary,
  MarketplaceReconciliationSummary,
  MarketplaceSettlementLine,
  VatSummary,
} from '../../api/e-belge';
import { BILLING_ENTITIES, TR_ENTITY_ID, journalEntriesFor } from '../data/finance-accounting';
import { FINANCE_PLATFORMS, defaultRange, monthFigures, round2 } from '../data/finance-base';
import { DEMO_INVOICES } from '../data/finance-invoices';
import { DEMO_PRODUCTS, DEMO_STORES } from '../data/core';
import { createRng, dayAgo } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';

const SETTLEMENT_LINE_COUNT = 12;
const E_ARCHIVE_RANGE_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SETTLEMENT_NOTE = 'Demo verisi: mutabakat satırları örnek pazaryeri hakedişinden üretilmiştir.';

function periodOf(request: DemoRequest): { year: number; month: number } {
  const now = new Date();
  return {
    year: Number(request.query.get('year')) || now.getFullYear(),
    month: Number(request.query.get('month')) || now.getMonth() + 1,
  };
}

function entityOf(request: DemoRequest) {
  const id = Number(request.query.get('billingEntityId')) || TR_ENTITY_ID;
  return BILLING_ENTITIES.find((entity) => entity.id === id) ?? BILLING_ENTITIES[0];
}

function monthBounds(year: number, month: number): { startDate: string; endDate: string } {
  const pad = String(month).padStart(2, '0');
  return { startDate: `${year}-${pad}-01`, endDate: `${year}-${pad}-${new Date(year, month, 0).getDate()}` };
}

// ── KDV özeti ──────────────────────────────────────────────────────────────────

function vatSummary(request: DemoRequest): VatSummary {
  const { year, month } = periodOf(request);
  const entity = entityOf(request);
  const figures = monthFigures(year, month);
  const salesNet = round2(figures.revenue / 1.2);
  const purchasesNet = round2(figures.buyingCost / 1.2);
  const calculated = round2(figures.revenue - salesNet);
  const deductible = round2(figures.buyingCost - purchasesNet);
  const balance = round2(calculated - deductible);
  const saleRates = [{ vatRate: 20, share: 0.9 }, { vatRate: 10, share: 0.08 }, { vatRate: 1, share: 0.02 }];
  const breakdown = (net: number, vat: number) => saleRates.map(({ vatRate, share }) => ({
    vatRate, taxableAmount: round2(net * share), vatAmount: round2(vat * share), invoiceCount: Math.round(share * 120),
  }));
  return {
    billingEntityId: entity.id, billingEntityName: entity.legalName, year, month, ...monthBounds(year, month),
    totalSalesRevenue: salesNet, totalPurchaseExpenses: purchasesNet,
    totalCalculatedVat: calculated, totalDeductibleVat: deductible,
    payableVat: Math.max(0, balance), carryForwardVat: Math.max(0, -balance),
    salesVatBreakdown: breakdown(salesNet, calculated),
    purchaseVatBreakdown: breakdown(purchasesNet, deductible),
    statusSummary: 'Dönem açık — taslak fişler hesaba katılmadı.',
    totalWithholdingAmount: 0, withholdingBreakdown: null, unconvertedCurrencyInvoiceCount: 0,
  };
}

// ── e-Defter ───────────────────────────────────────────────────────────────────

function eLedgerSummary(request: DemoRequest): ELedgerSummary {
  const { year, month } = periodOf(request);
  const entity = entityOf(request);
  const { startDate, endDate } = monthBounds(year, month);
  const entries = journalEntriesFor(entity.id).filter((entry) => entry.status === 'Posted' && entry.entryDate >= startDate && entry.entryDate <= endDate);
  const lines = entries.flatMap((entry) => entry.lines);
  const totalDebit = round2(lines.reduce((sum, line) => sum + line.debitAmount, 0));
  const totalCredit = round2(lines.reduce((sum, line) => sum + line.creditAmount, 0));
  return {
    billingEntityId: entity.id, legalName: entity.legalName, taxNumber: entity.taxNumber, year, month, startDate, endDate,
    totalJournalEntries: entries.length, totalJournalLines: lines.length,
    firstEntryNumber: entries[0]?.entryNumber ?? null, lastEntryNumber: entries[entries.length - 1]?.entryNumber ?? null,
    totalDebit, totalCredit, difference: round2(totalDebit - totalCredit), isBalanced: totalDebit === totalCredit,
    activeAccountsCount: new Set(lines.map((line) => line.ledgerAccountId)).size,
    sha256Hash: '9f2c1d7a4b6e08a35c91d4f7e2b60a18c3d5e7f90142b8a6c0d3e5f7a9b1c2d4',
    statusSummary: 'Dönem özeti hazır (demo).',
  };
}

// ── e-Arşiv günlük rapor ───────────────────────────────────────────────────────

function eArchiveDailyReport(request: DemoRequest): EArchiveDailyReportSummary[] {
  const { from, to } = defaultRange(request.query, E_ARCHIVE_RANGE_DAYS);
  const days = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY) + 1;
  const rng = createRng(days * 3);
  return Array.from({ length: Math.min(days, 60) }, (_, index) => {
    const reportDate = new Date(new Date(to).getTime() - index * MS_PER_DAY).toISOString().slice(0, 10);
    const dayInvoices = DEMO_INVOICES.filter((invoice) => invoice.direction === 'Outgoing' && invoice.scenario === 'EArsivFatura' && invoice.invoiceDate === reportDate);
    const reported = index > 2;
    return {
      reportDate,
      invoiceCount: dayInvoices.length || rng.int(18, 64),
      totalAmount: round2(dayInvoices.reduce((sum, invoice) => sum + invoice.amount, 0) || rng.int(9000, 41000)),
      isReported: reported,
      reportedAt: reported ? `${dayAgo(index - 1)}T09:00:00.000Z` : null,
      note: null,
    };
  });
}

// ── Pazaryeri mutabakatı ───────────────────────────────────────────────────────

function settlementLines(year: number, month: number): MarketplaceSettlementLine[] {
  const rng = createRng(year * 100 + month + 5);
  return Array.from({ length: SETTLEMENT_LINE_COUNT }, (_, index) => {
    const product = DEMO_PRODUCTS[(index * 9) % DEMO_PRODUCTS.length];
    const gross = round2(product.price * rng.int(1, 3));
    const commissionRate = 14;
    const commissionAmount = round2(gross * commissionRate / 100);
    const cargoAmount = round2(rng.float(38, 92));
    const otherDeductions = round2(rng.float(0, 9));
    return {
      orderNumber: `${10470000000 + index * 173}`,
      orderDate: `${year}-${String(month).padStart(2, '0')}-${String(index % 27 + 1).padStart(2, '0')}`,
      grossAmount: gross, commissionAmount, commissionRate, cargoAmount, otherDeductions,
      netPayout: round2(gross - commissionAmount - cargoAmount - otherDeductions),
      transactionStatus: 'Sale',
    };
  });
}

function marketplaceReconciliation(request: DemoRequest): MarketplaceReconciliationSummary {
  const { year, month } = periodOf(request);
  const platform = FINANCE_PLATFORMS[0];
  const figures = monthFigures(year, month);
  const trendyol = figures.platforms[0];
  const store = DEMO_STORES[0];
  const grossSales = trendyol.revenue;
  const totalCommission = trendyol.commission;
  const totalCargo = round2(figures.shippingCost * platform.share);
  const totalOtherDeductions = trendyol.serviceFee;
  const matchedTotal = round2(totalCommission * 0.985);
  return {
    storeId: 1, storeName: store.name, platformName: platform.name, year, month, ...monthBounds(year, month),
    totalOrders: trendyol.orderCount, grossSales, totalCommission, totalCargo, totalOtherDeductions,
    netPayout: round2(grossSales - totalCommission - totalCargo - totalOtherDeductions),
    matchedInvoicesCount: 1, matchedInvoicesTotal: matchedTotal,
    discrepancyAmount: round2(totalCommission - matchedTotal),
    status: 'DiscrepancyDetected',
    summaryNotes: SETTLEMENT_NOTE,
    recentLines: settlementLines(year, month),
  };
}

export const financeEBelgeRoutes: DemoRoute[] = [
  get('/accounting/vat-summary', vatSummary),
  get('/accounting/e-ledger/summary', eLedgerSummary),
  get('/accounting/e-archive-daily-report', eArchiveDailyReport),
  get('/accounting/marketplace-reconciliation/summary', marketplaceReconciliation),
];
