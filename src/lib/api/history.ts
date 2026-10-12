import { request } from './core';

export interface EntityHistoryItem {
  occurredAt: string;
  source: string;
  action: string;
  userEmail: string | null;
  details: string | null;
  severity: string;
}

export interface CreditLimitCheck {
  hasLimit: boolean;
  limit: number | null;
  currentBalance: number;
  wouldBe: number;
  exceeded: boolean;
  enforced: boolean;
  currency: string;
}

// Belge geçmişi — AuditLog'daki veriyi kullanıcıya görünür kılar.
export const historyApi = {
  forEntity: (entityType: string, entityId: string, limit = 100) =>
    request<EntityHistoryItem[]>(
      `/audit/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}?limit=${limit}`,
    ),
};

// Risk limiti önizlemesi — salt okunur, yan etkisi yok.
export const creditLimitApi = {
  check: (customerId: number, amount = 0, currency = 'TRY') =>
    request<CreditLimitCheck>(
      `/customers/${customerId}/credit-limit?amount=${amount}&currency=${encodeURIComponent(currency)}`,
    ),
};
