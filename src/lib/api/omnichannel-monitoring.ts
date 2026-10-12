import { request } from './core';
import type { ChannelStatus, ChannelType } from './omnichannel';

// ─── Omnichannel › İzleme ──────────────────────────────────────────────────────
//
// Dört uç, aynı zaman penceresi: from/to UTC ISO (from dahil, to hariç). Sunucu pencereyi en çok
// 90 güne kırpar ve bunu period.clamped ile bildirir. Test Alanı kanalları sunucuda zaten dışarıda kalır.

export interface MonitoringQuery { from: string; to: string }

export interface MonitoringPeriodDto {
  from: string; to: string; previousFrom: string; previousTo: string; clamped: boolean;
}

export interface BotKpiDto {
  botTurnCount: number; p50DurationMs: number | null; p95DurationMs: number | null;
  handoffRatePercent: number | null; sendFailureRatePercent: number | null;
}

export interface ChannelHealthRowDto {
  channelId: number; displayName: string; type: ChannelType; status: ChannelStatus; lastError: string | null;
  lastWebhookAt: string | null; inboundCount: number; outboundCount: number; failedCount: number;
  botTurnCount: number; p95DurationMs: number | null;
}

export interface BotHealthDto {
  period: MonitoringPeriodDto; current: BotKpiDto; previous: BotKpiDto;
  p95TargetMs: number; handoffTargetPercent: number;
  botOutboundCount: number; agentOutboundCount: number;
  channels: ChannelHealthRowDto[]; topFailureReasons: { reason: string; count: number }[];
}

export interface HandoffReasonRowDto { reason: number; count: number; resolvedCount: number; avgResolveMinutes: number | null }
export interface SlaChannelRowDto { channelId: number; displayName: string; tracked: number; breached: number }

export interface MonitoringHandoffDto {
  ticketCount: number; resolvedCount: number; avgResolveMinutes: number | null; medianResolveMinutes: number | null;
  reasons: HandoffReasonRowDto[];
  slaTrackedCount: number; slaBreachedCount: number; slaChannels: SlaChannelRowDto[];
}

export interface EmailKindRowDto { kind: string; sent: number; failed: number }
export interface MailboxReadRowDto { channelId: number; displayName: string; lastSuccessAt: string | null; lastRunAt: string | null; lastError: string | null }
export interface MetaErrorCodeRowDto { code: number; count: number; sampleReason: string | null }

export interface MonitoringDeliveryDto {
  emailByKind: EmailKindRowDto[]; emailTopErrors: { reason: string; count: number }[];
  mailboxes: MailboxReadRowDto[]; metaErrorCodes: MetaErrorCodeRowDto[]; failedWithoutCode: number;
}

export interface MonitoringOrderDto {
  startedCount: number; confirmedCount: number; dispatchedCount: number; dispatchFailedCount: number;
  byStatus: { status: number; count: number }[];
}

const monitoringQueryString = ({ from, to }: MonitoringQuery): string =>
  new URLSearchParams({ from, to }).toString();

// Frontend backend'den önce yayına çıkabilir: eski sunucu bot-health'e hâlâ `days` biçiminde (period/current yok)
// cevap verir. Bunu sessizce bozuk çizmek yerine "backend güncel değil" diye bildiririz.
export class MonitoringBackendOutdatedError extends Error {
  constructor() {
    super('İzleme verisi sunucuda henüz yok (backend güncel değil).');
  }
}

async function getBotHealth(query: MonitoringQuery): Promise<BotHealthDto> {
  const data = await request<Partial<BotHealthDto>>(`/omnichannel/dashboard/bot-health?${monitoringQueryString(query)}`);
  if (!data.period || !data.current || !data.previous) throw new MonitoringBackendOutdatedError();
  return data as BotHealthDto;
}

export const monitoringApi = {
  getBotHealth,
  getHandoffs: (query: MonitoringQuery) =>
    request<MonitoringHandoffDto>(`/omnichannel/dashboard/monitoring/handoffs?${monitoringQueryString(query)}`),
  getDelivery: (query: MonitoringQuery) =>
    request<MonitoringDeliveryDto>(`/omnichannel/dashboard/monitoring/delivery?${monitoringQueryString(query)}`),
  getOrders: (query: MonitoringQuery) =>
    request<MonitoringOrderDto>(`/omnichannel/dashboard/monitoring/orders?${monitoringQueryString(query)}`),
};
