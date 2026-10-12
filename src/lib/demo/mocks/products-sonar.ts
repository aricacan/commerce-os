// Sonar (OEM → B2B tedarikçi eşleştirme): siteler, Excel yüklemeleri, tarama işleri, OEM sözlüğü, karşılaştırma stüdyosu.
import type {
  CrawlJobDto,
  ImportBatchDto,
  MatchReviewItemDto,
  OemDetailDto,
  OemEntryDto,
  OemLedgerPage,
  OemSupplierLineDto,
  StudioCell,
  StudioRow,
  StudioTable,
  SupplierSiteDto,
  SupplierSuggestionDto,
} from '../../api/sonar';
import { VEHICLE_MODELS } from '../data/products-catalog';
import { DemoHttpResponse, get, type DemoRoute } from '../router';
import { ago, createRng, matchesSearch, paginate } from '../seed';

const NOT_FOUND_STATUS = 404;
const SONAR_SEED = 70051;
const OEM_COUNT = 48;
const OEM_PAGE_SIZE = 25;
const STUDIO_PAGE_SIZE = 25;
const REVIEW_QUEUE_COUNT = 6;
const PART_TYPES = ['Paspas', 'Bagaj havuzu', 'Silecek', 'Far ampulü', 'Tavan barı', 'Çamurluk'];
const MAKES = Object.keys(VEHICLE_MODELS);
const ROW_COUNT_PER_BATCH = [1240, 860];

const rng = createRng(SONAR_SEED);

const SITES: SupplierSiteDto[] = [
  { id: 1, siteKey: 'demo-b2b-a', displayName: 'Demo B2B Tedarik A', baseUrl: 'https://b2b-a.example.com', hasCredentials: true, healthState: 'Healthy', healthReason: null, healthChangedAt: ago(9), isEnabled: true, delayMinMs: 2000, delayMaxMs: 4000, maxConcurrency: 1, requestsPerHour: 240, activeProfileRevision: 3, lastVerifiedAt: ago(1), cooldownUntil: null },
  { id: 2, siteKey: 'demo-b2b-b', displayName: 'Demo B2B Tedarik B', baseUrl: 'https://b2b-b.example.com', hasCredentials: true, healthState: 'Suspect', healthReason: 'Fiyat alanı son 10 aramanın 3\'ünde boş geldi.', healthChangedAt: ago(1), isEnabled: true, delayMinMs: 2500, delayMaxMs: 5000, maxConcurrency: 1, requestsPerHour: 180, activeProfileRevision: 2, lastVerifiedAt: ago(4), cooldownUntil: null },
  { id: 3, siteKey: 'demo-b2b-c', displayName: 'Demo B2B Tedarik C', baseUrl: 'https://b2b-c.example.com', hasCredentials: false, healthState: 'NotDiscovered', healthReason: 'Henüz keşif yapılmadı.', healthChangedAt: null, isEnabled: false, delayMinMs: 2000, delayMaxMs: 4000, maxConcurrency: 1, requestsPerHour: 200, activeProfileRevision: null, lastVerifiedAt: null, cooldownUntil: null },
];

const IMPORTS: ImportBatchDto[] = ROW_COUNT_PER_BATCH.map((rowCount, index) => ({
  id: index + 1,
  fileName: `oem-listesi-${index + 1}.xlsx`,
  rowCount,
  uniqueOemCount: Math.round(rowCount * 0.82),
  junkTokenCount: 14 + index * 9,
  unsearchableRowCount: 31 + index * 12,
  rowsWithSupplierCode: Math.round(rowCount * 0.35),
  pendingOemCount: Math.round(rowCount * 0.5),
  uploadedBy: 'Demo Kullanıcı',
  createdAt: ago(8 + index * 6),
}));

