import { request } from './core';

export interface StockReconciliationRow {
  id: number;
  name: string;
  supplierSKU: string;
  storeId: number;
  erpStock: number;
  physicalStock: number;
  difference: number;
}

export interface StockReconciliationOverview {
  totalMismatches: number;
  rows: StockReconciliationRow[];
}

export const stockReconciliationApi = {
  overview: (storeId?: number) =>
    request<StockReconciliationOverview>(`/stock-reconciliation/overview${storeId ? `?storeId=${storeId}` : ''}`),
  acceptPhysical: (productId: number, physicalStock: number) =>
    request<void>(`/stock-reconciliation/products/${productId}/accept-physical`, {
      method: 'PATCH',
      body: JSON.stringify({ physicalStock }),
    }),
};
