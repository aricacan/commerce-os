// Shopify Hub katalog/pazarlama sekmeleri: koleksiyon, menü, indirim, hediye kartı, pazar, içerik kalitesi, ERP eşleştirme, araç uyumluluğu.
import type { ShopifyContentScanDto } from '../../api/shopify-content';
import type { ErpMatchReportDto, ErpMatchRowDto } from '../../api/shopify-erp-match';
import type { ShopifyFitmentSetupDto } from '../../api/shopify-fitment';
import type {
  ShopifyDiscountDetailDto, ShopifyDiscountDto, ShopifyGiftCardDto, ShopifyMarketDto,
} from '../../api/shopify-promotions';
import type {
  ShopifyCollectionDetailDto, ShopifyCollectionListItemDto, ShopifyMenuDto, ShopifyMenuListItemDto, ShopifyMenuNodeDto,
  ShopifyMenuSnapshotDto, ShopifyMenuSnapshotDetailDto, ShopifyMenuTargetDto,
} from '../../api/shopify-store-content';
import { currencyOf, shopifyProducts } from '../data/omnichannel-shopify';
import { ago } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { cursorPage, idParam, notFound, numberQuery } from './omnichannel-http';

const store = (request: DemoRequest): number => idParam(request, 'store');

const COLLECTION_DEFS: [string, boolean, number][] = [
  ['Paspaslar', false, 24], ['Bagaj Ürünleri', false, 11], ['İç Aksesuar', true, 18], ['Aydınlatma', true, 9],
  ['Bakım Ürünleri', true, 14], ['Volkswagen Uyumlu', true, 21], ['Yeni Gelenler', false, 12], ['Kampanyalı Ürünler', true, 7],
];

const COLLECTIONS: ShopifyCollectionListItemDto[] = COLLECTION_DEFS.map(([title, isSmart, productCount], index) => ({
  id: 301 + index, title, handle: title.toLocaleLowerCase('tr').replace(/[^a-z0-9ğüşıöç]+/g, '-'), isSmart, productCount, updatedAt: ago(index + 1),
}));

function collectionDetail(request: DemoRequest): ShopifyCollectionDetailDto | ReturnType<typeof notFound> {
  const item = COLLECTIONS.find((candidate) => candidate.id === idParam(request, 'collection'));
  if (!item) return notFound();
  return {
    id: item.id, title: item.title, handle: item.handle, descriptionHtml: `<p>${item.title} koleksiyonu.</p>`, sortOrder: 'BEST_SELLING',
    seoTitle: item.title, seoDescription: `${item.title} - uygun fiyatlar.`, isSmart: item.isSmart, appliedDisjunctively: false,
    rules: item.isSmart ? [{ column: 'TAG', relation: 'EQUALS', condition: item.handle }] : [],
    products: shopifyProducts(store(request)).slice(0, 6).map((product) => ({ id: product.id, title: product.title, handle: null })),
  };
}

const node = (title: string, type: string, items: ShopifyMenuNodeDto[] = []): ShopifyMenuNodeDto => ({
  id: `gid://demo/${title}`, title, type, resourceId: null, url: type === 'HTTP' ? 'https://example.com' : null, tags: [], items,
});

const MENUS: ShopifyMenuDto[] = [
  {
    id: 1, handle: 'main-menu', title: 'Ana menü', isDefault: true, hash: 'demo-hash-1',
    items: [node('Paspaslar', 'COLLECTION'), node('Bagaj', 'COLLECTION', [node('Bagaj Havuzu', 'COLLECTION'), node('Bagaj Organizer', 'COLLECTION')]), node('Aydınlatma', 'COLLECTION'), node('İletişim', 'PAGE')],
  },
  { id: 2, handle: 'footer', title: 'Alt menü', isDefault: false, hash: 'demo-hash-2', items: [node('Hakkımızda', 'PAGE'), node('İade Koşulları', 'PAGE'), node('Gizlilik', 'PAGE')] },
];

const countNodes = (items: ShopifyMenuNodeDto[]): number => items.reduce((sum, item) => sum + 1 + countNodes(item.items), 0);

const menuList = (): ShopifyMenuListItemDto[] =>
  MENUS.map((menu) => ({ id: menu.id, handle: menu.handle, title: menu.title, isDefault: menu.isDefault, itemCount: countNodes(menu.items) }));

const menuSnapshots = (request: DemoRequest): ShopifyMenuSnapshotDto[] => [
  { id: 1, menuId: idParam(request, 'menu'), handle: 'main-menu', title: 'Ana menü', reason: 'Yayın öncesi yedek', takenBy: 1, takenAt: ago(3), itemCount: 7 },
  { id: 2, menuId: idParam(request, 'menu'), handle: 'main-menu', title: 'Ana menü', reason: 'Yayın öncesi yedek', takenBy: 2, takenAt: ago(9), itemCount: 6 },
];