const JOBS: CrawlJobDto[] = [
  { id: 1, siteId: 1, siteName: SITES[0].displayName, importBatchId: 1, strategy: 'oem-search', status: 'Completed', processedCount: 620, totalCount: 620, itemsWritten: 548, verifiedThroughSeq: 620, errorMessage: null, adaptedRequestsPerHour: 240, createdAt: ago(7), startedAt: ago(7), finishedAt: ago(6, 20) },
  { id: 2, siteId: 2, siteName: SITES[1].displayName, importBatchId: 2, strategy: 'oem-search', status: 'Running', processedCount: 180, totalCount: 430, itemsWritten: 151, verifiedThroughSeq: 150, errorMessage: null, adaptedRequestsPerHour: 150, createdAt: ago(0, 3), startedAt: ago(0, 3), finishedAt: null },
  { id: 3, siteId: 2, siteName: SITES[1].displayName, importBatchId: 1, strategy: 'oem-search', status: 'AwaitingHuman', processedCount: 75, totalCount: 620, itemsWritten: 60, verifiedThroughSeq: 70, errorMessage: 'Doğrulama (captcha) bekleniyor.', adaptedRequestsPerHour: null, createdAt: ago(3), startedAt: ago(3), finishedAt: null },
];

// ── OEM sözlüğü ─────────────────────────────────────────────────────────────

function oemCode(index: number): string {
  return `${10000 + index * 37}-${String.fromCharCode(65 + (index % 26))}${String.fromCharCode(66 + (index % 20))}`;
}

const OEMS: OemEntryDto[] = Array.from({ length: OEM_COUNT }, (_, index) => {
  const make = MAKES[index % MAKES.length];
  return {
    id: index + 1,
    normalizedOem: oemCode(index).replace('-', ''),
    rawOem: oemCode(index),
    displayName: `${PART_TYPES[index % PART_TYPES.length]} ${make}`,
    brand: index % 2 === 0 ? 'AeroLine' : 'TrackPro',
    vehicleMake: make,
    vehicleModel: VEHICLE_MODELS[make][index % VEHICLE_MODELS[make].length],
    partType: PART_TYPES[index % PART_TYPES.length],
    excelRowCount: rng.int(1, 14),
    supplierCount: index % 5 === 0 ? 0 : rng.int(1, 3),
    firstSeenAt: ago(40 + index),
    lastSeenAt: ago(index % 12),
    isCurated: index % 7 === 0,
    notes: null,
  };
});

function supplierLines(entry: OemEntryDto): OemSupplierLineDto[] {
  const seeded = createRng(entry.id * 11);
  return SITES.slice(0, entry.supplierCount).map((site, offset) => {
    const price = seeded.int(18, 160) * 10;
    return {
      siteId: site.id,
      siteName: site.displayName,
      supplierCode: `${site.siteKey.toUpperCase()}-${entry.id * 3 + offset}`,
      title: entry.displayName,
      price,
      currency: 'TRY',
      stockQty: seeded.int(0, 60),
      stockState: offset === 1 ? 'LowStock' : 'InStock',
      detailUrl: null,
      scrapedAt: ago(offset + 1),
    };
  });
}

function searchOems(query: URLSearchParams): OemLedgerPage {
  const make = query.get('vehicleMake');
  const onlyWithSupplier = query.get('onlyWithSupplier') === 'true';
  const filtered = OEMS.filter((entry) => matchesSearch(entry, query.get('search'), ['normalizedOem', 'rawOem', 'displayName']))
    .filter((entry) => !make || entry.vehicleMake === make)
    .filter((entry) => !onlyWithSupplier || entry.supplierCount > 0);
  const page = paginate(filtered, query, OEM_PAGE_SIZE);
  return { items: page.items, totalCount: page.totalCount, page: page.page, pageSize: page.pageSize };
}

function oemDetail(normalized: string): OemDetailDto | DemoHttpResponse {
  const entry = OEMS.find((item) => item.normalizedOem === normalized);
  return entry ? { entry, suppliers: supplierLines(entry) } : new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'OEM bulunamadı' });
}

// ── Eşleştirme / stüdyo ─────────────────────────────────────────────────────

