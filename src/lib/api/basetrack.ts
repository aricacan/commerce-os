import { request, BASE, uploadHeaders, throwIfNotOk } from './core';

// ── DEMO BaseTrack — DEMO UK depo → sevkiyat → UK depo takibi ─────────────────────

export interface BaseTrackBatch {
  id: number;
  supplierStockCode: string;
  sku: string | null;
  productId: number | null;
  productName: string;
  orderDate: string;
  orderedQty: number;
  unitPrice: number;
  currency: string;
  firstShipmentDate: string | null;
  deliveryNoteNo: string | null;
  qtyTrDepot: number;
  qtyInTransit: number;
  qtyUkDepot: number;
  updatedAt: string;
  roomLabel: string | null;
}

export interface BaseTrackSettings {
  transitDays: number;
  redRiskPct: number;
  orangeRiskPct: number;
  yellowRiskPct: number;
  depotLabel: string;
}

export interface BaseTrackEvent {
  id: number;
  fromState: string | null;
  toState: string;
  quantity: number;
  source: string;
  failed: boolean;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

// Kutu ↔ Sipariş eşleşmesi: bu batch'in (fiziksel kutunun) ürününü içeren siparişler.
export interface BaseTrackLinkedOrder {
  orderId: number;
  platformOrderNumber: string;
  orderDate: string;
  universalStatus: string;
  customerName: string | null;
  platformName: string | null;
  storeName: string | null;
  quantity: number;
}

export interface BaseTrackSummary {
  trDepotQty: number;
  inTransitQty: number;
  ukDepotQty: number;
  openBatchCount: number;
  unmatchedBatchCount: number;
}

export interface BaseTrackImportResult {
  totalRows: number;
  created: number;
  updated: number;
  unchanged: number;
  unmatched: number;
  skipped: number;
  warnings: string[];
}

export interface BaseTrackDepotItem {
  id: number;
  sku: string;
  productId: number | null;
  productName: string;
  quantity: number;
  updatedAt: string;
}

export interface BaseTrackDepotMovement {
  id: number;
  delta: number;
  source: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

async function baseTrackUpload(path: string, file: File): Promise<BaseTrackImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: uploadHeaders(), body: formData });
  await throwIfNotOk(res);
  return res.json();
}

export interface BaseTrackStockWarning {
  productId: number;
  sku: string;
  productName: string;
  ukStock: number;
  inTransitQty: number;
  depotQty: number;
  pendingShipQty: number;
  potentialStock: number;
  dailyDemand: number;
  daysRemaining: number | null;
  stockoutRisk: number | null;
  turnover30: number | null;
  turnover60: number | null;
  turnover90: number | null;
  avgOrderSize: number;
  sold30: number;
  sold60: number;
  sold90: number;
  lowVolume: boolean;
  level: 'Red' | 'Orange' | 'Yellow' | 'Green' | 'NoData';
  depotShortage: number;
  doubleOrderRisk: boolean;
  safetyNote: string | null;
  recommendedOrderQty: number;
}

export interface BaseTrackStockWarningSummary {
  redCount: number;
  orangeCount: number;
  yellowCount: number;
  greenCount: number;
  noDataCount: number;
  depotShortageCount: number;
  doubleOrderCount: number;
  transitDays: number;
  depotLabel: string;
}

// Rapor sütunları backend'deki şablon tanımından gelir — frontend sütun adı bilmez,
// yeni şablon eklendiğinde tablo kendiliğinden doğru başlıklarla çizilir.
export type BaseTrackReportColumnType = 'text' | 'number';

export interface BaseTrackReportColumn {
  key: string;
  label: string;
  type: BaseTrackReportColumnType;
}

export interface BaseTrackReportTemplate {
  key: string;
  name: string;
  description: string;
  columns: BaseTrackReportColumn[];
}

export type BaseTrackReportRow = Record<string, string | number | null>;

export interface BaseTrackReport {
  templateKey: string;
  name: string;
  columns: BaseTrackReportColumn[];
  rows: BaseTrackReportRow[];
  rowCount: number;
  generatedAt: string | null;
  generatedBy: string | null;
}

// Birleşik görünümde satırın nereden geldiği ve hangi sütunların çakıştığı, şablon
// sütunlarıyla karışmasın diye "__" önekli meta alanlarda taşınır.
export type BaseTrackReportRowSource = 'calculated' | 'uploaded' | 'match' | 'conflict';

export interface BaseTrackReportUploadPreview {
  templateKey: string;
  fileName: string;
  columns: BaseTrackReportColumn[];
  rows: BaseTrackReportRow[];
  rowCount: number;
  warnings: string[];
}

export interface BaseTrackReportUpload {
  templateKey: string;
  name: string;
  fileName: string | null;
  columns: BaseTrackReportColumn[];
  rows: BaseTrackReportRow[];
  rowCount: number;
  uploadedAt: string | null;
  uploadedBy: string | null;
}

