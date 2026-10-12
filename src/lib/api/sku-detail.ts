import { request, storeOverrideHeaders } from './core';
import type { ProductSkuDetail } from '../../types/sku-detail';

export const skuDetailApi = {
  get: (sku: string, storeCode?: string) =>
    request<ProductSkuDetail>(
      `/product/sku/${encodeURIComponent(sku)}`,
      { headers: storeOverrideHeaders(storeCode) }
    ),
};