const REVIEW_QUEUE: MatchReviewItemDto[] = Array.from({ length: REVIEW_QUEUE_COUNT }, (_, index) => {
  const entry = OEMS[index + 3];
  return {
    matchResultId: index + 1,
    productRowId: index + 100,
    rowNumber: index + 12,
    productName: entry.displayName ?? '',
    vehicleMake: entry.vehicleMake,
    vehicleModel: entry.vehicleModel,
    partType: entry.partType,
    queriedOem: entry.rawOem ?? entry.normalizedOem,
    supplierCode: `DEMO-B2B-A-${index + 40}`,
    supplierTitle: `${entry.partType} ${entry.vehicleMake} uyumlu`,
    price: 420 + index * 35,
    currency: 'TRY',
    stockQty: 12 + index,
    detailUrl: null,
    score: 0.72 + index * 0.03,
    breakdown: [
      { rule: 'OEM tam eşleşme', delta: 0.5, explanation: 'OEM kodu başlıkta birebir geçiyor.' },
      { rule: 'Araç uyumu', delta: 0.2, explanation: 'Marka ve model eşleşiyor.' },
      { rule: 'Rakip aday', delta: -0.1, explanation: 'Aynı güçte ikinci bir ürün var.' },
    ],
    decision: 'NeedsReview',
    reason: 'İki aday benzer skorda; insan onayı gerekli.',
    excelSuppliers: [{ supplier: 'Demo B2B Tedarik B', code: `B-${index + 700}`, price: '455,00', currency: 'TRY', productName: entry.displayName, availability: 'Stokta' }],
  };
});

const SUGGESTIONS: SupplierSuggestionDto[] = [
  { supplier: 'Demo Tedarik D', rowsWithCode: 214, rowsWithPrice: 198, sampleCodes: ['D-1021', 'D-1022', 'D-1090'] },
  { supplier: 'Demo Tedarik E', rowsWithCode: 96, rowsWithPrice: 90, sampleCodes: ['E-77', 'E-81'] },
];

function studioCell(site: { id: number }, entry: OemEntryDto, offset: number): StudioCell {
  return {
    supplierCode: `${site.id}-${entry.id * 3 + offset}`,
    title: entry.displayName,
    price: 300 + ((entry.id * 17 + offset * 40) % 500),
    currency: 'TRY',
    stockQty: (entry.id * 5 + offset) % 50,
    stockState: 'InStock',
    detailUrl: null,
    provenance: offset === 0 ? 'Crawled' : 'ExcelImport',
    observedAt: ago(offset + 1),
  };
}

function studioRow(entry: OemEntryDto): StudioRow {
  const sites = SITES.slice(0, Math.max(1, entry.supplierCount));
  const cells: Record<number, StudioCell> = {};
  sites.forEach((site, offset) => {
    cells[site.id] = studioCell(site, entry, offset);
  });
  const cheapest = sites.reduce((best, site) => ((cells[site.id].price ?? 0) < (cells[best.id].price ?? 0) ? site : best), sites[0]);
  return {
    normalizedOem: entry.normalizedOem,
    rawOem: entry.rawOem,
    displayName: entry.displayName,
    vehicleMake: entry.vehicleMake,
    partType: entry.partType,
    cells,
    cheapestSiteId: sites.length > 1 ? cheapest.id : null,
  };
}

function studio(query: URLSearchParams): StudioTable {
  const onlyWithPrice = query.get('onlyWithPrice') === 'true';
  const rows = OEMS.filter((entry) => matchesSearch(entry, query.get('search'), ['normalizedOem', 'displayName']))
    .filter((entry) => !onlyWithPrice || entry.supplierCount > 0)
    .map(studioRow);
  const page = paginate(rows, query, STUDIO_PAGE_SIZE);
  return {
    suppliers: SITES.slice(0, 2).map((site) => ({
      siteId: site.id,
      name: site.displayName,
      filledCells: rows.filter((row) => row.cells[site.id] !== undefined).length,
    })),
    rows: page.items,
    totalCount: page.totalCount,
    page: page.page,
    pageSize: page.pageSize,
  };
}

export const productSonarRoutes: DemoRoute[] = [
  get('/sonar/sites', () => SITES),
  get('/sonar/imports', () => IMPORTS),
  get('/sonar/imports/:id/suppliers/suggestions', () => SUGGESTIONS),
  get('/sonar/jobs', () => JOBS),
  get('/sonar/jobs/:id', (request) => {
    const job = JOBS.find((item) => item.id === Number(request.params.id));
    return job ?? new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'İş bulunamadı' });
  }),
  get('/sonar/matches/review-queue/:batchId', (request) =>
    REVIEW_QUEUE.slice(0, Number(request.query.get('take') ?? REVIEW_QUEUE_COUNT)),
  ),
  get('/sonar/oems', (request) => searchOems(request.query)),
  get('/sonar/oems/:oem', (request) => oemDetail(request.params.oem)),
  get('/sonar/studio', (request) => studio(request.query)),
];
