// Tedarik zinciri: tedarikçi, cari hesap, hammadde, ürün reçetesi, satın alma, stok riski ve mutabakat.
import type { Bom, BomLine } from '../../api/bom';
import type {
  CurrencyBalance,
  LedgerEntry,
  SupplierBalance,
} from '../../api/supplier-ledger';
import type {
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderStatus,
} from '../../api/purchase-order';
import type { StockReconciliationOverview, StockReconciliationRow } from '../../api/stock-reconciliation';
import type { StockRiskRow } from '../../api/stock';
import type { TaxCode } from '../../api/tax-code';
import { CATALOG_PRODUCTS } from '../data/products-catalog';
import { DEMO_RAW_MATERIALS, DEMO_SUPPLIERS } from '../data/products-suppliers';
import { DemoHttpResponse, get, type DemoRoute } from '../router';
import { ago, createRng, dayAgo, matchesSearch } from '../seed';

const NOT_FOUND_STATUS = 404;
const SUPPLY_SEED = 70031;
const BOM_LINES_MIN = 3;
const BOM_LINES_MAX = 4;
const TRY_CURRENCY = 'TRY';
const LEDGER_ENTRIES_PER_SUPPLIER = 10;
const PURCHASE_ORDER_COUNT = 14;
const LOW_STOCK_THRESHOLD = 15;
const RECONCILIATION_STEP = 9;

const rng = createRng(SUPPLY_SEED);

// ── Tedarikçi / hammadde ────────────────────────────────────────────────────

function supplierRoutes(): DemoRoute[] {
  return [
    get('/suppliers', (request) =>
      DEMO_SUPPLIERS.filter((supplier) => matchesSearch(supplier, request.query.get('search'), ['name', 'shortCode', 'city'])),
    ),
    get('/suppliers/:id', (request) => {
      const supplier = DEMO_SUPPLIERS.find((item) => item.id === Number(request.params.id));
      return supplier ?? new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'Tedarikçi bulunamadı' });
    }),
    get('/raw-materials', (request) =>
      DEMO_RAW_MATERIALS.filter((material) => matchesSearch(material, request.query.get('search'), ['name', 'code'])),
    ),
    get('/raw-materials/:id', (request) => {
      const material = DEMO_RAW_MATERIALS.find((item) => item.id === Number(request.params.id));
      return material ?? new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'Hammadde bulunamadı' });
    }),
  ];
}

// ── Cari hesap ──────────────────────────────────────────────────────────────

function buildLedger(supplierId: number): LedgerEntry[] {
  const supplier = DEMO_SUPPLIERS[supplierId - 1];
  return Array.from({ length: LEDGER_ENTRIES_PER_SUPPLIER }, (_, index) => {
    const isDebit = index % 3 !== 2;
    return {
      id: supplierId * 100 + index,
      supplierId,
      entryDate: dayAgo(index * 8 + 2),
      type: isDebit ? 'Debit' : 'Credit',
      amount: rng.int(8, 120) * 100,
      currency: supplier.currency,
      description: isDebit ? 'Mal alım faturası' : 'Havale ile ödeme',
      referenceNumber: `${isDebit ? 'FT' : 'OD'}-${2600 + supplierId * 20 + index}`,
      createdAt: ago(index * 8 + 2),
    };
  });
}

const LEDGERS = new Map(DEMO_SUPPLIERS.map((supplier) => [supplier.id, buildLedger(supplier.id)]));

function ledgerBalance(supplierId: number): SupplierBalance {
  const entries = LEDGERS.get(supplierId) ?? [];
  const byCurrency = new Map<string, CurrencyBalance>();
  for (const entry of entries) {
    const row = byCurrency.get(entry.currency) ?? { currency: entry.currency, totalDebit: 0, totalCredit: 0, balance: 0 };
    if (entry.type === 'Debit') row.totalDebit += entry.amount;
    else row.totalCredit += entry.amount;
    row.balance = row.totalDebit - row.totalCredit;
    byCurrency.set(entry.currency, row);
  }
  return { supplierId, balances: [...byCurrency.values()] };
}

// ── Ürün reçetesi ───────────────────────────────────────────────────────────

