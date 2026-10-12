import { request } from './core';

// ─── Ürün Reçetesi (BOM) ───────────────────────────────────────────────────────

export interface BomLine {
  id: number;
  rawMaterialId: number;
  rawMaterialName: string;
  unit: string | null;
  quantity: number;
  unitCost: number;
  currency: string;
  lineCostTry: number;
  notes: string | null;
}

export interface Bom {
  id: number;
  productId: number;
  notes: string | null;
  lines: BomLine[];
  totalCostTry: number;
  createdAt: string;
  updatedAt: string;
}

export interface BomLineInput {
  rawMaterialId: number;
  quantity: number;
  notes?: string;
}

export const bomApi = {
  getByProductId: (productId: number) => request<Bom>(`/products/${productId}/bom`),

  upsert: (productId: number, notes: string | null, lines: BomLineInput[]) =>
    request<Bom>(`/products/${productId}/bom`, {
      method: 'PUT',
      body: JSON.stringify({ notes, lines }),
    }),

  remove: (productId: number) => request<void>(`/products/${productId}/bom`, { method: 'DELETE' }),
};
