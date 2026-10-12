import { request } from './core';

// ─── Omnichannel › Takip ajanları (P26-P27) ────────────────────────────────────
//
// Botun açtığı takip görevleri (yarım sipariş, ödeme, cevapsız devir...). Enum'lar SAYI gelir.

export const FOLLOW_UP_KIND = {
  AgentReplyOverdue: 1,
  CustomerSilent: 2,
  OrderIncomplete: 3,
  OrderUnconfirmed: 4,
  PaymentPending: 5,
} as const;

export const FOLLOW_UP_STATUS = {
  Pending: 0,
  Sent: 1,
  Skipped: 2,
  Cancelled: 3,
  Expired: 4,
  NeedsAgent: 5,
} as const;

export interface FollowUpTaskDto {
  id: number;
  conversationId: number;
  kind: number;
  attempt: number;
  maxAttempts: number;
  status: number;
  outcome: string | null;
  suggestedText: string | null;
  dueAt: string;
  createdAt: string;
  completedAt: string | null;
}

export const followUpsApi = {
  forConversation: (conversationId: number) =>
    request<FollowUpTaskDto[]>(`/omnichannel/conversations/${conversationId}/follow-ups`),
  cancel: (id: number) =>
    request<FollowUpTaskDto>(`/omnichannel/follow-ups/${id}/cancel`, { method: 'POST' }),
  complete: (id: number) =>
    request<FollowUpTaskDto>(`/omnichannel/follow-ups/${id}/complete`, { method: 'POST' }),
};
