import { request } from './core';

// ─── Muhasebe Sağlayıcı Ayarları (Faz 3) ──────────────────────────────────────

export type AccountingProviderType = 'Manual' | 'Logo' | 'Mikro' | 'Netsis';

export interface AccountingProviderCapabilities {
  providerType: AccountingProviderType;
  supportsBalanceSync: boolean;
  supportsInvoiceIssuance: boolean;
  isConnected: boolean;
}

export interface AccountingProviderConfig {
  id: number;
  providerType: AccountingProviderType;
  isActive: boolean;
  apiBaseUrl: string | null;
  configuredCredentialKeys: string[];
  lastConnectionTestAt: string | null;
  lastConnectionTestSuccess: boolean | null;
  lastConnectionTestError: string | null;
  updatedAt: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export const accountingProviderApi = {
  getCapabilities: () => request<AccountingProviderCapabilities[]>('/accounting-provider/capabilities'),

  getActive: async (): Promise<AccountingProviderConfig | null> => {
    try {
      return await request<AccountingProviderConfig>('/accounting-provider/active');
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('404')) return null;
      throw e;
    }
  },

  upsert: (body: { providerType: AccountingProviderType; apiBaseUrl?: string; credentials?: Record<string, string> }) =>
    request<AccountingProviderConfig>('/accounting-provider', { method: 'PUT', body: JSON.stringify(body) }),

  testConnection: () => request<ConnectionTestResult>('/accounting-provider/test-connection', { method: 'POST' }),
};
