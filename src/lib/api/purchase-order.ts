import { request, BASE, authHeader, getStoreHeaders, throwIfNotOk } from './core';

// ─── Satın Alma Siparişi (PO) ──────────────────────────────────────────────────

export type PurchaseOrderItemType = 'Product' | 'RawMaterial';
export type PurchaseOrderStatus = 'Draft' | 'Submitted' | 'PartiallyReceived' | 'Completed' | 'Cancelled';

export interface PurchaseOrderLine {
  id: number;
  itemType: PurchaseOrderItemType;
  productId: number | null;
  rawMaterialId: number | null;
  itemName: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  currency: string;
  notes: string | null;
}

export interface PurchaseOrder {
  id: number;
  supplierId: number;
  supplierName: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate: string | null;
  notes: string | null;
  lines: PurchaseOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderLineBody {
  itemType: PurchaseOrderItemType;
  productId?: number;
  rawMaterialId?: number;
  quantity: number;
  unitPrice: number;
  currency?: string;
  notes?: string;
}

export interface CreatePurchaseOrderBody {
  supplierId: number;
  orderDate: string;
  expectedDate?: string;
  notes?: string;
  lines: CreatePurchaseOrderLineBody[];
}

// ─── Excel'den Sipariş Kalemi İçe Aktarma (InvoiceLineExcelParser'ın satın alma karşılığı) ───

export interface ParsedPurchaseOrderLine {
  itemType: PurchaseOrderItemType;
  productId: number | null;
  rawMaterialId: number | null;
  itemLabel: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}

export interface PurchaseOrderLineExcelWarning {
  rowNumber: number;
  message: string;
}

export interface PurchaseOrderLineExcelParseResult {
  lines: ParsedPurchaseOrderLine[];
  warnings: PurchaseOrderLineExcelWarning[];
  headerRowNumber: number;
  columnMapping: Record<string, string>;
}

export const purchaseOrderApi = {
  list: (status?: PurchaseOrderStatus) => {
    const q = status ? `?status=${status}` : '';
    return request<PurchaseOrder[]>(`/purchase-orders${q}`);
  },

  getById: (id: number) => request<PurchaseOrder>(`/purchase-orders/${id}`),

  create: (body: CreatePurchaseOrderBody) =>
    request<PurchaseOrder>('/purchase-orders', { method: 'POST', body: JSON.stringify(body) }),

  submit: (id: number) => request<PurchaseOrder>(`/purchase-orders/${id}/submit`, { method: 'POST' }),

  cancel: (id: number) => request<PurchaseOrder>(`/purchase-orders/${id}/cancel`, { method: 'POST' }),

  // expectedReceivedQuantity: satırın ekranda görünen teslim alınmış miktarı. Sunucu bunu
  // kendi değeriyle karşılaştırır; uyuşmazsa (çift tık / ağ tekrarı) 409 döner ve aynı
  // teslimat ikinci kez işlenmez.
  receiveLine: (
    id: number,
    lineId: number,
    quantity: number,
    warehouseLocationId: number | null,
    expectedReceivedQuantity: number,
  ) =>
    request<PurchaseOrder>(`/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ lineId, quantity, warehouseLocationId, expectedReceivedQuantity }),
    }),

  // Sipariş kalemlerini .xlsx'ten okur — SADECE AYRIŞTIRIR, veritabanına yazmaz (bkz. backend
  // PurchaseOrdersController.ParseLineExcel yorumu).
  parseLineExcel: async (file: File): Promise<PurchaseOrderLineExcelParseResult> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/purchase-orders/parse-line-excel`, {
      method: 'POST',
      headers: { ...getStoreHeaders(), ...authHeader() },
      credentials: 'include',
      body: form,
    });
    await throwIfNotOk(res);
    return res.json();
  },
};
