import { request } from './core';

export const ManualOrderDraftStatus = {
  Draft: 0,
  AwaitingApproval: 1,
  Approved: 2,
  Rejected: 3,
  Cancelled: 4,
  ReadyToDispatch: 5,
  Queued: 6,
  Completed: 7,
  Failed: 8,
} as const;

export const ErpOperationStatus = {
  Draft: 0,
  AwaitingApproval: 1,
  Approved: 2,
  DispatchDisabled: 3,
  Queued: 4,
  Processing: 5,
  Succeeded: 6,
  PartiallySucceeded: 7,
  Failed: 8,
  Rejected: 9,
  Cancelled: 10,
  ReadyToDispatch: 11,
} as const;

export interface ManualOrderProduct {
  id: number;
  sku: string;
  name: string;
  barcode: string | null;
  imageUrl: string | null;
  price: number;
  stockQuantity: number;
  buyingPrice: number | null;
  boxCode: string | null;
  boxName: string | null;
  boxPrice: number | null;
  desi: number;
  shippingCost: number;
  vatRate: number;
  breakEvenPrice: number | null;
  hasCostData: boolean;
}

export interface ManualOrderLineInput {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface SaveManualOrderDraft {
  storeId: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shipCity: string;
  shipDistrict?: string;
  addressLine: string;
  currency: string;
  shippingAmount: number;
  discountAmount: number;
  note?: string;
  keepLocally: boolean;
  targetDataSourceIds: number[];
  lines: ManualOrderLineInput[];
}

export interface ManualOrderDraft {
  id: string;
  draftNumber: string;
  storeId: number;
  storeName: string;
  status: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  shipCity: string;
  shipDistrict: string | null;
  addressLine: string;
  currency: string;
  shippingAmount: number;
  discountAmount: number;
  subtotal: number;
  totalAmount: number;
  note: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  localOrderId: number | null;
  createdAt: string;
  updatedAt: string;
  lines: Array<ManualOrderLineInput & {
    sku: string;
    productName: string;
    imageUrl: string | null;
    lineTotal: number;
    listPrice: number;
    stockQuantity: number;
    buyingPrice: number | null;
    boxCode: string | null;
    boxName: string | null;
    boxPrice: number | null;
    desi: number;
    shippingCost: number;
    vatRate: number;
    breakEvenPrice: number | null;
    hasCostData: boolean;
  }>;
  destinations: Array<{
    target: number;
    dataSourceId: number | null;
    name: string;
    status: number;
    idempotencyKey: string;
  }>;
}

export interface ManualOrderContext {
  externalDispatchEnabled: boolean;
  dispatchNotice: string;
  stores: Array<{
    id: number;
    name: string;
    // supportsDispatch: bu ERP tipi icin gercek bir yazma adaptoru var mi? Backend bu alani
    // frontend'den SONRA yayina cikabilir (bkz. hafiza: frontend backend'den once deploy olur),
    // bu yuzden opsiyonel okunur ve yoksa "destekleniyor" varsayilir.
    erpSources: Array<{ id: number; name: string; connectorType: string; country: string; supportsDispatch?: boolean }>;
  }>;
}

export const manualOrderApi = {
  context: () => request<ManualOrderContext>('/manual-orders/context'),
  products: (storeId: number, search?: string) => {
    const q = new URLSearchParams({ storeId: String(storeId) });
    if (search) q.set('search', search);
    return request<ManualOrderProduct[]>(`/manual-orders/products?${q}`);
  },
  list: () => request<ManualOrderDraft[]>('/manual-orders'),
  get: (id: string) => request<ManualOrderDraft>(`/manual-orders/${id}`),
  create: (body: SaveManualOrderDraft) => request<ManualOrderDraft>('/manual-orders', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: SaveManualOrderDraft) => request<ManualOrderDraft>(`/manual-orders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  submit: (id: string) => request<ManualOrderDraft>(`/manual-orders/${id}/submit`, { method: 'POST' }),
  approve: (id: string) => request<ManualOrderDraft>(`/manual-orders/${id}/approve`, { method: 'POST' }),
  reject: (id: string, reason: string) => request<ManualOrderDraft>(`/manual-orders/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  dispatch: (id: string) => request<ManualOrderDraft>(`/manual-orders/${id}/dispatch`, { method: 'POST' }),
  cancel: (id: string, reason: string) => request<ManualOrderDraft>(`/manual-orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reopen: (id: string) => request<ManualOrderDraft>(`/manual-orders/${id}/reopen`, { method: 'POST' }),
  cancelLocalOrder: (orderId: number, reason: string) => request<{ orderId: number; orderNumber: string }>(`/manual-orders/local-order/${orderId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
};
