// Kategori yönetimi: ana kategoriler, kurallar, ham kategori eşleştirme, uyuşmazlık ve taksonomi.
import type { Category, CategoryAdmin, CategoryRule, CategoryUsage } from '../../../types/api';
import type { CategoryMismatchItem, CategoryMismatchListResponse, CategoryMismatchProduct } from '../../api/category-mismatch';
import type { CategoryTemplateSummary } from '../../api/category-templates';
import type {
  CanonicalCategoryDto,
  CategoryTaxonomyDto,
  UnmappedCategoryDto,
} from '../../api/category-taxonomy';
import type {
  CategoryBackfillJobStatus,
  CategoryConflict,
  CategoryDerivationResult,
  CategorySuggestion,
  CategorySuggestionRefreshJobStatus,
  RawSourceCategory,
  SourceCoverage,
} from '../../api/products';
import { CATALOG_PRODUCTS, DEMO_CATEGORIES, DEMO_DATA_SOURCES } from '../data/products-catalog';
import { DemoHttpResponse, get, type DemoRoute } from '../router';
import { ago } from '../seed';

const NOT_FOUND_STATUS = 404;
const UNCATEGORIZED_COUNT = 12;
const AFFECTED_PRODUCT_SAMPLE = 6;
const RULE_AGE_DAYS = 180;

function productsIn(categoryId: number) {
  return CATALOG_PRODUCTS.filter((product) => product.categoryId === categoryId);
}

const categoriesAdmin: CategoryAdmin[] = DEMO_CATEGORIES.map((category) => {
  const products = productsIn(category.id);
  return {
    id: category.id,
    name: category.name,
    nameEn: category.nameEn,
    isActive: true,
    productCount: products.reduce((sum, product) => sum + product.sources.length, 0),
    differentProductCount: products.length,
  };
});

function categoryUsage(id: number): CategoryUsage | null {
  const category = categoriesAdmin.find((item) => item.id === id);
  if (!category) return null;
  return {
    categoryId: category.id,
    categoryName: category.name,
    productCount: category.differentProductCount,
    platformMappingCount: DEMO_DATA_SOURCES.length,
    childCategoryCount: 0,
    sourceCategoryLinkCount: DEMO_DATA_SOURCES.length * 2,
    priceTargetCount: 1,
    fitmentMapCount: 2,
    suggestionCount: 0,
    hasCascadingDependents: true,
    hasBlockingDependents: true,
  };
}

// ── Sınıflandırma kuralları ─────────────────────────────────────────────────

const RULE_SEEDS: { name: string; category: string; groups: string[][] }[] = [
  { name: 'Paspas adları', category: 'Paspas', groups: [['paspas'], ['havuzlu', 'halı']] },
  { name: 'Bagaj havuzu', category: 'Bagaj', groups: [['bagaj', 'havuz']] },
  { name: 'Direksiyon / koltuk kılıfı', category: 'İç Aksesuar', groups: [['direksiyon', 'kılıf'], ['koltuk', 'kılıf']] },
  { name: 'Silecek ve bakım', category: 'Bakım', groups: [['silecek'], ['parlatıcı'], ['oto', 'kokusu']] },
  { name: 'Far ve ampul', category: 'Aydınlatma', groups: [['led', 'ampul'], ['far']] },
  { name: 'Telefon tutucu / kamera', category: 'Elektronik', groups: [['telefon', 'tutucu'], ['geri', 'görüş', 'kamera']] },
  { name: 'Tavan barı ve çamurluk', category: 'Dış Aksesuar', groups: [['tavan', 'barı'], ['çamurluk']] },
];

const rules: CategoryRule[] = RULE_SEEDS.map((seed, index) => {
  const category = DEMO_CATEGORIES.find((item) => item.name === seed.category) ?? DEMO_CATEGORIES[0];
  return {
    id: index + 1,
    ruleName: seed.name,
    targetCategoryId: category.id,
    targetCategoryName: category.name,
    keywordGroups: seed.groups,
    sortOrder: (index + 1) * 10,
    isActive: index !== RULE_SEEDS.length - 1,
    createdAt: ago(RULE_AGE_DAYS - index * 9),
    updatedAt: index % 2 === 0 ? ago(RULE_AGE_DAYS / 6) : null,
  };
});

// ── Ham kategori eşleştirme (category-system) ───────────────────────────────

