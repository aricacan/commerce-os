import { request } from './core';

// ─── Slack modülü: olay-tipi -> webhook yönlendirme ────────────────────────

export interface NotificationRoute {
  id: number; eventType: string; webhookUrl: string | null; slackChannelId: string | null; label: string | null; isActive: boolean;
  scheduleDays: string[]; scheduleHour: number; createdAt: string;
}

export interface TemplateVariable { key: string; description: string; }

export interface NotificationEventType { key: string; description: string; availableVariables: TemplateVariable[]; }

// omnichannel.handoff webhook DEĞİL, bot-token (chat.postMessage) ile atılır — bu yüzden
// webhook URL yerine Slack kanal ID'si ister (bkz. SlackRoutesPanel Kanal ID girişi ve
// backend NotificationRoutesController.RequiresSlackChannelId). Bot-token, iki yönlü Slack
// cevapları'nın (temsilcinin thread'e yazdığı cevabın müşteriye geri gitmesi) çalışması için
// GEREKLİ — webhook'un aksine chat.postMessage mesajın ts'ini güvenilir döner.
export const CHANNEL_ID_EVENT_TYPES = new Set(['omnichannel.handoff']);

export const notificationRoutesApi = {
  list: () => request<NotificationRoute[]>('/notification-routes'),

  eventTypes: () => request<NotificationEventType[]>('/notification-routes/event-types'),

  create: (body: { eventType: string; webhookUrl?: string | null; slackChannelId?: string | null; label?: string | null; scheduleDays: string[]; scheduleHour: number }) =>
    request<NotificationRoute>('/notification-routes', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: number, body: { webhookUrl?: string | null; slackChannelId?: string | null; label?: string | null; isActive: boolean; scheduleDays: string[]; scheduleHour: number }) =>
    request<NotificationRoute>(`/notification-routes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (id: number) => request<void>(`/notification-routes/${id}`, { method: 'DELETE' }),

  trigger: (id: number) => request<void>(`/notification-routes/${id}/trigger`, { method: 'POST' }),
};

// ─── Slack mesaj önizlemesi + gönderim geçmişi ─────────────────────────────

/** Slack Block Kit bloğu — yalnızca panelin çizdiği alanlar tiplenir. */
export interface SlackBlock {
  type: 'header' | 'section' | 'divider' | 'context';
  text?: { type: string; text: string };
  fields?: { type: string; text: string }[];
  elements?: { type: string; text: string }[];
}

export interface SlackMessagePreview {
  eventType: string;
  fallbackText: string;
  blocks: SlackBlock[];
  /** true ise rakamlar canlı veriden; false ise yapı örneği. */
  isLiveData: boolean;
}

/** 0: Sent, 1: Failed, 2: Blocked — backend SlackDeliveryStatus ile birebir. */
export type SlackDeliveryStatus = 0 | 1 | 2;

export const SLACK_STATUS_SENT: SlackDeliveryStatus = 0;
export const SLACK_STATUS_FAILED: SlackDeliveryStatus = 1;
export const SLACK_STATUS_BLOCKED: SlackDeliveryStatus = 2;

export interface SlackDeliveryLog {
  id: number;
  eventType: string;
  target: string;
  summary: string;
  sentAtUtc: string;
  status: SlackDeliveryStatus;
  errorMessage: string | null;
  isManualTest: boolean;
}

export type BulkRouteAction = 'activate' | 'deactivate' | 'delete';

export const slackDeliveryApi = {
  preview: (eventType: string) =>
    request<SlackMessagePreview>(`/notification-routes/preview/${encodeURIComponent(eventType)}`),

  logs: (limit = 100) => request<SlackDeliveryLog[]>(`/notification-routes/logs?limit=${limit}`),

  bulk: (action: BulkRouteAction, ids: number[]) =>
    request<{ affected: number }>('/notification-routes/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, ids }),
    }),
};