function buildBom(productId: number): Bom {
  const seeded = createRng(productId * 13);
  const count = seeded.int(BOM_LINES_MIN, BOM_LINES_MAX);
  const lines: BomLine[] = Array.from({ length: count }, (_, index) => {
    const material = DEMO_RAW_MATERIALS[(productId + index * 3) % DEMO_RAW_MATERIALS.length];
    const quantity = seeded.float(0.5, 4, 1);
    return {
      id: productId * 10 + index,
      rawMaterialId: material.id,
      rawMaterialName: material.name,
      unit: material.unit,
      quantity,
      unitCost: material.unitCost,
      currency: material.currency,
      lineCostTry: Number((quantity * material.unitCost).toFixed(2)),
      notes: null,
    };
  });
  return {
    id: productId,
    productId,
    notes: 'Standart üretim reçetesi',
    lines,
    totalCostTry: Number(lines.reduce((sum, line) => sum + line.lineCostTry, 0).toFixed(2)),
    createdAt: ago(90),
    updatedAt: ago(14),
  };
}

// ── Satın alma ──────────────────────────────────────────────────────────────

const PO_STATUS_CYCLE: PurchaseOrderStatus[] = ['Completed', 'Submitted', 'PartiallyReceived', 'Draft', 'Completed', 'Cancelled', 'Submitted'];

function receivedShare(status: PurchaseOrderStatus, quantity: number): number {
  if (status === 'Completed') return quantity;
  if (status === 'PartiallyReceived') return Math.floor(quantity / 2);
  return 0;
}

function buildLines(orderId: number, status: PurchaseOrderStatus, supplierId: number): PurchaseOrderLine[] {
  const isRawMaterialSupplier = DEMO_SUPPLIERS[supplierId - 1].type === 'RawMaterial';
  return Array.from({ length: 2 + (orderId % 2) }, (_, index) => {
    const quantity = rng.int(2, 20) * 10;
    const base = { id: orderId * 10 + index, quantity, receivedQuantity: receivedShare(status, quantity), notes: null };
    if (isRawMaterialSupplier) {
      const material = DEMO_RAW_MATERIALS[(orderId + index) % DEMO_RAW_MATERIALS.length];
      return { ...base, itemType: 'RawMaterial', productId: null, rawMaterialId: material.id, itemName: material.name, unitPrice: material.unitCost, currency: material.currency };
    }
    const product = CATALOG_PRODUCTS[(orderId * 7 + index * 11) % CATALOG_PRODUCTS.length];
    return { ...base, itemType: 'Product', productId: product.productId, rawMaterialId: null, itemName: product.name, unitPrice: product.cost, currency: TRY_CURRENCY };
  });
}

const PURCHASE_ORDERS: PurchaseOrder[] = Array.from({ length: PURCHASE_ORDER_COUNT }, (_, index) => {
  const id = index + 1;
  const status = PO_STATUS_CYCLE[index % PO_STATUS_CYCLE.length];
  const supplierId = (index % DEMO_SUPPLIERS.length) + 1;
  return {
    id,
    supplierId,
    supplierName: DEMO_SUPPLIERS[supplierId - 1].name,
    orderNumber: `SA-${2610 + id}`,
    status,
    orderDate: dayAgo(id * 4),
    expectedDate: dayAgo(id * 4 - 10),
    notes: id % 4 === 0 ? 'Acil sevkiyat talep edildi' : null,
    lines: buildLines(id, status, supplierId),
    createdAt: ago(id * 4),
    updatedAt: ago(id * 4 - 1),
  };
});

// ── Stok riski / mutabakat ──────────────────────────────────────────────────

function buildStockRisk(): StockRiskRow[] {
  return CATALOG_PRODUCTS.map((product) => {
    const seeded = createRng(product.productId * 5);
    const committed = Math.min(product.stock + 6, seeded.int(0, Math.max(4, Math.round(product.stock * 0.6))));
    const available = product.stock - committed;
    const threshold = product.productId % 4 === 0 ? LOW_STOCK_THRESHOLD : null;
    return {
      productId: product.productId,
      supplierSku: product.sku,
      name: product.name,
      erpStock: product.stock,
      committed,
      available,
      unshippedLineCount: committed > 0 ? seeded.int(1, 6) : 0,
      minStockThreshold: threshold,
      atRisk: available <= 0 && committed > 0,
      negative: available < 0,
      belowThreshold: threshold !== null && available < threshold,
    };
  });
}

const STOCK_RISK = buildStockRisk();

function stockAvailability(query: URLSearchParams): StockRiskRow[] {
  const flag = query.get('flag');
  return STOCK_RISK.filter((row) => matchesSearch(row, query.get('search'), ['name', 'supplierSku']))
    .filter((row) => !flag || row[flag as 'atRisk' | 'negative' | 'belowThreshold'] === true);
}

