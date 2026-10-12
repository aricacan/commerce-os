import { request } from './core';
import { httpStatusOf } from '../errors';
import type { ChannelType } from './omnichannel';

// Backend: OmnichannelHandoffController (Faz 5, v2: FAZ 7). Bot konuşmayı insana bıraktığında açılan
// iş kaydı: sebep, yapay zekâ özeti, algılanan araç/ürün ve botun denediği adımlar.

export const HANDOFF_REASON = {
  NotUnderstood: 0,
  Requested: 1,
  Complaint: 2,
  PriceRequest: 3,
  DataUncertain: 4,
  BackendUnresolved: 5,
  RepeatedFailure: 6,
  BusinessRule: 7,
  CatalogNotConfigured: 8,
  ToolFailed: 9,
  ModelFailed: 10,
  BotError: 11,
} as const;
export type HandoffReason = (typeof HANDOFF_REASON)[keyof typeof HANDOFF_REASON];

// Durum makinesi (FAZ 7): İstendi → Kuyrukta | Atandı → Üzerinde çalışılıyor ⇄ Müşteri bekleniyor → Çözüldü.
// Sayısal değerler backend'le aynı; "Bota geri verildi" ayrı durum değil, Çözüldü + sonuç.
export const HANDOFF_STATUS = {
  Open: 0, InProgress: 1, WaitingCustomer: 2, Resolved: 3, Assigned: 4, Requested: 5,
} as const;
export type HandoffStatus = (typeof HANDOFF_STATUS)[keyof typeof HANDOFF_STATUS];

export const HANDOFF_OUTCOME = { Solved: 0, ReturnedToBot: 1, Closed: 2 } as const;
export type HandoffOutcome = (typeof HANDOFF_OUTCOME)[keyof typeof HANDOFF_OUTCOME];

export const HANDOFF_REASON_LABELS: Record<HandoffReason, string> = {
  [HANDOFF_REASON.NotUnderstood]: 'Anlaşılamadı',
  [HANDOFF_REASON.Requested]: 'Temsilci istendi',
  [HANDOFF_REASON.Complaint]: 'Şikâyet',
  [HANDOFF_REASON.PriceRequest]: 'Fiyat talebi',
  [HANDOFF_REASON.DataUncertain]: 'Veri belirsiz',
  [HANDOFF_REASON.BackendUnresolved]: 'Kayıt bulunamadı',
  [HANDOFF_REASON.RepeatedFailure]: 'Tekrarlı başarısızlık',
  [HANDOFF_REASON.BusinessRule]: 'İş kuralı',
  [HANDOFF_REASON.CatalogNotConfigured]: 'Katalog yok',
  [HANDOFF_REASON.ToolFailed]: 'Araç hatası',
  [HANDOFF_REASON.ModelFailed]: 'Model hatası',
  [HANDOFF_REASON.BotError]: 'Bot hatası',
};

export const HANDOFF_STATUS_LABELS: Record<HandoffStatus, string> = {
  [HANDOFF_STATUS.Requested]: 'İstendi',
  [HANDOFF_STATUS.Open]: 'Kuyrukta',
  [HANDOFF_STATUS.Assigned]: 'Atandı',
  [HANDOFF_STATUS.InProgress]: 'Üzerinde çalışılıyor',
  [HANDOFF_STATUS.WaitingCustomer]: 'Müşteri bekleniyor',
  [HANDOFF_STATUS.Resolved]: 'Çözüldü',
};

export const HANDOFF_OUTCOME_LABELS: Record<HandoffOutcome, string> = {
  [HANDOFF_OUTCOME.Solved]: 'Çözüldü',
  [HANDOFF_OUTCOME.ReturnedToBot]: 'Bota geri verildi',
  [HANDOFF_OUTCOME.Closed]: 'Kapatıldı',
};

// Devir öncelik seviyesi (P24): P1 en acil. Backend puandan türetir.
export type HandoffLevel = 'P1' | 'P2' | 'P3';

export interface HandoffTicketDto {
  id: number;
  conversationId: number;
  customerProfileId: number | null;
  customerName: string | null;
  channelName: string;
  channelType: ChannelType;
  reason: HandoffReason;
  summary: string;
  detectedVehicle: string | null;
  requestedProduct: string | null;
  botActionsTried: string | null;
  status: HandoffStatus;
  isUrgent: boolean;
  assigneeUserId: number | null;
  assigneeName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  // Öncelik puanı (P24); kuyruk sunucuda bu puana göre sıralı gelir. Eski backend göndermez.
  score?: number;
  level?: HandoffLevel;
  // Puanın dökümü ("Şikayet +40, 2 saat bekleme +10" gibi) — ipucunda gösterilir.
  scoreBreakdown?: string | null;
  // ── FAZ 7 (eski backend göndermez) ──
  ticketCode?: string | null;
  resolutionOutcome?: HandoffOutcome | null;
  channelId?: number | null;
  country?: string | null;
  assignedAt?: string | null;
  firstAgentReplyAt?: string | null;
  customerNoticeSentAt?: string | null;
  slaDueAt?: string | null;
  slaBreachedAt?: string | null;
  lastMessagePreview?: string | null;
  lastInboundAt?: string | null;
  isBotActive?: boolean;
}

export interface HandoffQueueFilter {
  status?: HandoffStatus;
  channelId?: number;
  platform?: ChannelType;
  mineOnly?: boolean;
  unassignedOnly?: boolean;
  overdueOnly?: boolean;
  country?: string;
  level?: HandoffLevel;
}

export interface HandoffQueuePage {
  items: HandoffTicketDto[];
  total: number;
  /** Eski backend (sayfasız uç): toplam bilinmez, tek sayfa döner. */
  legacy?: boolean;
}

