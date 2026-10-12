// Kanal ekipleri: hangi temsilci hangi kanalda çalışıyor, nöbet ve açık iş sınırları.
import type { ChannelMemberDto } from '../../api/omnichannel';
import type { ChannelTeamSummaryDto } from '../../api/assignments';
import { ago } from '../seed';
import { listRecords } from './omnichannel-conversations';
import { DEMO_CHANNELS, DEMO_AGENTS, agentName } from './omnichannel-core';

const ROLE_OWNER = 1;
const ROLE_AGENT = 0;
const MAX_OPEN_PER_AGENT = 12;

const TEAM_BY_CHANNEL: Record<number, number[]> = {
  1: [1, 2, 3, 4], 2: [1, 3], 3: [1, 2, 4], 4: [2, 3, 4], 5: [1, 3, 4], 6: [1, 3],
};
/** Nöbet dışındaki temsilci (demo için en az bir kişi nöbette değil). */
const OFF_DUTY_USER_ID = 4;

function openCount(userId: number, channelId: number): number {
  return listRecords().filter((record) =>
    record.summary.channelId === channelId && record.summary.assignedUserId === userId && record.summary.status < 2).length;
}

export function channelMembers(channelId: number): ChannelMemberDto[] {
  return (TEAM_BY_CHANNEL[channelId] ?? []).map((userId, index): ChannelMemberDto => ({
    userId,
    displayName: agentName(userId) ?? `Temsilci ${userId}`,
    role: (index === 0 ? ROLE_OWNER : ROLE_AGENT) as ChannelMemberDto['role'],
    notify: true,
    isOnDuty: userId !== OFF_DUTY_USER_ID,
    maxOpenConversations: MAX_OPEN_PER_AGENT,
    openConversationCount: openCount(userId, channelId),
    lastAssignedAt: ago(0, userId),
  }));
}

export function memberCandidates(channelId: number) {
  const inTeam = new Set(TEAM_BY_CHANNEL[channelId] ?? []);
  return DEMO_AGENTS.filter((agent) => !inTeam.has(agent.userId));
}

export function teamSummaries(): ChannelTeamSummaryDto[] {
  return DEMO_CHANNELS.map((channel): ChannelTeamSummaryDto => ({
    channelId: channel.id,
    channelName: channel.displayName,
    channelType: channel.type,
    country: channel.country,
    assignmentPolicy: channel.assignmentPolicy,
    fixedAgentUserId: null,
    members: channelMembers(channel.id).map((member) => ({
      userId: member.userId,
      name: member.displayName,
      role: member.role,
      isOnDuty: member.isOnDuty,
      notify: member.notify,
      maxOpenConversations: member.maxOpenConversations,
      openCount: member.openConversationCount,
    })),
  }));
}
