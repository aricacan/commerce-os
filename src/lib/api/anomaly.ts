import { request } from './core';

// ─── Anomaly Detection ───────────────────────────────────────────────────────
export const anomalyApi = {
  overview: () => request<import('../../types/api').AnomalyOverview>('/anomaly/overview'),
  analysis: (groupBy: string = 'category', days: number = 60) => {
    const q = new URLSearchParams();
    q.set('groupBy', groupBy);
    q.set('days', String(days));
    return request<import('../../types/api').AnomalyAnalysis>(`/anomaly/analysis?${q}`);
  },
  trigger: () => request<{ jobId: string; message: string }>('/anomaly/trigger', { method: 'POST' }),
};

// ─── Fiyat/Stok Tutarlılık (Faz 3 — ExternalListing vs Product karşılaştırması) ──────────
export const priceStockConsistencyApi = {
  overview: () => request<import('../../types/api').PriceStockConsistencyOverview>('/pricestockconsistency/overview'),

  // "Stok Düzeltme İşlemi" — panelde görülen bir stok sapmasını operatörün tek tıkla
  // düzeltebilmesi için. Backend güncel karşılaştırma satırını döner (bkz.
  // PriceStockConsistencyController.UpdateStock) — sayfa tam refetch yapmadan satırı yerinde günceller.
  updateStock: (productId: number, stockQuantity: number) =>
    request<import('../../types/api').PriceStockConsistencyRow>(
      `/pricestockconsistency/products/${productId}/stock`,
      { method: 'PATCH', body: JSON.stringify({ stockQuantity }) },
    ),
};
