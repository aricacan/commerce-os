import { request } from './core';

export interface AgingRow {
  customerId: number;
  customerName: string;
  currency: string;
  paymentTermDays: number | null;
  notDue: number;
  days0To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
  totalOverdue: number;
  total: number;
}

export interface AgingTotals {
  currency: string;
  notDue: number;
  days0To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
  totalOverdue: number;
  total: number;
}

export interface AgingReport {
  asOf: string;
  rows: AgingRow[];
  totals: AgingTotals[];
}

export interface MarginBreakdownRow {
  key: string;
  revenue: number;
  commission: number;
  shipping: number;
  productCost: number;
  netProfit: number;
  /** null = ciro sıfır, marj hesaplanamaz. */
  marginPercent: number | null;
  itemCount: number;
  missingShippingItemCount: number;
}

export interface MarginBreakdown {
  dimension: string;
  rows: MarginBreakdownRow[];
  total: MarginBreakdownRow;
  /** true ise rapor kayıt sınırına çarptı — rakamlar EKSİK, ekran bunu göstermek zorunda. */
  truncated: boolean;
  itemLimit: number;
}

// ─── Finans raporları (FAZ 8) ─────────────────────────────────────────────────
// Yaşlandırma para birimi başına satır verir; TUTARLAR ÇEVRİLMEZ.
export const financeReportsApi = {
  aging: (asOf?: string) =>
    request<AgingReport>(`/finance/aging${asOf ? `?asOf=${asOf}` : ''}`),

  marginBreakdown: (params: {
    from?: string;
    to?: string;
    platformName?: string;
    dimension?: 'store' | 'platform';
  }) => {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.platformName) query.set('platformName', params.platformName);
    if (params.dimension) query.set('dimension', params.dimension);
    const qs = query.toString();
    return request<MarginBreakdown>(`/finance/margin-breakdown${qs ? `?${qs}` : ''}`);
  },
};
