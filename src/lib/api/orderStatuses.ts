import { request } from './core';

export interface OperationStatus {
  id: number;
  groupId: number | null;
  name: string;
  color: string | null;
  sortOrder: number;
  statusText: string | null;
  isDefault: boolean;
  isFinal: boolean;
  isCancelled: boolean;
  notifyEmail: boolean;
  notifySlack: boolean;
  notifyPush: boolean;
  isActive: boolean;
  orderCount: number;
}

export interface ActionQueueItem {
  key: string;
  label: string;
  count: number;
  href: string;
}

// ─── Operasyon durumları ──────────────────────────────────────────────────────
// Bunlar BİZİM iş akışımızın durumlarıdır; pazaryerinden gelen durum (universalStatus)
// ayrı tutulur ve bu uçlardan değişmez.
export type OrderLifecycleKind = 'Flow' | 'Terminal' | 'Other';

/** Kanonik sipariş yaşam döngüsü adımı; key = DB'deki UniversalStatus değeri. */
export interface OrderLifecycleStep {
  key: string;
  label: string;
  description: string;
  kind: OrderLifecycleKind;
  order: number;
  count: number;
}

export const orderStatusesApi = {
  lifecycle: () => request<OrderLifecycleStep[]>('/order-statuses/lifecycle'),
  list: () => request<OperationStatus[]>('/order-statuses'),
  create: (body: Partial<OperationStatus> & { name: string }) =>
    request<number>('/order-statuses', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: Partial<OperationStatus> & { name: string }) =>
    request<void>(`/order-statuses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/order-statuses/${id}`, { method: 'DELETE' }),
  changeOrderStatus: (orderId: number, statusId: number) =>
    request<void>(`/orders/${orderId}/operation-status`, {
      method: 'PUT',
      body: JSON.stringify({ statusId }),
    }),
};

export interface OldOrderBucket {
  label: string;
  count: number;
}

export interface OldOrderPreview {
  days: number;
  cutoffUtc: string;
  eligibleCount: number;
  skippedManualCount: number;
  oldestOrderDate: string | null;
  newestOrderDate: string | null;
  byStore: OldOrderBucket[];
  byPlatform: OldOrderBucket[];
  byStatus: OldOrderBucket[];
}

export interface OldOrderCompletionResult {
  days: number;
  completedCount: number;
}

// Büyük tabloda toplu güncelleme genel istek zaman aşımından uzun sürebilir.
const COMPLETE_TIMEOUT_MS = 300_000;

// ─── Eski siparişleri toplu tamamla ───────────────────────────────────────────
export const oldOrdersApi = {
  preview: (days: number) =>
    request<OldOrderPreview>(`/order-statuses/old-orders/preview?days=${days}`),
  complete: (days: number, confirmCount: number) =>
    request<OldOrderCompletionResult>(
      '/order-statuses/old-orders/complete',
      { method: 'POST', body: JSON.stringify({ days, confirmCount }) },
      true,
      COMPLETE_TIMEOUT_MS,
    ),
  getAutoComplete: () => request<{ days: number }>('/order-statuses/old-orders/auto-complete'),
  setAutoComplete: (days: number) =>
    request<void>('/order-statuses/old-orders/auto-complete', {
      method: 'PUT',
      body: JSON.stringify({ days }),
    }),
};

export const actionQueueApi = {
  get: () => request<ActionQueueItem[]>('/dashboard/action-queue'),
};

// ─── Otomatik sipariş yaşam döngüsü anahtarı ───────────────────────────────────
export const orderAutoLifecycleApi = {
  get: () => request<{ enabled: boolean }>('/order-statuses/auto-lifecycle'),
  set: (enabled: boolean) =>
    request<void>('/order-statuses/auto-lifecycle', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),
};
