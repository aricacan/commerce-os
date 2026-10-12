import { request } from './core';

// İadeler / talepler. Kaynak: Sentos "claims" ucu, 3 saatte bir (Hangfire: sentos-claim-sync).
//
// ⚠️ Base/BaseLinker iadeleri artık akışa giriyor (BaseErpConnector.GetClaimsAsync) ama alan
// eşlemesi canlı yanıtla DOĞRULANMADI. Tablo bugün boş; "iade yok" ile "uç çalışmıyor" aynı
// görünür. Panel bunu yazmak zorunda.

export interface ClaimRow {
  id: number;
  platformOrderNumber: string;
  sku: string;
  reason: string;
  status: string;
  claimDate: string;
  refundAmount: number | null;
  currency: string;
  syncedAt: string;
  storeName: string;
}

export interface ClaimsReport {
  totalCount: number;
  items: ClaimRow[];
  byReason: { reason: string; count: number; refund: number }[];
  byStatus: { status: string; count: number }[];
  totalRefund: number;
  /** Tablodaki en son senkron damgası — filtreden bağımsız. */
  lastSyncedAt: string | null;
  /** true = tabloda HİÇ satır yok: senkron ya hiç çalışmadı ya da uç kullanılamıyor. */
  neverSynced: boolean;
}

export interface ClaimsQuery {
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
}

export const claimsApi = {
  list: (query: ClaimsQuery = {}) => {
    const params = new URLSearchParams();
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.search) params.set('search', query.search);
    params.set('limit', String(query.limit ?? 200));
    return request<ClaimsReport>(`/claims?${params.toString()}`);
  },
};
