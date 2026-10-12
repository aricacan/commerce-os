import { request } from './core';
import type { BackgroundJobStarted } from './background-jobs';

// ─── Kanal ücretleri (backend ChannelFeesController) ──────────────────────────
// Kanal = ERP kaynağı × pazaryeri × marka. Oranlar kesir (0.12 = %12), hizmet bedeli adet başı TL.

export interface ChannelFeeRow {
  dataSourceId: number;
  dataSourceName: string;
  country: string;
  platformId: number;
  platformName: string;
  storeId: number;
  storeName: string;
  orderCount: number;
  ordersWithReportedFees: number;
  baseCommissionRate: number;
  baseServiceFee: number;
  baseVatRate: number;
  hasOverride: boolean;
  commissionRate: number;
  serviceFee: number;
  vatRate: number;
  // Araştırılmış kesinti önerisi (katalogda yoksa null — AI'dan istenebilir).
  suggestion?: MarketplaceFeeSuggestion | null;
}

/** Önerilen kesinti: komisyon yüzde (12 = %12), hizmet bedeli kanalın para biriminde. */
export interface MarketplaceFeeSuggestion {
  commissionPercent: number;
  serviceFee: number;
  note: string;
  sourceName: string | null;
  sourceUrl: string | null;
  checkedOn: string;
  kind: 'Researched' | 'Ai';
}

export interface ChannelFeeSaveBody {
  platformId: number;
  storeId: number;
  dataSourceId: number;
  commissionRate: number;
  serviceFee: number;
  vatRate: number;
}

/** Bir ERP kaynağının kesinti yenileme sonucu (supported=false → ERP kesinti bilgisi vermiyor). */
export interface FeeRefreshResult {
  dataSourceId: number;
  sourceName: string;
  erp: string;
  supported: boolean;
  ordersFetched: number;
  ordersWithFees: number;
  ordersUpdated: number;
  message: string | null;
}

export const channelFeesApi = {
  // Arka plan işini başlatır; sonucu (FeeRefreshResult[]) BackgroundJobWatcher bekler.
  refresh: () => request<BackgroundJobStarted>('/channel-fees/refresh', { method: 'POST' }),
  list: () => request<ChannelFeeRow[]>('/channel-fees'),
  // Katalogda olmayan pazaryeri için yapay zekâ önerisi; bulunamazsa 404 (hata) döner.
  suggest: (platformName: string, country: string) =>
    request<MarketplaceFeeSuggestion>('/channel-fees/suggest', { method: 'POST', body: JSON.stringify({ platformName, country }) }),
  save: (body: ChannelFeeSaveBody) =>
    request<void>('/channel-fees', { method: 'PUT', body: JSON.stringify(body) }),
  reset: (row: Pick<ChannelFeeRow, 'platformId' | 'storeId' | 'dataSourceId'>) =>
    request<void>(
      `/channel-fees?platformId=${row.platformId}&storeId=${row.storeId}&dataSourceId=${row.dataSourceId}`,
      { method: 'DELETE' }),
};