export interface HandoffCounts {
  open: number;
  unassigned: number;
  overdue: number;
  mine: number;
  /** Atanmamış ya da gecikmiş (menü rozeti). */
  attention: number;
}

export const HANDOFF_EVENT_TYPE = {
  Created: 0, StatusChanged: 1, Assigned: 2, Unassigned: 3, Resolved: 4, Rehandoff: 5, CustomerNotice: 6,
  SlaReminder: 7, SlaOwners: 8, SlaAdmins: 9,
} as const;
export type HandoffEventType = (typeof HANDOFF_EVENT_TYPE)[keyof typeof HANDOFF_EVENT_TYPE];

export interface HandoffTimelineEventDto {
  id: number;
  type: HandoffEventType;
  fromStatus: HandoffStatus | null;
  toStatus: HandoffStatus | null;
  actorUserId: number | null;
  actorName: string | null;
  assigneeUserId: number | null;
  assigneeName: string | null;
  note: string | null;
  at: string;
}

export const HANDOFF_BULK_ACTION = { Assign: 0, Resolve: 1 } as const;
export type HandoffBulkAction = (typeof HANDOFF_BULK_ACTION)[keyof typeof HANDOFF_BULK_ACTION];

export interface HandoffBulkBody {
  ticketIds: number[];
  action: HandoffBulkAction;
  assigneeUserId?: number | null;
  outcome?: HandoffOutcome;
  note?: string;
}

export interface HandoffBulkResult { succeeded: number; failedTicketIds: number[] }

const NOT_FOUND = 404;

function queryOf(filter: HandoffQueueFilter, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams(extra);
  if (filter.status !== undefined) q.set('status', String(filter.status));
  if (filter.channelId) q.set('channelId', String(filter.channelId));
  if (filter.platform !== undefined) q.set('platform', String(filter.platform));
  if (filter.mineOnly) q.set('mineOnly', 'true');
  if (filter.unassignedOnly) q.set('unassignedOnly', 'true');
  if (filter.overdueOnly) q.set('overdueOnly', 'true');
  if (filter.country) q.set('country', filter.country);
  if (filter.level) q.set('level', filter.level);
  return q.toString();
}

const ticketUrl = (ticketId: number) => `/omnichannel/handoffs/${ticketId}`;

export const handoffApi = {
  queue: (query: { status?: HandoffStatus; channelId?: number; mineOnly?: boolean } = {}) =>
    request<HandoffTicketDto[]>(`/omnichannel/handoffs?${queryOf(query)}`),

  /**
   * Sayfalı kuyruk (FAZ 7). Ön yüz backend'den önce yayına çıkar: eski backend'de uç yoksa (404) eski sayfasız
   * uca düşülür ve sayfa "legacy" işaretlenir (filtrelerin bir kısmı uygulanmaz).
   */
  page: async (filter: HandoffQueueFilter, skip: number, take: number): Promise<HandoffQueuePage> => {
    try {
      return await request<HandoffQueuePage>(
        `/omnichannel/handoffs/page?${queryOf(filter, { skip: String(skip), take: String(take) })}`);
    } catch (e) {
      if (httpStatusOf(e) !== NOT_FOUND) throw e;
      const items = await handoffApi.queue({ status: filter.status, channelId: filter.channelId, mineOnly: filter.mineOnly });
      return { items, total: items.length, legacy: true };
    }
  },

  /** Menü rozeti; eski backend'de null. */
  counts: async (): Promise<HandoffCounts | null> => {
    try {
      return await request<HandoffCounts>('/omnichannel/handoffs/counts');
    } catch (e) {
      if (httpStatusOf(e) === NOT_FOUND) return null;
      throw e;
    }
  },

  timeline: (ticketId: number) => request<HandoffTimelineEventDto[]>(`${ticketUrl(ticketId)}/timeline`),

  // Konuşmanın açık kaydı; yoksa backend 204 döner (gövdesiz) → null.
  forConversation: (conversationId: number) =>
    request<HandoffTicketDto | null>(`/omnichannel/conversations/${conversationId}/handoff`),

  update: (ticketId: number, body: { status?: HandoffStatus; resolutionNote?: string }) =>
    request<HandoffTicketDto>(ticketUrl(ticketId), { method: 'PATCH', body: JSON.stringify(body) }),

  /** "Üstlen": kayıt ve konuşma çağırana atanır, iş başlar, bot susar. */
  takeOver: (ticketId: number) => request<HandoffTicketDto>(`${ticketUrl(ticketId)}/take-over`, { method: 'POST' }),

  /** Yeniden ata; null = kuyruğa geri. */
  assign: (ticketId: number, assigneeUserId: number | null) =>
    request<HandoffTicketDto>(`${ticketUrl(ticketId)}/assignee`, {
      method: 'PUT', body: JSON.stringify({ assigneeUserId }),
    }),

  setWaiting: (ticketId: number, waiting: boolean) =>
    request<HandoffTicketDto>(`${ticketUrl(ticketId)}/waiting`, { method: 'PUT', body: JSON.stringify({ waiting }) }),

  resolve: (ticketId: number, outcome: HandoffOutcome, note?: string) =>
    request<HandoffTicketDto>(`${ticketUrl(ticketId)}/resolve`, {
      method: 'POST', body: JSON.stringify({ outcome, note: note?.trim() || undefined }),
    }),

  bulk: (body: HandoffBulkBody) =>
    request<HandoffBulkResult>('/omnichannel/handoffs/bulk', { method: 'POST', body: JSON.stringify(body) }),
};
