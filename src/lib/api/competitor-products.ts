import { BASE, request, throwIfNotOk, uploadHeaders } from './core';

export interface CompetitorMatch {
  id: number;
  productId: number;
  sku: string;
  productName: string;
  score: number;
  status: 'Suggested' | 'Review' | 'Approved' | 'Rejected';
  reasons: string[];
  conflicts: string[];
}

export interface CompetitorListing {
  id: number;
  source: string;
  externalId: string;
  title: string;
  brand: string | null;
  model: string | null;
  modelYear: string | null;
  category: string | null;
  thickness: string | null;
  price: number | null;
  currency: string | null;
  externalUrl: string | null;
  imageUrl: string | null;
  updatedAt: string;
  matches: CompetitorMatch[];
}

export interface CompetitorWorkspace {
  summary: {
    listingCount: number;
    suggestedCount: number;
    reviewCount: number;
    approvedCount: number;
    rejectedCount: number;
    unmatchedCount: number;
  };
  items: CompetitorListing[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CompetitorImportResult {
  parsed: number;
  added: number;
  updated: number;
  suggested: number;
  needsReview: number;
  unmatched: number;
  warnings: string[];
}

export const competitorProductsApi = {
  list: (status = 'all', search = '', page = 1) => {
    const query = new URLSearchParams({ status, search, page: String(page), pageSize: '30' });
    return request<CompetitorWorkspace>(`/competitor-products?${query}`);
  },
  importFile: async (file: File, source: string) => {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${BASE}/competitor-products/import?source=${encodeURIComponent(source)}`, {
      method: 'POST', headers: uploadHeaders(), body: form,
    });
    await throwIfNotOk(response);
    return response.json() as Promise<CompetitorImportResult>;
  },
  rematch: () => request<CompetitorImportResult>('/competitor-products/rematch', { method: 'POST' }),
  resolve: (matchId: number, decision: 'Approved' | 'Rejected') =>
    request<void>(`/competitor-products/matches/${matchId}`, {
      method: 'PUT', body: JSON.stringify({ decision }),
    }),
  remove: (listingId: number) => request<void>(`/competitor-products/listings/${listingId}`, { method: 'DELETE' }),
  downloadTemplate: async () => {
    const response = await fetch(`${BASE}/competitor-products/template`, { headers: uploadHeaders() });
    await throwIfNotOk(response);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'rakip-urun-sablonu.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  },
};
