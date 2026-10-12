import { request } from './core';

export interface CatalogReadinessSummary {
  totalProducts: number;
  readyForMatching: number;
  needsReview: number;
  missingBrand: number;
  missingModel: number;
  missingModelYear: number;
  missingCategory: number;
  missingFitment: number;
  missingImage: number;
  missingCost: number;
  missingThickness: number;
  conflictingData: number;
  readinessPercent: number;
}

export interface CatalogReadinessCategory {
  categoryId: number | null;
  categoryName: string;
  productCount: number;
  readyCount: number;
  missingFitmentCount: number;
  missingVehicleDataCount: number;
}

export interface CatalogReadinessProduct {
  productId: number;
  sku: string;
  name: string;
  brand: string | null;
  model: string | null;
  modelYear: string | null;
  categoryId: number | null;
  categoryName: string | null;
  imageUrl: string | null;
  hasKnownCost: boolean;
  hasFitment: boolean;
  colors: string[];
  detectedAttributes: string[];
  issues: string[];
  readinessScore: number;
  readyForMatching: boolean;
}

export interface CatalogReadinessReport {
  summary: CatalogReadinessSummary;
  categories: CatalogReadinessCategory[];
  items: CatalogReadinessProduct[];
  total: number;
  page: number;
  pageSize: number;
}

export const catalogReadinessApi = {
  report: (params: { dataSourceId?: number; issue?: string; search?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params.dataSourceId != null) query.set('dataSourceId', String(params.dataSourceId));
    if (params.issue) query.set('issue', params.issue);
    if (params.search) query.set('search', params.search);
    query.set('page', String(params.page ?? 1));
    query.set('pageSize', String(params.pageSize ?? 50));
    return request<CatalogReadinessReport>(`/catalog-readiness?${query}`);
  },
};
