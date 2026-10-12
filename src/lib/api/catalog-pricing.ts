import { request } from './core';

export interface ProductSupplierRow {
  id: number;
  supplierId: number;
  supplierName: string;
  supplierProductCode: string | null;
  unitPrice: number | null;
  currency: string;
  leadTimeDays: number | null;
  isPreferred: boolean;
}

export interface PriceGroupRow {
  id: number;
  name: string;
  discountPercent: number;
  isActive: boolean;
  customerCount: number;
}

// ─── Katalog ve fiyatlama (FAZ 5) ─────────────────────────────────────────────
// Tedarikçi fiyatı ProductCost'un YERİNE GEÇMEZ: maliyet onay kuyruğundan geçer,
// buradaki fiyat tedarikçinin teklifidir.
export const catalogPricingApi = {
  suppliers: (productId: number) =>
    request<ProductSupplierRow[]>(`/products/${productId}/suppliers`),

  upsertSupplier: (productId: number, body: {
    supplierId: number;
    supplierProductCode?: string | null;
    unitPrice?: number | null;
    currency: string;
    leadTimeDays?: number | null;
    isPreferred: boolean;
  }) => request<void>(`/products/${productId}/suppliers`, {
    method: 'POST',
    body: JSON.stringify(body),
  }),

  removeSupplier: (productId: number, supplierId: number) =>
    request<void>(`/products/${productId}/suppliers/${supplierId}`, { method: 'DELETE' }),

  setInvoiceFields: (productId: number, body: {
    invoiceName?: string | null;
    gtipCode?: string | null;
    originCountry?: string | null;
  }) => request<void>(`/products/${productId}/invoice-fields`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }),

  priceGroups: () => request<PriceGroupRow[]>('/price-groups'),

  createPriceGroup: (body: { name: string; discountPercent: number; isActive: boolean }) =>
    request<number>('/price-groups', { method: 'POST', body: JSON.stringify(body) }),

  updatePriceGroup: (id: number, body: { name: string; discountPercent: number; isActive: boolean }) =>
    request<void>(`/price-groups/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  setCustomerPriceGroup: (customerId: number, priceGroupId: number | null) =>
    request<void>(`/customers/${customerId}/price-group`, {
      method: 'PUT',
      body: JSON.stringify({ priceGroupId }),
    }),
};
