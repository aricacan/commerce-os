import { request } from './core';

// Backend: VehicleCompatibilityController. Botun "aracıma uyar mı?" cevabı yalnız ONAYLI
// satırlardan verilir; onay bekleyenler ürün adından türetilmiş adaylardır.

export interface CompatibilityCoverageDto {
  country: string;
  vehicleProducts: number;
  withApproved: number;
  withPendingOnly: number;
  withoutAny: number;
  pendingRows: number;
  approvedPercent: number;
}

export interface PendingCompatibilityDto {
  productId: number;
  productName: string;
  country: string | null;
  vehicleModelId: number;
  vehicle: string;
  source: string;
  confidence: number;
}

export interface CompatibilityKey {
  productId: number;
  vehicleModelId: number;
}

export const vehicleCompatibilityApi = {
  coverage: () => request<CompatibilityCoverageDto[]>('/vehicle-compatibility/coverage'),
  pending: (country: string | null, skip: number, take: number) => {
    const q = new URLSearchParams({ skip: String(skip), take: String(take) });
    if (country) q.set('country', country);
    return request<PendingCompatibilityDto[]>(`/vehicle-compatibility/pending?${q}`);
  },
  review: (items: CompatibilityKey[], approve: boolean) =>
    request<{ changed: number }>('/vehicle-compatibility/review', {
      method: 'POST', body: JSON.stringify({ items, approve }),
    }),
  approveByConfidence: (minConfidence: number, country: string | null) =>
    request<{ changed: number }>('/vehicle-compatibility/approve-by-confidence', {
      method: 'POST', body: JSON.stringify({ minConfidence, country }),
    }),
  populate: () => request<{ jobId: string }>('/vehicle-compatibility/populate', { method: 'POST' }),
};
