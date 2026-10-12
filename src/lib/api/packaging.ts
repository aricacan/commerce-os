import { request, BASE, uploadHeaders, throwIfNotOk } from './core';

// ─── Packaging ────────────────────────────────────────────────────────────────
export const packagingApi = {
  calculate: (orderId: string | undefined, productSku: string) =>
    request<PackagingResult>('/packaging/calculate', {
      method: 'POST',
      body: JSON.stringify({ orderId, productSku }),
    }),

  calculateOrder: (orderId: number | undefined, orderNumber: string | undefined) =>
    request<PackagingResult[]>('/packaging/calculate-order', {
      method: 'POST',
      body: JSON.stringify({ orderId, orderNumber }),
    }),

  recentOrders: (count = 10) =>
    request<RecentOrder[]>(`/packaging/recent-orders?count=${count}`),

  topProducts: (count = 15) =>
    request<TopProduct[]>(`/packaging/top-products?count=${count}`),

  boxes: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<BoxInfo[]>(`/packaging/boxes${q}`);
  },

  createBox: (body: { boxCode: string; name: string; width?: number; length?: number; height?: number; manualDesi?: number; price?: number }) =>
    request<BoxInfo>('/packaging/boxes', { method: 'POST', body: JSON.stringify(body) }),

  updateBox: (boxCode: string, body: { name?: string; width?: number; length?: number; height?: number; manualDesi?: number | null; price?: number | null }) =>
    request<BoxInfo>(`/packaging/boxes/${encodeURIComponent(boxCode)}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteBox: (boxCode: string) =>
    request<void>(`/packaging/boxes/${encodeURIComponent(boxCode)}`, { method: 'DELETE' }),

  importBoxes: async (file: File): Promise<{ message: string; boxesUpserted: number; productsLinked: number; skippedRows: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/packaging/boxes/import`, { method: 'POST', headers: uploadHeaders(), body: formData });
    await throwIfNotOk(res);
    return res.json();
  },

  lookup: (sku: string) =>
    request<ProductLookupResult>(`/packaging/lookup/${encodeURIComponent(sku)}`),

  unmatchedCount: () =>
    request<{ unmatchedCount: number; totalProducts: number }>('/packaging/unmatched-count'),
};

export interface RecentOrderItem {
  supplierSKU: string;
  name: string;
  quantity: number;
  unitPrice: number;
  hasBox: boolean;
}

export interface RecentOrder {
  id: number;
  platformOrderNumber: string;
  platform: string;
  orderDate: string;
  totalAmount: number;
  universalStatus: string;
  shipCity: string | null;
  items: RecentOrderItem[];
}

export interface TopProduct {
  supplierSKU: string;
  name: string;
  totalOrdered: number;
}

export interface PackagingResult {
  orderId: string;
  productSku: string;
  productName: string;
  boxCode: string;
  boxName: string;
  boxWidth: number;
  boxLength: number;
  boxHeight: number;
  desi: number;
  carrierName: string;
  shippingPrice: number;
  compatibleVehicles: string[];
  processedAt: string;
}

export interface BoxInfo {
  // Opsiyonel: eski backend göndermez (kargo paket fiyatı kuralı bunu kullanır).
  id?: number;
  boxCode: string;
  name: string;
  width: number;
  length: number;
  height: number;
  manualDesi?: number | null;
  price?: number | null;
  desi: number | null;
  productCount: number;
}

export interface ProductLookupResult {
  supplierSKU: string;
  name: string;
  hasBox: boolean;
  boxCode: string | null;
  boxName: string | null;
  width: number | null;
  length: number | null;
  height: number | null;
  desi: number | null;
  boxPrice: number | null;
}
