import { request } from './core';

// ─── e-Fatura/e-Arşiv Sağlayıcı Ayarları (Faz 4) — her BillingEntity kendi sağlayıcısını seçer ─

export type EInvoiceProviderType = 'Manual' | 'Foriba' | 'Uyumsoft' | 'Efinans' | 'Logo';

export interface EInvoiceProviderCapabilities {
  providerType: EInvoiceProviderType;
  isConnected: boolean;
}

export interface EInvoiceProviderConfig {
  id: number;
  billingEntityId: number;
  providerType: EInvoiceProviderType;
  isActive: boolean;
  apiBaseUrl: string | null;
  configuredCredentialKeys: string[];
  lastConnectionTestAt: string | null;
  lastConnectionTestSuccess: boolean | null;
  lastConnectionTestError: string | null;
  updatedAt: string;
}

export interface EInvoiceConnectionTestResult {
  success: boolean;
  message: string;
}

export const einvoiceProviderApi = {
  getCapabilities: () => request<EInvoiceProviderCapabilities[]>('/billing-entities/0/einvoice-provider/capabilities'),

  getActive: async (billingEntityId: number): Promise<EInvoiceProviderConfig | null> => {
    try {
      return await request<EInvoiceProviderConfig>(`/billing-entities/${billingEntityId}/einvoice-provider/active`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('404')) return null;
      throw e;
    }
  },

  upsert: (billingEntityId: number, body: { providerType: EInvoiceProviderType; apiBaseUrl?: string; credentials?: Record<string, string> }) =>
    request<EInvoiceProviderConfig>(`/billing-entities/${billingEntityId}/einvoice-provider`, { method: 'PUT', body: JSON.stringify(body) }),

  testConnection: (billingEntityId: number) =>
    request<EInvoiceConnectionTestResult>(`/billing-entities/${billingEntityId}/einvoice-provider/test-connection`, { method: 'POST' }),
};
