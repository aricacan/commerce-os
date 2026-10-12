import { request } from './core';
import type { MarketTerminalResponse, TerminalTimeframe } from '../../types/api';

export interface TerminalQueryFilters {
  from?: string;
  to?: string;
  timeframe?: TerminalTimeframe;
  storeId?: number;
  platformId?: number;
  categoryId?: number;
}

export const terminalApi = {
  getMarketData: (filters: TerminalQueryFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.timeframe) params.set('timeframe', filters.timeframe);
    if (filters.storeId) params.set('storeId', String(filters.storeId));
    if (filters.platformId) params.set('platformId', String(filters.platformId));
    if (filters.categoryId) params.set('categoryId', String(filters.categoryId));

    const qs = params.toString();
    return request<MarketTerminalResponse>(`/terminal-analytics/market-data${qs ? `?${qs}` : ''}`);
  },
};