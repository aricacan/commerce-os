import { request } from './core';
import type { HandoffReason } from './handoff';
import type { PaymentMethod } from './omnichannel';

// ─── Omnichannel › Sistem › Devir Yönlendirme (Faz D) ───────────────────────────
//
// Bot devrettiğinde, konuşma bizden cevap beklemeye geçtiğinde ya da sohbetten sipariş onaylandığında
// kurala uyan ek hedeflere (Slack kanalı, kişiler, e-posta) haber gider. Kanal ekibi bildirimi ve varsayılan Slack devir kanalı
// bunlardan bağımsız olarak sürer.

// Backend HandoffRouteEventType ile birebir.
export const HANDOFF_ROUTE_EVENT = { Handoff: 0, Order: 1, AwaitingReply: 2 } as const;
export type HandoffRouteEvent = (typeof HANDOFF_ROUTE_EVENT)[keyof typeof HANDOFF_ROUTE_EVENT];

export const HANDOFF_ROUTE_EVENT_LABELS: Record<HandoffRouteEvent, string> = {
  [HANDOFF_ROUTE_EVENT.Handoff]: 'Devir',
  [HANDOFF_ROUTE_EVENT.Order]: 'Sipariş',
  [HANDOFF_ROUTE_EVENT.AwaitingReply]: 'Cevap bekliyor',
};

// Örnek bildirim düğmesi ve bildirimi için olayın adı ("örnek devir bildirimi").
export const HANDOFF_ROUTE_EVENT_SAMPLE: Record<HandoffRouteEvent, string> = {
  [HANDOFF_ROUTE_EVENT.Handoff]: 'devir',
  [HANDOFF_ROUTE_EVENT.Order]: 'sipariş',
  [HANDOFF_ROUTE_EVENT.AwaitingReply]: 'cevap bekliyor',
};

// Backend HandoffRouteHours ile birebir.
export const HANDOFF_ROUTE_HOURS = { Any: 0, InHours: 1, OutOfHours: 2 } as const;
export type HandoffRouteHours = (typeof HANDOFF_ROUTE_HOURS)[keyof typeof HANDOFF_ROUTE_HOURS];

export const HANDOFF_ROUTE_HOURS_LABELS: Record<HandoffRouteHours, string> = {
  [HANDOFF_ROUTE_HOURS.Any]: 'Her zaman',
  [HANDOFF_ROUTE_HOURS.InHours]: 'Yalnız mesai içi',
  [HANDOFF_ROUTE_HOURS.OutOfHours]: 'Yalnız mesai dışı',
};

export interface HandoffRouteDto {
  id: number;
  name: string;
  // Yeni alanlar — ön yüz arka yüzden önce yayına çıkar; eski backend göndermez → undefined (= Devir, boş).
  eventType?: HandoffRouteEvent;
  country: string;
  // Yalnız devir kuralı. Boş = tüm nedenler.
  reasons: HandoffReason[];
  // Yalnız sipariş kuralı. Boş = tüm ödeme yöntemleri.
  paymentMethods?: PaymentMethod[];
  // İki olayda da. Boş = tüm markalar.
  brandIds?: number[];
  hours: HandoffRouteHours;
  slackChannelIds: string[];
  userIds: number[];
  emails: string[];
  isActive: boolean;
  lastDeliveryAt: string | null;
  lastError: string | null;
}

export type HandoffRouteSaveBody = Omit<HandoffRouteDto, 'id' | 'lastDeliveryAt' | 'lastError'>;

export interface HandoffRouteUserDto {
  userId: number;
  displayName: string;
  email: string;
}

export interface HandoffRouteTestResultDto {
  ok: boolean;
  error: string | null;
}

const BASE = '/omnichannel/handoff-routes';

export const handoffRoutesApi = {
  getAll: () => request<HandoffRouteDto[]>(BASE),
  getUsers: () => request<HandoffRouteUserDto[]>(`${BASE}/users`),
  create: (body: HandoffRouteSaveBody) =>
    request<HandoffRouteDto>(BASE, { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: HandoffRouteSaveBody) =>
    request<HandoffRouteDto>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`${BASE}/${id}`, { method: 'DELETE' }),
  test: (id: number) => request<HandoffRouteTestResultDto>(`${BASE}/${id}/test`, { method: 'POST' }),
};