const rawCategories: RawSourceCategory[] = DEMO_DATA_SOURCES.flatMap((source) =>
  DEMO_CATEGORIES.map((category) => ({
    sourceId: source.id,
    sourceCode: `${source.erp.toLowerCase()}-${source.store.code}`,
    name: source.erp === 'Base' ? category.nameEn : category.name,
    path: source.erp === 'Base' ? `Auto > ${category.nameEn}` : `Oto Aksesuar > ${category.name}`,
    productCount: productsIn(category.id).filter((product) => product.sources.some((item) => item.id === source.id)).length,
  })),
).filter((row) => row.productCount > 0);

const coverage: SourceCoverage = {
  sources: DEMO_DATA_SOURCES.map((source) => ({
    id: source.id,
    code: `${source.erp.toLowerCase()}-${source.store.code}`,
    connector: source.erp,
    hasData: true,
    products: CATALOG_PRODUCTS.filter((product) => product.sources.some((item) => item.id === source.id)).length,
    categories: rawCategories.filter((row) => row.sourceId === source.id).length,
  })),
  withData: DEMO_DATA_SOURCES.length,
  total: DEMO_DATA_SOURCES.length,
  canMatch: true,
};

const derivation: CategoryDerivationResult = {
  categories: DEMO_CATEGORIES.map((category) => ({
    name: category.name,
    nameEn: category.nameEn,
    skuCount: productsIn(category.id).length,
    members: rawCategories
      .filter((row) => row.name === category.name || row.name === category.nameEn)
      .map((row) => ({
        sourceId: row.sourceId,
        sourceCode: row.sourceCode,
        externalKey: `${row.sourceCode}:${row.name}`,
        externalName: row.name,
        productCount: row.productCount,
      })),
  })),
  rawBucketCount: rawCategories.length,
  multiSourceCount: DEMO_CATEGORIES.length,
};

const conflicts: CategoryConflict[] = CATALOG_PRODUCTS.filter((product) => product.productId % 37 === 0).map((product) => ({
  productId: product.productId,
  sku: product.sku,
  productName: product.name,
  sourceCode: `${product.sources[0].erp.toLowerCase()}-${product.sources[0].store.code}`,
  externalCategoryName: 'Aksesuar',
  ruleCategory: product.categoryName,
  sourceLinkCategory: DEMO_CATEGORIES[product.categoryId % DEMO_CATEGORIES.length].name,
}));

const suggestions: CategorySuggestion[] = [
  { id: 1, kind: 'NewCategory', internalCategoryId: null, categoryName: null, proposedName: 'Sunroof Aksesuarları', externalName: 'Sunroof Parts', productCount: 9, reason: 'Ham kategoride 9 ürün var, eşleşen ana kategori yok.', createdAt: ago(3) },
  { id: 2, kind: 'Deactivate', internalCategoryId: 3, categoryName: 'İç Aksesuar', proposedName: null, externalName: null, productCount: 0, reason: 'Son 90 günde satılan ürün yok.', createdAt: ago(5) },
  { id: 3, kind: 'Split', internalCategoryId: 4, categoryName: 'Bakım', proposedName: 'Parlatıcı ve Cilalar', externalName: null, productCount: 14, reason: 'Kategori çok geniş; alt grup önerilir.', createdAt: ago(6) },
];

// ── Uyuşmazlık paneli ───────────────────────────────────────────────────────

const mismatchItems: CategoryMismatchItem[] = DEMO_CATEGORIES.slice(0, 3).map((category, index) => ({
  id: index + 1,
  platformId: index + 1,
  platformName: ['Trendyol', 'Hepsiburada', 'Amazon'][index],
  erpRawCategoryId: 4000 + index,
  erpCategoryName: `${category.name} (eski)`,
  internalCategoryId: category.id,
  internalCategoryName: category.name,
  accountCode: DEMO_DATA_SOURCES[index % DEMO_DATA_SOURCES.length].store.code,
  storeDisplayName: DEMO_DATA_SOURCES[index % DEMO_DATA_SOURCES.length].displayName,
  affectedProductCount: productsIn(category.id).length,
  checkedAtUtc: ago(0, 6),
}));

const mismatchList: CategoryMismatchListResponse = { items: mismatchItems, lastCheckedAtUtc: ago(0, 6) };

function affectedProducts(id: number, limit: number): CategoryMismatchProduct[] {
  const item = mismatchItems.find((entry) => entry.id === id);
  if (!item) return [];
  return productsIn(item.internalCategoryId)
    .slice(0, Math.min(limit, AFFECTED_PRODUCT_SAMPLE))
    .map((product) => ({ id: product.productId, name: product.name, supplierSKU: product.sku }));
}

// ── Taksonomi / şablonlar ───────────────────────────────────────────────────

