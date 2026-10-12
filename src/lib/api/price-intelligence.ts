import { request } from './core';

export interface PricePolicy { isEnabled: boolean; simulationOnly: boolean; emergencyStop: boolean; requireApproval: boolean; minimumMarginPercent: number; maximumChangePercent: number; competitorUndercutAmount: number; defaultCommissionPercent: number; defaultShippingCost: number; defaultServiceFee: number; baseCurrency: string }
export interface PriceRecommendation { id: number; productId: number; sku: string; productName: string; competitorTitle: string; currentPrice: number; competitorPriceInBase: number; knownCost: number; safeFloorPrice: number; recommendedPrice: number; expectedMarginPercent: number; currency: string; action: string; explanation: string; calculatedAt: string }
export interface PriceProposal { id: number; productId: number; sku: string; productName: string; marketplace: string; currentPrice: number; proposedPrice: number; currency: string; status: string; simulationOnly: boolean; reason: string; createdAt: string; approvedAt: string | null; executedAt: string | null; executionError: string | null }
export interface MarketplaceSyncRun { id: number; provider: string; mode: string; status: string; receivedCount: number; updatedCount: number; error: string | null; startedAt: string; completedAt: string | null }
export interface EbaySyncStatus { configured: boolean; mode: string; lastRun: MarketplaceSyncRun | null }

export const priceIntelligenceApi = {
  policy: () => request<PricePolicy>('/price-intelligence/policy'),
  savePolicy: (body: PricePolicy) => request<PricePolicy>('/price-intelligence/policy', { method: 'PUT', body: JSON.stringify(body) }),
  recommendations: () => request<PriceRecommendation[]>('/price-intelligence/recommendations'),
  calculate: () => request<PriceRecommendation[]>('/price-intelligence/recommendations/calculate', { method: 'POST' }),
  proposals: () => request<PriceProposal[]>('/price-intelligence/proposals'),
  createProposal: (recommendationId: number) => request<PriceProposal>('/price-intelligence/proposals', { method: 'POST', body: JSON.stringify({ recommendationId, marketplace: 'simulation' }) }),
  approve: (id: number) => request<PriceProposal>(`/price-intelligence/proposals/${id}/approve`, { method: 'POST' }),
  reject: (id: number) => request<PriceProposal>(`/price-intelligence/proposals/${id}/reject`, { method: 'POST' }),
  rollback: (id: number) => request<PriceProposal>(`/price-intelligence/proposals/${id}/rollback`, { method: 'POST' }),
  ebayStatus: () => request<EbaySyncStatus>('/price-intelligence/ebay/status'),
  syncEbay: () => request<MarketplaceSyncRun>('/price-intelligence/ebay/sync', { method: 'POST' }),
};
