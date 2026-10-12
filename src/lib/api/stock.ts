import { request } from './core';

export interface StockRiskRow {
  productId: number;
  supplierSku: string;
  name: string;
  erpStock: number;
  committed: number;
  available: number;
  unshippedLineCount: number;
  minStockThreshold: number | null;
  atRisk: boolean;
  negative: boolean;
  belowThreshold: boolean;
}

export type StockFlag = 'atRisk' | 'negative' | 'belowThreshold';

// ─── Stok riski ───────────────────────────────────────────────────────────────
// Sayılar ERP aynasından gelir. `available` bilgi amaçlıdır; ERP stoğunun YERİNE
// geçmez (bkz. FAZ 3 spec §3) — ekranda yan yana gösterilir.
export const stockApi = {
  availability: (flag?: StockFlag | null, search?: string) => {
    const params = new URLSearchParams();
    if (flag) params.set('flag', flag);
    if (search) params.set('search', search);
    const query = params.toString();
    return request<StockRiskRow[]>(`/stock/availability${query ? `?${query}` : ''}`);
  },
  setThreshold: (productId: number, minStockThreshold: number | null) =>
    request<void>(`/stock/products/${productId}/threshold`, {
      method: 'PUT',
      body: JSON.stringify({ minStockThreshold }),
    }),
};