export interface BaseTrackReportMerged {
  templateKey: string;
  name: string;
  columns: BaseTrackReportColumn[];
  rows: (BaseTrackReportRow & { __source: BaseTrackReportRowSource; __conflictColumns: string[] })[];
  calculatedOnlyCount: number;
  uploadedOnlyCount: number;
  matchCount: number;
  conflictCount: number;
  generatedAt: string | null;
  uploadedAt: string | null;
}

export const baseTrackApi = {
  summary: () => request<BaseTrackSummary>('/basetrack/summary'),

  settings: () => request<BaseTrackSettings>('/basetrack/settings'),
  updateSettings: (body: BaseTrackSettings) =>
    request<BaseTrackSettings>('/basetrack/settings', { method: 'PUT', body: JSON.stringify(body) }),

  stockWarnings: (params: { search?: string; level?: string }) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.level) q.set('level', params.level);
    return request<{ summary: BaseTrackStockWarningSummary; items: BaseTrackStockWarning[] }>(
      `/basetrack/stock-warnings?${q}`,
    );
  },

  batches: (params: { search?: string; state?: string; unmatchedOnly?: boolean; includeCompleted?: boolean }) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.state) q.set('state', params.state);
    if (params.unmatchedOnly) q.set('unmatchedOnly', 'true');
    if (params.includeCompleted) q.set('includeCompleted', 'true');
    return request<BaseTrackBatch[]>(`/basetrack/batches?${q}`);
  },

  events: (batchId: number) => request<BaseTrackEvent[]>(`/basetrack/batches/${batchId}/events`),

  linkedOrders: (batchId: number) => request<BaseTrackLinkedOrder[]>(`/basetrack/batches/${batchId}/orders`),

  renameRoom: (date: string, label: string) =>
    request<void>('/basetrack/rooms/label', { method: 'PUT', body: JSON.stringify({ date, label }) }),

  deleteRoom: (date: string) =>
    request<void>(`/basetrack/rooms?date=${encodeURIComponent(date)}`, { method: 'DELETE' }),

  transition: (batchId: number, body: { fromState: string; toState: string; quantity: number; note?: string }) =>
    request<BaseTrackBatch>(`/basetrack/batches/${batchId}/transition`, {
      method: 'POST', body: JSON.stringify(body),
    }),

  arrive: (batchId: number, quantity?: number) =>
    request<BaseTrackBatch>(`/basetrack/batches/${batchId}/arrive`, {
      method: 'POST', body: JSON.stringify({ quantity: quantity ?? null }),
    }),

  importOrders: (file: File) => baseTrackUpload('/basetrack/imports/orders', file),
  importDispatch: (file: File) => baseTrackUpload('/basetrack/imports/dispatch', file),

  reports: {
    templates: () => request<BaseTrackReportTemplate[]>('/basetrack/reports/templates'),
    get: (key: string) => request<BaseTrackReport>(`/basetrack/reports/${encodeURIComponent(key)}`),
    refresh: (key: string) =>
      request<BaseTrackReport>(`/basetrack/reports/${encodeURIComponent(key)}/refresh`, { method: 'POST' }),

    merged: (key: string) =>
      request<BaseTrackReportMerged>(`/basetrack/reports/${encodeURIComponent(key)}/merged`),

    upload: {
      get: (key: string) =>
        request<BaseTrackReportUpload>(`/basetrack/reports/${encodeURIComponent(key)}/upload`),

      // Ayrıştırır ama kaydetmez — kullanıcı önizleyip commit ile onaylar.
      parse: async (key: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${BASE}/basetrack/reports/${encodeURIComponent(key)}/upload/parse`, {
          method: 'POST', headers: uploadHeaders(), body: formData,
        });
        await throwIfNotOk(res);
        return res.json() as Promise<BaseTrackReportUploadPreview>;
      },

      commit: (key: string, body: { fileName: string; rows: BaseTrackReportRow[] }) =>
        request<BaseTrackReportUpload>(`/basetrack/reports/${encodeURIComponent(key)}/upload/commit`, {
          method: 'POST', body: JSON.stringify(body),
        }),

      remove: (key: string) =>
        request<void>(`/basetrack/reports/${encodeURIComponent(key)}/upload`, { method: 'DELETE' }),
    },
  },

  depot: {
    list: (search?: string) => {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      return request<BaseTrackDepotItem[]>(`/basetrack/trdepot${q}`);
    },
    movements: (itemId: number) =>
      request<BaseTrackDepotMovement[]>(`/basetrack/trdepot/${itemId}/movements`),
    addMovement: (body: { sku: string; productName?: string; delta: number; note?: string }) =>
      request<BaseTrackDepotItem>('/basetrack/trdepot', { method: 'POST', body: JSON.stringify(body) }),
    remove: (itemId: number) =>
      request<void>(`/basetrack/trdepot/${itemId}`, { method: 'DELETE' }),
    importExcel: (file: File) => baseTrackUpload('/basetrack/trdepot/import', file),
  },
};