const menuSnapshotDetail = (request: DemoRequest): ShopifyMenuSnapshotDetailDto => ({
  snapshot: menuSnapshots(request)[0], items: MENUS[0].items,
});

const menuTargets = (): ShopifyMenuTargetDto[] =>
  COLLECTIONS.slice(0, 5).map((collection) => ({ resourceId: `gid://demo/Collection/${collection.id}`, type: 'COLLECTION', title: collection.title, handle: collection.handle }));

const DISCOUNT_DEFS: [string, string | null, string, string, number, number][] = [
  ['Hoş geldin %10', 'HOSGELDIN10', 'Code', 'ACTIVE', 10, 142],
  ['Kış kampanyası %15', 'KIS15', 'Code', 'ACTIVE', 15, 87],
  ['Ücretsiz kargo', 'KARGOBEDAVA', 'FreeShipping', 'ACTIVE', 0, 311],
  ['Paspas 2 al 1 öde', null, 'Automatic', 'SCHEDULED', 33, 0],
  ['Eski kampanya', 'ESKI20', 'Code', 'EXPIRED', 20, 64],
];

const DISCOUNTS: ShopifyDiscountDto[] = DISCOUNT_DEFS.map(([title, code, kind, status, value, usageCount], index) => ({
  id: 401 + index, title, code, kind, status, usageCount, usageLimit: index === 4 ? 100 : null, startsAt: ago(30 - index * 3), endsAt: status === 'EXPIRED' ? ago(2) : null,
  appliesOncePerCustomer: index % 2 === 0, valueType: kind === 'FreeShipping' ? null : 'percentage', value: kind === 'FreeShipping' ? null : value,
  currency: null, minimumSubtotal: index === 2 ? 750 : null,
}));

function discountDetail(request: DemoRequest): ShopifyDiscountDetailDto | ReturnType<typeof notFound> {
  const discount = DISCOUNTS.find((candidate) => candidate.id === idParam(request, 'discount'));
  if (!discount) return notFound();
  return {
    id: discount.id, kind: discount.kind, status: discount.status, usageCount: discount.usageCount,
    basic: discount.kind === 'Code' ? {
      title: discount.title, code: discount.code ?? '', valueType: 'percentage', value: discount.value ?? 0, startsAt: discount.startsAt, endsAt: discount.endsAt,
      usageLimit: discount.usageLimit, appliesOncePerCustomer: discount.appliesOncePerCustomer, minimumSubtotal: discount.minimumSubtotal,
      scope: { all: true, products: [], collections: [] },
    } : null,
    bxgy: null,
    freeShipping: discount.kind === 'FreeShipping' ? {
      title: discount.title, code: discount.code ?? '', countryCodes: ['TR'], minimumSubtotal: discount.minimumSubtotal, maximumShippingPrice: null,
      startsAt: discount.startsAt, endsAt: discount.endsAt, usageLimit: discount.usageLimit, appliesOncePerCustomer: discount.appliesOncePerCustomer,
    } : null,
  };
}

const giftCards = (request: DemoRequest): ShopifyGiftCardDto[] => {
  const currency = currencyOf(store(request));
  return [
    { id: 501, lastCharacters: 'A4F2', enabled: true, expiresOn: null, createdAt: ago(20), note: 'Kampanya hediyesi', balance: { amount: 250, currency }, initialValue: { amount: 250, currency }, customerName: null },
    { id: 502, lastCharacters: 'B71C', enabled: true, expiresOn: ago(-60).slice(0, 10), createdAt: ago(8), note: null, balance: { amount: 120, currency }, initialValue: { amount: 200, currency }, customerName: 'Gizem Tan' },
  ];
};

const MARKETS: ShopifyMarketDto[] = [
  { id: 601, name: 'Türkiye', status: 'ACTIVE', type: 'REGION', baseCurrency: 'TRY', regions: ['TR'], priceLists: ['Türkiye fiyat listesi'] },
  { id: 602, name: 'Birleşik Krallık', status: 'ACTIVE', type: 'REGION', baseCurrency: 'GBP', regions: ['GB'], priceLists: [] },
  { id: 603, name: 'Avrupa', status: 'DRAFT', type: 'REGION', baseCurrency: 'EUR', regions: ['DE', 'FR', 'NL'], priceLists: [] },
];