function buildReconciliation(): StockReconciliationRow[] {
  return CATALOG_PRODUCTS.filter((_, index) => index % RECONCILIATION_STEP === 0).map((product) => {
    const seeded = createRng(product.productId * 3);
    const delta = seeded.int(1, 9) * (seeded.chance(0.5) ? 1 : -1);
    const physicalStock = Math.max(0, product.stock + delta);
    return {
      id: product.productId,
      name: product.name,
      supplierSKU: product.sku,
      storeId: product.sources[0].id,
      erpStock: product.stock,
      physicalStock,
      difference: physicalStock - product.stock,
    };
  });
}

const RECONCILIATION = buildReconciliation();

function reconciliationOverview(query: URLSearchParams): StockReconciliationOverview {
  const storeId = Number(query.get('storeId') ?? 0);
  const rows = RECONCILIATION.filter((row) => (!storeId || row.storeId === storeId) && row.difference !== 0);
  return { totalMismatches: rows.length, rows };
}

// ── Vergi kodları ───────────────────────────────────────────────────────────

const TAX_CODE_SEEDS: Pick<TaxCode, 'code' | 'name' | 'type' | 'rate' | 'gibCode'>[] = [
  { code: 'KDV20', name: 'KDV %20', type: 'Vat', rate: 20, gibCode: null },
  { code: 'KDV10', name: 'KDV %10', type: 'Vat', rate: 10, gibCode: null },
  { code: 'KDV1', name: 'KDV %1', type: 'Vat', rate: 1, gibCode: null },
  { code: 'KDV0', name: 'KDV %0', type: 'Vat', rate: 0, gibCode: null },
  { code: 'TEV-5-10', name: 'Kısmi Tevkifat 5/10', type: 'Withholding', rate: 50, gibCode: '602' },
  { code: 'TEV-9-10', name: 'Tam Tevkifat 9/10', type: 'Withholding', rate: 90, gibCode: '650' },
  { code: 'IST-301', name: 'İhracat İstisnası', type: 'Exemption', rate: 0, gibCode: '301' },
  { code: 'IST-351', name: 'İstisna Olmayan Diğer', type: 'Exemption', rate: 0, gibCode: '351' },
  { code: 'OTV-1', name: 'ÖTV 1. Liste', type: 'Otv', rate: 25, gibCode: '0071' },
];

const TAX_EFFECTIVE_DAYS_AGO = 700;

const TAX_CODES: TaxCode[] = TAX_CODE_SEEDS.map((seed, index) => ({
  ...seed,
  id: index + 1,
  effectiveFrom: dayAgo(TAX_EFFECTIVE_DAYS_AGO),
  effectiveTo: null,
  isActive: true,
  createdAt: ago(TAX_EFFECTIVE_DAYS_AGO),
  updatedAt: ago(TAX_EFFECTIVE_DAYS_AGO),
}));

export const productSupplyRoutes: DemoRoute[] = [
  ...supplierRoutes(),
  get('/supplier-ledger/:id/entries', (request) => LEDGERS.get(Number(request.params.id)) ?? []),
  get('/supplier-ledger/:id/balance', (request) => ledgerBalance(Number(request.params.id))),
  get('/products/:id/bom', (request) => {
    const productId = Number(request.params.id);
    return CATALOG_PRODUCTS.some((item) => item.productId === productId)
      ? buildBom(productId)
      : new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'Ürün bulunamadı' });
  }),
  get('/purchase-orders', (request) => {
    const status = request.query.get('status');
    return PURCHASE_ORDERS.filter((order) => !status || order.status === status);
  }),
  get('/purchase-orders/:id', (request) => {
    const order = PURCHASE_ORDERS.find((item) => item.id === Number(request.params.id));
    return order ?? new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'Sipariş bulunamadı' });
  }),
  get('/stock/availability', (request) => stockAvailability(request.query)),
  get('/stock-reconciliation/overview', (request) => reconciliationOverview(request.query)),
  get('/tax-codes', (request) => TAX_CODES.filter((code) => request.query.get('activeOnly') !== 'true' || code.isActive)),
  get('/tax-codes/:id', (request) => {
    const code = TAX_CODES.find((item) => item.id === Number(request.params.id));
    return code ?? new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'Vergi kodu bulunamadı' });
  }),
];
