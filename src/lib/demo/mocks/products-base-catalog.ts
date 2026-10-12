// Base Katalog: marka/model/yıl gezgini ve kategori kapsam matrisi (yalnız Base kaynaklı ürünler).
import type { PaginatedResult } from '../../../types/api';
import type {
  BaseCatalogMake,
  BaseCatalogModel,
  BaseCatalogProduct,
  BaseCatalogYear,
  BaseCoverage,
  BaseCoverageRow,
} from '../../api/base-catalog';
import {
  CATALOG_PRODUCTS,
  DEMO_CATEGORIES,
  placeholderImage,
  type CatalogProduct,
} from '../data/products-catalog';
import { get, type DemoRoute } from '../router';
import { matchesSearch, paginate } from '../seed';

const UNKNOWN_MAKE = 'Marka belirtilmemiş';
const UNKNOWN_MODEL = 'Model belirtilmemiş';
const UNKNOWN_YEAR = 'Yıl belirtilmemiş';
const GBP_TO_TRY = 42;
const CATALOG_PAGE_SIZE = 50;

const baseProducts = CATALOG_PRODUCTS.filter((product) => product.sources.some((source) => source.erp === 'Base'));

const makeOf = (product: CatalogProduct): string => product.make ?? UNKNOWN_MAKE;
const modelOf = (product: CatalogProduct): string => product.vehicleModel ?? UNKNOWN_MODEL;
const yearOf = (product: CatalogProduct): string => product.modelYear ?? UNKNOWN_YEAR;

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

function buildYears(products: CatalogProduct[]): BaseCatalogYear[] {
  return [...groupBy(products, yearOf)].map(([label, items]) => ({
    label,
    isBucket: label === UNKNOWN_YEAR,
    productCount: items.length,
  }));
}

function buildModels(products: CatalogProduct[]): BaseCatalogModel[] {
  return [...groupBy(products, modelOf)]
    .map(([model, items]) => ({ model, isBucket: model === UNKNOWN_MODEL, productCount: items.length, years: buildYears(items) }))
    .sort((a, b) => a.model.localeCompare(b.model, 'tr'));
}

function buildTree(): BaseCatalogMake[] {
  return [...groupBy(baseProducts, makeOf)]
    .map(([make, items]) => {
      const models = buildModels(items);
      return { make, isBucket: make === UNKNOWN_MAKE, productCount: items.length, modelCount: models.length, models };
    })
    .sort((a, b) => Number(a.isBucket) - Number(b.isBucket) || a.make.localeCompare(b.make, 'tr'));
}

function toBaseProduct(product: CatalogProduct): BaseCatalogProduct {
  return {
    sku: product.sku,
    name: product.name,
    imageUrl: placeholderImage(product.sku),
    brand: product.make,
    model: product.vehicleModel,
    modelYear: product.modelYear,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    price: Number((product.price / GBP_TO_TRY).toFixed(2)),
    currency: 'GBP',
    stock: product.stock,
    isActive: product.stock > 0,
    stores: product.sources.filter((source) => source.erp === 'Base').map((source) => source.store.name),
  };
}

function listProducts(query: URLSearchParams): PaginatedResult<BaseCatalogProduct> {
  const make = query.get('make');
  const model = query.get('model');
  const year = query.get('year');
  const categoryId = Number(query.get('categoryId') ?? 0);

  const filtered = baseProducts
    .filter((product) => !make || makeOf(product) === make)
    .filter((product) => !model || modelOf(product) === model)
    .filter((product) => !year || yearOf(product) === year)
    .filter((product) => !categoryId || product.categoryId === categoryId)
    .filter((product) => matchesSearch(product, query.get('search'), ['name', 'sku']));

  const page = paginate(filtered.map(toBaseProduct), query, CATALOG_PAGE_SIZE);
  return { items: page.items, totalCount: page.totalCount, page: page.page, pageSize: page.pageSize };
}

function buildCoverage(makeFilter: string | null): BaseCoverage {
  const scoped = baseProducts.filter((product) => !makeFilter || makeOf(product) === makeFilter);
  const rows: BaseCoverageRow[] = [...groupBy(scoped, (product) => `${makeOf(product)}||${modelOf(product)}`)].map(([key, items]) => {
    const [make, model] = key.split('||');
    const counts: Record<string, number> = {};
    for (const item of items) counts[String(item.categoryId)] = (counts[String(item.categoryId)] ?? 0) + 1;
    return { make, model, productCount: items.length, counts };
  });
  rows.sort((a, b) => a.make.localeCompare(b.make, 'tr') || a.model.localeCompare(b.model, 'tr'));
  return { categories: DEMO_CATEGORIES.map(({ id, name, nameEn }) => ({ id, name, nameEn })), rows };
}

export const productBaseCatalogRoutes: DemoRoute[] = [
  get('/base-catalog/tree', buildTree),
  get('/base-catalog/products', (request) => listProducts(request.query)),
  get('/base-catalog/coverage', (request) => buildCoverage(request.query.get('make'))),
];
