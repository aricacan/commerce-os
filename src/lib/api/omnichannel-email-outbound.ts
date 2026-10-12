import { request } from './core';

// ─── Omnichannel › Gönderilen e-postalar ───────────────────────────────────────
//
// Sistemin gönderdiği e-postaların kaydı (devir, sipariş, bildirim, cevap). Yalnız yönetici rolleri okur.

export const OUTBOUND_EMAIL_KIND = { Handoff: 'handoff', Order: 'order', Notification: 'notification', Reply: 'reply' } as const;
export type OutboundEmailKind = (typeof OUTBOUND_EMAIL_KIND)[keyof typeof OUTBOUND_EMAIL_KIND];

export const OUTBOUND_EMAIL_STATUS = { Sent: 'sent', Failed: 'failed' } as const;
export type OutboundEmailStatus = (typeof OUTBOUND_EMAIL_STATUS)[keyof typeof OUTBOUND_EMAIL_STATUS];

export interface OutboundEmailDto {
  id: number;
  channelId: number | null;
  conversationId: number | null;
  kind: OutboundEmailKind;
  toAddress: string;
  subject: string;
  messageId: string | null;
  status: OutboundEmailStatus;
  errorSummary: string | null;
  sentAtUtc: string;
}

export interface OutboundEmailPageDto {
  items: OutboundEmailDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// from UTC dahil, to UTC dahil değil.
export interface OutboundEmailQuery {
  channelId?: number;
  kind?: OutboundEmailKind;
  status?: OutboundEmailStatus;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export function outboundEmailQueryString(query: OutboundEmailQuery): string {
  const params = new URLSearchParams();
  if (query.channelId !== undefined) params.set('channelId', String(query.channelId));
  if (query.kind) params.set('kind', query.kind);
  if (query.status) params.set('status', query.status);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  return params.toString();
}

export const emailOutboundApi = {
  list: (query: OutboundEmailQuery) =>
    request<OutboundEmailPageDto>(`/omnichannel/email/outbound?${outboundEmailQueryString(query)}`),
};
