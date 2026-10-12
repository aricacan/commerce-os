import { request, BASE, uploadHeaders, throwIfNotOk } from './core';

// ─── ERP Excel İçe Aktarma ─────────────────────────────────────────────────────
// Hedef ERP kaynağı her istekte AÇIKÇA taşınır (sourceId) — bu panel Topbar'ın ambient
// mağaza seçicisini kullanmaz, kendi seçimi vardır.

export interface ErpImportColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
  required: boolean;
}

export interface ErpImportOrderRow {
  rowNumber: number;
  orderNumber: string;
  orderDate: string | null;
  status: string | null;
  platformName: string | null;
  storeCode: string | null;
  total: number | null;
  shippingTotal: number | null;
  currency: string | null;
  paymentStatus: string | null;
  customerName: string | null;
  customerIdentifier: string | null;
  city: string | null;
  district: string | null;
  addressLine: string | null;
  orderCode: string | null;
  packageCode: string | null;
  sku: string;
  quantity: number;
  unitPrice: number | null;
  orderLineId: number | null;
  platformProductId: string | null;
  error: string | null;
}

export type ErpImportAction = 'create' | 'update' | 'skip';

export interface ErpImportOrderPreviewItem {
  orderNumber: string;
  action: ErpImportAction;
  lineCount: number;
  validLineCount: number;
  total: number;
  orderDate: string | null;
  platformName: string | null;
  platformResolved: boolean;
  unknownSkus: string[];
  errors: string[];
  resolvedStoreName: string;
}

export interface ErpImportOrderPreview {
  fileName: string;
  sourceId: number;
  columns: ErpImportColumn[];
  rows: ErpImportOrderRow[];
  orders: ErpImportOrderPreviewItem[];
  createCount: number;
  updateCount: number;
  skipCount: number;
  warnings: string[];
  unmatchedHeaders: string[];
}

export interface ErpImportBatch {
  id: number;
  entityType: string;
  fileName: string;
  storeName: string;
  sourceName: string | null;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  uploadedAt: string;
  uploadedBy: string | null;
  undoneAt: string | null;
  undoneBy: string | null;
}

export const erpImportApi = {
  orderColumns: () => request<ErpImportColumn[]>('/erp-import/orders/columns'),

  // Ayrıştırır ama kaydetmez — kullanıcı önizleyip commit ile onaylar.
  parseOrders: async (sourceId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/erp-import/orders/parse?sourceId=${sourceId}`, {
      method: 'POST', headers: uploadHeaders(), body: formData,
    });
    await throwIfNotOk(res);
    return res.json() as Promise<ErpImportOrderPreview>;
  },

  commitOrders: (body: { fileName: string; sourceId: number; rows: ErpImportOrderRow[] }) =>
    request<ErpImportBatch>('/erp-import/orders/commit', { method: 'POST', body: JSON.stringify(body) }),

  batches: () => request<ErpImportBatch[]>('/erp-import/batches'),

  undo: (batchId: number) =>
    request<ErpImportBatch>(`/erp-import/batches/${batchId}/undo`, { method: 'POST' }),
};
