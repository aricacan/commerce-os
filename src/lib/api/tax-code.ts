import { request } from './core';

// Vergi kodu kataloğu (KDV/tevkifat/istisna/ÖTV) — hard-code oran YERİNE DB tabanlı,
// versiyonlanmış katalog (bkz. backend TaxCode.cs). Mevzuat değiştiğinde yeni bir satır
// eklenir, eskisi effectiveTo ile kapatılır; Code/Type sonradan değiştirilemez.

export type TaxCodeType = 'Vat' | 'Withholding' | 'Exemption' | 'Otv';

export interface TaxCode {
  id: number;
  code: string;
  name: string;
  type: TaxCodeType;
  rate: number;
  gibCode: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxCodeBody {
  code: string;
  name: string;
  type: TaxCodeType;
  rate: number;
  gibCode?: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface UpdateTaxCodeBody {
  name: string;
  rate: number;
  gibCode?: string;
  effectiveTo?: string;
  isActive: boolean;
}

export const taxCodeApi = {
  list: (activeOnly = false) => request<TaxCode[]>(`/tax-codes?activeOnly=${activeOnly}`),

  getById: (id: number) => request<TaxCode>(`/tax-codes/${id}`),

  create: (body: CreateTaxCodeBody) =>
    request<TaxCode>('/tax-codes', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: number, body: UpdateTaxCodeBody) =>
    request<TaxCode>(`/tax-codes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};
