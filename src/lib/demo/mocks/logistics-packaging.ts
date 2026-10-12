// Koli kataloğu ve ürün-koli sorgusu (/boxes sayfası).
import type { ProductLookupResult } from '../../api/packaging';
import { DEMO_BOXES, boxIndexOf } from '../data/logistics-packaging';
import { DEMO_PRODUCTS } from '../data/core';
import { matchesSearch } from '../seed';
import { DemoHttpResponse, get, type DemoRoute } from '../router';

const NOT_FOUND = 404;

function lookupBySku(sku: string): ProductLookupResult | DemoHttpResponse {
  const product = DEMO_PRODUCTS.find((item) => item.sku.toLowerCase() === sku.toLowerCase());
  if (!product) return new DemoHttpResponse(NOT_FOUND, { title: 'not found' });
  const index = boxIndexOf(product);
  const box = index === null ? null : DEMO_BOXES[index];
  return {
    supplierSKU: product.sku,
    name: product.name,
    hasBox: box !== null,
    boxCode: box?.boxCode ?? null,
    boxName: box?.name ?? null,
    width: box?.width ?? null,
    length: box?.length ?? null,
    height: box?.height ?? null,
    desi: box?.desi ?? null,
    boxPrice: box?.price ?? null,
  };
}

export const logisticsPackagingRoutes: DemoRoute[] = [
  get('/packaging/boxes', (req) => DEMO_BOXES.filter((box) => matchesSearch(box, req.query.get('search'), ['boxCode', 'name']))),
  get('/packaging/lookup/:sku', (req) => lookupBySku(req.params.sku)),
  get('/packaging/unmatched-count', () => ({
    totalProducts: DEMO_PRODUCTS.length,
    unmatchedCount: DEMO_PRODUCTS.filter((product) => boxIndexOf(product) === null).length,
  })),
];