function contentScan(request: DemoRequest): ShopifyContentScanDto {
  const products = shopifyProducts(store(request));
  const issues = products.slice(0, 12).map((product, index) => ({
    id: product.id, title: product.title, imageUrl: null,
    problems: (index % 3 === 0 ? [0, 3] : index % 3 === 1 ? [7] : [8, 9]) as ShopifyContentScanDto['products'][number]['problems'],
  }));
  const countOf = (problem: number) => issues.filter((issue) => (issue.problems as number[]).includes(problem)).length;
  return {
    productsScanned: products.length, truncated: false,
    summary: [0, 3, 7, 8, 9].map((problem) => ({ problem: problem as 0, count: countOf(problem) })).filter((entry) => entry.count > 0),
    products: issues,
  };
}

function erpMatch(request: DemoRequest): ErpMatchReportDto {
  const filter = request.query.get('filter') ?? 'all';
  const page = Math.max(1, numberQuery(request, 'page') ?? 1);
  const pageSize = Math.max(1, numberQuery(request, 'pageSize') ?? 25);
  const all: ErpMatchRowDto[] = shopifyProducts(store(request)).slice(0, 30).map((product, index) => {
    const kind = (index % 7 === 0 ? 'shopifyOnly' : index % 5 === 0 ? 'priceDiff' : index % 6 === 0 ? 'stockDiff' : 'matched') as ErpMatchRowDto['kind'];
    const price = product.variants[0]?.price ?? 0;
    return {
      kind, sku: product.variants[0]?.sku ?? '', shopifyTitle: product.title, erpName: kind === 'shopifyOnly' ? null : product.title,
      erpSource: kind === 'shopifyOnly' ? null : 'Demo ERP', shopifyPrice: price, erpPrice: kind === 'priceDiff' ? price + 40 : price,
      shopifyStock: product.totalInventory, erpStock: kind === 'stockDiff' ? (product.totalInventory ?? 0) + 6 : product.totalInventory,
      priceDiffers: kind === 'priceDiff', stockDiffers: kind === 'stockDiff', suggestedSku: null, note: null,
    };
  });
  const rows = all.filter((row) => filter === 'all' || row.kind === filter);
  return {
    summary: {
      shopifyVariantsScanned: 48, erpItemsScanned: 52, shopifyTruncated: false, erpTruncated: false, shopifyWithoutSkuCount: 0,
      matchedCount: all.filter((row) => row.kind === 'matched').length, shopifyOnlyCount: all.filter((row) => row.kind === 'shopifyOnly').length,
      erpOnlyCount: 4, conflictCount: 0, nearMatchCount: 2, priceDiffCount: all.filter((row) => row.kind === 'priceDiff').length,
      stockDiffCount: all.filter((row) => row.kind === 'stockDiff').length, normalizeCount: 1, matchRate: 0.82, readiness: 'risky',
      readinessReasons: ['Bazı ürünlerde fiyat farkı var.'], priceTolerancePercent: 5, stockTolerance: 3,
    },
    totalRows: rows.length, page, pageSize, rows: rows.slice((page - 1) * pageSize, page * pageSize),
  };
}

const fitmentSetup = (): ShopifyFitmentSetupDto => ({ vehicleDefinitionExists: true, productMetafieldExists: true, isReady: true });

export const shopifyContentRoutes: DemoRoute[] = [
  get('/shopify/stores/:store/collections', (request) => {
    const search = request.query.get('search')?.toLocaleLowerCase('tr') ?? '';
    return cursorPage(COLLECTIONS.filter((item) => !search || item.title.toLocaleLowerCase('tr').includes(search)), request);
  }),
  get('/shopify/stores/:store/collections/:collection', collectionDetail),
  get('/shopify/stores/:store/menus', menuList),
  get('/shopify/stores/:store/menus/:menu', (request) => MENUS.find((menu) => menu.id === idParam(request, 'menu')) ?? notFound()),
  get('/shopify/stores/:store/menus/:menu/snapshots', menuSnapshots),
  get('/shopify/stores/:store/menu-targets', menuTargets),
  get('/shopify/stores/:store/menu-snapshots/:snapshot', menuSnapshotDetail),
  get('/shopify/stores/:store/discounts', (request) => {
    const search = request.query.get('search')?.toLocaleLowerCase('tr') ?? '';
    const status = request.query.get('status');
    return cursorPage(DISCOUNTS.filter((d) => (!search || d.title.toLocaleLowerCase('tr').includes(search)) && (!status || d.status === status)), request);
  }),
  get('/shopify/stores/:store/discounts/:discount', discountDetail),
  get('/shopify/stores/:store/gift-cards', (request) => cursorPage(giftCards(request), request)),
  get('/shopify/stores/:store/markets', (request) => cursorPage(MARKETS, request)),
  get('/shopify/stores/:store/content-quality', contentScan),
  get('/shopify/stores/:store/erp-match', erpMatch),
  get('/shopify/stores/:store/fitment/setup', fitmentSetup),
];