const SQ_NAMES: Record<string, string> = {
  Paspas: 'Tapet',
  Bagaj: 'Bagazhi',
  'İç Aksesuar': 'Brendshme',
  Bakım: 'Kujdes',
  Aydınlatma: 'Ndriçim',
  Elektronik: 'Elektronike',
  'Dış Aksesuar': 'Jashtme',
};

const canonicalCategories: CanonicalCategoryDto[] = DEMO_CATEGORIES.map((category, index) => ({
  id: category.id,
  code: category.nameEn.toLowerCase().replace(/\s+/g, '-'),
  isActive: true,
  terms: [
    { id: index * 3 + 1, language: 'tr', term: category.name, isPrimary: true, source: 'Seed' },
    { id: index * 3 + 2, language: 'sq', term: SQ_NAMES[category.name] ?? category.name, isPrimary: true, source: 'Seed' },
    { id: index * 3 + 3, language: 'en', term: category.nameEn, isPrimary: true, source: 'Seed' },
  ],
  links: [{ id: category.id, sourceType: 'InternalCategory', sourceLabel: category.name, siteName: null }],
}));

const unmapped: UnmappedCategoryDto[] = [
  { sourceType: 'SiteCategory', sourceKey: 'site:aksesuar-diger', label: 'Diğer Aksesuarlar', internalCategoryId: null, siteSourceId: 1, siteName: 'Demo Web Sitesi', productCount: 8, suggestedCanonicalCategoryId: 3 },
  { sourceType: 'SiteCategory', sourceKey: 'site:temizlik', label: 'Temizlik Ürünleri', internalCategoryId: null, siteSourceId: 1, siteName: 'Demo Web Sitesi', productCount: 5, suggestedCanonicalCategoryId: 4 },
];

const taxonomy: CategoryTaxonomyDto = { categories: canonicalCategories, unmapped };

const templates: CategoryTemplateSummary[] = [
  { key: 'auto-accessories', displayNameTr: 'Oto Aksesuar', displayNameEn: 'Auto Accessories', version: 3 },
  { key: 'auto-spare-parts', displayNameTr: 'Yedek Parça', displayNameEn: 'Spare Parts', version: 2 },
  { key: 'tyres-wheels', displayNameTr: 'Lastik ve Jant', displayNameEn: 'Tyres & Wheels', version: 1 },
];

const completedBackfill: CategoryBackfillJobStatus = {
  state: 'Completed',
  result: {
    dryRun: true,
    sources: DEMO_DATA_SOURCES.map((source) => ({
      sourceCode: `${source.erp.toLowerCase()}-${source.store.code}`,
      fetchedProducts: 40,
      withCategory: 38,
      matched: 36,
      written: 0,
      updated: 0,
      error: null,
    })),
    totalWritten: 0,
    totalUpdated: 0,
    failedSources: 0,
  },
};

const completedRefresh: CategorySuggestionRefreshJobStatus = {
  state: 'Completed',
  result: { newCategorySuggestions: 1, deactivateSuggestions: 1, splitSuggestions: 1, staleSuggestionsClosed: 0 },
};

const toMaster = (category: CategoryAdmin): Category => ({ id: category.id, name: category.name });

export const productCategoryRoutes: DemoRoute[] = [
  get('/category/master', () => categoriesAdmin.map(toMaster)),
  get('/category/uncategorized-count', () => ({ uncategorizedCount: UNCATEGORIZED_COUNT })),
  get('/category/:id/usage', (request) => {
    const usage = categoryUsage(Number(request.params.id));
    return usage ?? new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'Kategori bulunamadı' });
  }),
  get('/category', () => categoriesAdmin),
  get('/category-rules', () => rules),
  get('/category-system/raw', () => rawCategories),
  get('/category-system/coverage', () => coverage),
  get('/category-system/derive', () => derivation),
  get('/category-system/conflicts', () => conflicts),
  get('/category-system/suggestions', () => suggestions),
  get('/category-system/backfill/status/:jobId', () => completedBackfill),
  get('/category-system/suggestions/refresh/status/:jobId', () => completedRefresh),
  get('/category-mismatch/dead', () => ({ items: [], lastCheckedAtUtc: mismatchList.lastCheckedAtUtc })),
  get('/category-mismatch/:id/products', (request) =>
    affectedProducts(Number(request.params.id), Number(request.query.get('limit') ?? AFFECTED_PRODUCT_SAMPLE)),
  ),
  get('/category-mismatch', () => mismatchList),
  get('/category-taxonomy', () => taxonomy),
  get('/system/category-templates', () => templates),
];
