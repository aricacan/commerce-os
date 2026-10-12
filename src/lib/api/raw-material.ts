import { request } from './core';

// ─── Hammadde (RawMaterial) master data ───────────────────────────────────────

export interface RawMaterial {
  id: number;
  name: string;
  code: string | null;
  unit: string | null;
  unitCost: number;
  currency: string;
  supplierId: number | null;
  supplierName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RawMaterialFormValues = {
  name: string;
  code: string | null;
  unit: string | null;
  unitCost: number;
  currency: string | null;
  supplierId: number | null;
  notes: string | null;
};

export const rawMaterialApi = {
  list: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<RawMaterial[]>(`/raw-materials${q}`);
  },

  getById: (id: number) => request<RawMaterial>(`/raw-materials/${id}`),

  create: (body: RawMaterialFormValues) =>
    request<RawMaterial>('/raw-materials', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: number, body: RawMaterialFormValues) =>
    request<RawMaterial>(`/raw-materials/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  remove: (id: number) => request<void>(`/raw-materials/${id}`, { method: 'DELETE' }),
};
