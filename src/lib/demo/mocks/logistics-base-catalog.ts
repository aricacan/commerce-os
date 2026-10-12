// Base Katalog: marka/model/yıl ağacı, ürün listesi ve kategori kapsam matrisi (kurgusal araç markaları).
import type {
  BaseCatalogMake, BaseCatalogProduct, BaseCoverage, BaseCoverageCategory,
} from '../../api/base-catalog';
import { createRng, matchesSearch, paginate } from '../seed';
import { DEMO_PRODUCTS } from '../data/core';
import { get, type DemoRoute } from '../router';

const rng = createRng(8805);
const UNSPECIFIED_YEAR = 'Yıl belirtilmemiş';
const GBP_PER_TRY = 0.021;
const PRODUCTS_PER_VARIANT: [number, number] = [2, 5];

const FLEET: Record<string, Record<string, string[]>> = {
  Aurora: { Zephyr: ['2016-2019', '2020-2024'], Comet: ['2014-2018', '2019-2023'], Nova: ['2021-2025'] },
  Veloce: { Strada: ['2015-2019', '2020-2024'], Rapido: ['2018-2022', UNSPECIFIED_YEAR] },
  Nordik: { Fjord: ['2017-2021', '2022-2025'], Aksel: ['2013-2017'], Vega: ['2019-2024'] },
  Kestrel: { Falco: ['2016-2020', '2021-2025'], Merlin: ['2018-2023'] },
};

const CATEGORIES: BaseCoverageCategory[] = [
  { id: 1, name: 'Paspas', nameEn: 'Floor Mats' },
  { id: 2, name: 'Bagaj', nameEn: 'Boot Liners' },
  { id: 3, name: 'İç Aksesuar', nameEn: 'Interior' },
  { id: 4, name: 'Dış Aksesuar', nameEn: 'Exterior' },
  { id: 5, name: 'Aydınlatma', nameEn: 'Lighting' },
];
const CATEGORY_BY_NAME = new Map(CATEGORIES.map((category) => [category.name, category]));

function buildProducts(): BaseCatalogProduct[] {
  const products: BaseCatalogProduct[] = [];
  Object.entries(FLEET).forEach(([make, models]) => {
    Object.entries(models).forEach(([model, years]) => {
      years.forEach((year) => {
        const count = rng.int(PRODUCTS_PER_VARIANT[0], PRODUCTS_PER_VARIANT[1]);
        for (let index = 0; index < count; index += 1) {
          const source = rng.pick(DEMO_PRODUCTS);
          const category = CATEGORY_BY_NAME.get(source.category) ?? CATEGORIES[2];
          products.push({
            sku: `${source.sku}-${products.length + 1}`,
            name: `${source.name} (${make} ${model})`,
            imageUrl: null, brand: source.brand, model, modelYear: year === UNSPECIFIED_YEAR ? null : year,
            categoryId: category.id, categoryName: category.name,
            price: Number((source.price * GBP_PER_TRY).toFixed(2)), currency: 'GBP',
            stock: rng.int(0, 90), isActive: rng.chance(0.92), stores: ['Store C (UK)'],
          });
        }
      });
    });
  });
  return products;
}

const PRODUCTS = buildProducts();
const productsOf = (make: string, model: string) =>
  PRODUCTS.filter((item) => item.name.endsWith(`(${make} ${model})`));

function buildTree(): BaseCatalogMake[] {
  return Object.entries(FLEET).map(([make, models]) => {
    const modelNodes = Object.entries(models).map(([model, years]) => ({
      model,
      isBucket: false,
      productCount: productsOf(make, model).length,
      years: years.map((label) => ({
        label,
        isBucket: label === UNSPECIFIED_YEAR,
        productCount: productsOf(make, model).filter((item) => (item.modelYear ?? UNSPECIFIED_YEAR) === label).length,
      })),
    }));
    return {
      make, isBucket: false, modelCount: modelNodes.length,
      productCount: modelNodes.reduce((total, node) => total + node.productCount, 0),
      models: modelNodes,
    };
  });
}

function productsPage(query: URLSearchParams) {
  const make = query.get('make');
  const model = query.get('model');
  const year = query.get('year');
  const categoryId = query.get('categoryId');
  const items = PRODUCTS
    .filter((item) => !make || item.name.includes(`(${make} `))
    .filter((item) => !model || item.name.endsWith(`${model})`))
    .filter((item) => !year || (item.modelYear ?? UNSPECIFIED_YEAR) === year)
    .filter((item) => !categoryId || item.categoryId === Number(categoryId))
    .filter((item) => matchesSearch(item, query.get('search'), ['sku', 'name']));
  return paginate(items, query);
}

function coverage(make: string | null): BaseCoverage {
  const rows = Object.entries(FLEET)
    .filter(([name]) => !make || name === make)
    .flatMap(([name, models]) => Object.keys(models).map((model) => {
      const items = productsOf(name, model);
      const counts: Record<string, number> = {};
      items.forEach((item) => {
        const key = String(item.categoryId);
        counts[key] = (counts[key] ?? 0) + 1;
      });
      return { make: name, model, productCount: items.length, counts };
    }));
  return { categories: CATEGORIES, rows };
}

export const logisticsBaseCatalogRoutes: DemoRoute[] = [
  get('/base-catalog/tree', () => buildTree()),
  get('/base-catalog/products', (req) => productsPage(req.query)),
  get('/base-catalog/coverage', (req) => coverage(req.query.get('make'))),
];
