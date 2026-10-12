import { request } from './core';

// Backend: VehicleFitmentsController (uyumluluk v2, FAZ 5.2). ERP ürünü + site kalemi; kuşak düzeyinde.
// Otomatik onay eşiğinin altındaki satırlar burada onay bekler; onay/ret elle karardır, doldurma turu ezmez.

export type FitmentSource = 'TitleParse' | 'Fitment' | 'Manual';
export type FitmentRefType = 'ErpProduct' | 'SiteCatalogItem';

export interface VehicleFitmentPendingDto {
  id: number;
  refType: FitmentRefType;
  refId: number;
  productName: string;
  make: string;
  model: string;
  generation: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  source: FitmentSource;
  confidence: number;
}

export interface VehicleFitmentPendingPage {
  items: VehicleFitmentPendingDto[];
  total: number;
}

export interface VehicleFitmentFilter {
  make?: string;
  model?: string;
  source?: FitmentSource;
  refType?: FitmentRefType;
}

export const vehicleFitmentsApi = {
  pending: (filter: VehicleFitmentFilter, skip: number, take: number) => {
    const q = new URLSearchParams({ skip: String(skip), take: String(take) });
    Object.entries(filter).forEach(([key, value]) => { if (value) q.set(key, value); });
    return request<VehicleFitmentPendingPage>(`/vehicle-fitments/pending?${q}`);
  },
  review: (ids: number[], approve: boolean) =>
    request<{ changed: number }>('/vehicle-fitments/review', {
      method: 'POST', body: JSON.stringify({ ids, approve }),
    }),
  populate: () => request<{ jobId: string }>('/vehicle-fitments/populate', { method: 'POST' }),
};
