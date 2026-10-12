import { request } from './core';

export type StockHealthClass =
  | 'OutOfStock'
  | 'Dead'
  | 'Critical'
  | 'Low'
  | 'Overstock'
  | 'Healthy';

export interface StockHealthRow {
  productId: number;
  productName: string;
  sku: string;
  stockQuantity: number;
  minStockThreshold: number | null;
  soldQuantity: number;
  dailyVelocity: number;
  /** Kaç günlük stok kaldığı. Satış yoksa null — "hesaplanamaz". */
  coverageDays: number | null;
  healthClass: StockHealthClass;
}

export interface StockHealthReport {
  windowDays: number;
  /** Sınıf → adet. Tablo kırpılsa da bu sayımlar TÜM katalogu kapsar. */
  classCounts: Record<string, number>;
  rows: StockHealthRow[];
}

export interface ProductSalesReturnRow {
  productId: number;
  productName: string;
  sku: string;
  soldQuantity: number;
  returnedQuantity: number;
  /** Satış sıfırsa null. */
  returnRatePercent: number | null;
}

export interface OperationsSummary {
  orderCount: number;
  cancelledCount: number;
  returnedCount: number;
  revenue: number;
  /** İptal ve iade HARİÇ ortalama. Geçerli sipariş yoksa null. */
  averageBasket: number | null;
  cancellationRatePercent: number | null;
  returnRatePercent: number | null;
}

// ─── Raporlar (FAZ 9) ─────────────────────────────────────────────────────────
export const reportsApi = {
  stockHealth: (days?: number, limit?: number) => {
    const query = new URLSearchParams();
    if (days !== undefined) query.set('days', String(days));
    if (limit !== undefined) query.set('limit', String(limit));
    const qs = query.toString();
    return request<StockHealthReport>(`/reports/stock-health${qs ? `?${qs}` : ''}`);
  },

  productSalesReturns: (from?: string, to?: string) => {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    const qs = query.toString();
    return request<ProductSalesReturnRow[]>(`/reports/product-sales-returns${qs ? `?${qs}` : ''}`);
  },

  operationsSummary: (from?: string, to?: string) => {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    const qs = query.toString();
    return request<OperationsSummary>(`/reports/operations-summary${qs ? `?${qs}` : ''}`);
  },
};
