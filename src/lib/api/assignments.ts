import { request } from './core';
import type { AssignmentPolicy, ChannelMemberRole, ChannelType } from './omnichannel';
import type { HandoffLevel, HandoffReason, HandoffStatus } from './handoff';

// Backend: OmnichannelAssignmentsController (FAZ 7) — "Atananlar" panosu. Kart taşıma devir uçlarından yürür
// (handoffApi.assign / takeOver / resolve).

export interface AssignmentAgentDto {
  userId: number;
  name: string;
  isOnDuty: boolean;
  /** Ekip üyesi değil ama üstünde açık devir var. */
  isTeamMember: boolean;
  openCount: number;
  maxOpenConversations: number | null;
  avgFirstResponseSecondsToday: number | null;
  repliedToday: number;
}

export interface AssignmentCardDto {
  conversationId: number;
  /** Bot sütunundaki kartlarda (açık devir yok) null. */
  ticketId: number | null;
  ticketCode: string | null;
  customerName: string | null;
  channelId: number;
  channelName: string;
  channelType: ChannelType;
  country: string | null;
  level: HandoffLevel | null;
  score: number | null;
  isUrgent: boolean;
  ticketStatus: HandoffStatus | null;
  reason: HandoffReason | null;
  assigneeUserId: number | null;
  isBotActive: boolean;
  waitingSince: string;
  slaDueAt: string | null;
  slaBreachedAt: string | null;
  lastMessagePreview: string | null;
  tags: string[];
}

export interface AssignmentBoardDto {
  agents: AssignmentAgentDto[];
  cards: AssignmentCardDto[];
  generatedAt: string;
}

export interface AssignmentBoardFilter {
  channelId?: number;
  platform?: ChannelType;
  country?: string;
  level?: HandoffLevel;
  status?: HandoffStatus;
}

export interface ChannelTeamMemberSummaryDto {
  userId: number;
  name: string;
  role: ChannelMemberRole;
  isOnDuty: boolean;
  notify: boolean;
  maxOpenConversations: number | null;
  openCount: number;
}

export interface ChannelTeamSummaryDto {
  channelId: number;
  channelName: string;
  channelType: ChannelType;
  country: string | null;
  assignmentPolicy: AssignmentPolicy;
  members: ChannelTeamMemberSummaryDto[];
  /** "Sabit kişi" politikasının sorumlusu (eski backend göndermez). */
  fixedAgentUserId?: number | null;
}

function queryOf(filter: AssignmentBoardFilter): string {
  const q = new URLSearchParams();
  if (filter.channelId) q.set('channelId', String(filter.channelId));
  if (filter.platform !== undefined) q.set('platform', String(filter.platform));
  if (filter.country) q.set('country', filter.country);
  if (filter.level) q.set('level', filter.level);
  if (filter.status !== undefined) q.set('status', String(filter.status));
  return q.toString();
}

export const assignmentsApi = {
  board: (filter: AssignmentBoardFilter) =>
    request<AssignmentBoardDto>(`/omnichannel/assignments/board?${queryOf(filter)}`),

  teams: () => request<ChannelTeamSummaryDto[]>('/omnichannel/assignments/teams'),

  /** Temsilcinin tüm kanallardaki nöbeti (kendisi ya da yönetici). */
  setDuty: (userId: number, onDuty: boolean) =>
    request<void>(`/omnichannel/assignments/agents/${userId}/duty`, { method: 'PUT', body: JSON.stringify({ onDuty }) }),

  /** Kanal ekibi satırı (yönetici): nöbet ve sınır satır içinde düzenlenir. */
  updateMember: (channelId: number, member: ChannelTeamMemberSummaryDto) =>
    request<void>(`/omnichannel/channels/${channelId}/members/${member.userId}`, {
      method: 'PUT',
      body: JSON.stringify({
        role: member.role, notify: member.notify, isOnDuty: member.isOnDuty,
        maxOpenConversations: member.maxOpenConversations,
      }),
    }),
};
