import type { AssignmentAgentDto, ChannelTeamMemberSummaryDto, ChannelTeamSummaryDto } from '../../lib/api/assignments';
import {
  ASSIGNMENT_POLICY, CHANNEL_MEMBER_ROLE, FIXED_AGENT_FALLBACK, type ChannelDto,
} from '../../lib/api/omnichannel';
import { formatMinutes } from './handoffRules';
import { ASSIGNMENT_POLICY_META } from './shared';

// "Kanal ekipleri" görünümünün saf kuralları: rol etiketi, dağıtım politikası özeti, üye sırası, yük ve hız.

export const ROLE_LABEL: Record<number, string> = {
  [CHANNEL_MEMBER_ROLE.Owner]: 'Sahip',
  [CHANNEL_MEMBER_ROLE.Agent]: 'Temsilci',
  [CHANNEL_MEMBER_ROLE.Observer]: 'Gözlemci',
};

// Sahip önce, sonra temsilci, en son gözlemci; aynı roldekiler ada göre.
const ROLE_RANK: Record<number, number> = {
  [CHANNEL_MEMBER_ROLE.Owner]: 0,
  [CHANNEL_MEMBER_ROLE.Agent]: 1,
  [CHANNEL_MEMBER_ROLE.Observer]: 2,
};
const UNKNOWN_ROLE_RANK = 3;
const SECONDS_PER_MINUTE = 60;

export function sortMembers(members: readonly ChannelTeamMemberSummaryDto[]): ChannelTeamMemberSummaryDto[] {
  return [...members].sort((a, b) =>
    (ROLE_RANK[a.role] ?? UNKNOWN_ROLE_RANK) - (ROLE_RANK[b.role] ?? UNKNOWN_ROLE_RANK)
    || a.name.localeCompare(b.name, 'tr'));
}

// Kanal ayarlarından (GET channels) ekip kartına eklenen alanlar. Uç erişilemezse (yetki, eski backend) yoktur.
export type ChannelTeamSettings = Pick<ChannelDto, 'fixedAgentFallback' | 'firstResponseSlaMinutes'>;

export interface TeamPolicySummary {
  label: string;
  hint: string;
  // "Sabit kişi" için sorumlu ve yedek davranış ("Ayşe · yoksa ekibe dağıt"); diğer politikalarda null.
  detail: string | null;
}

export function teamPolicySummary(team: ChannelTeamSummaryDto, settings: ChannelTeamSettings | undefined): TeamPolicySummary {
  const meta = ASSIGNMENT_POLICY_META[team.assignmentPolicy] ?? ASSIGNMENT_POLICY_META[ASSIGNMENT_POLICY.None];
  if (team.assignmentPolicy !== ASSIGNMENT_POLICY.FixedAgent) return { label: meta.label, hint: meta.hint, detail: null };

  const fixed = team.members.find((m) => m.userId === team.fixedAgentUserId)?.name ?? 'Sorumlu seçilmedi';
  const fallback = settings?.fixedAgentFallback === undefined ? null
    : settings.fixedAgentFallback === FIXED_AGENT_FALLBACK.Wait ? 'yoksa bekler' : 'yoksa ekibe dağıtır';
  return { label: meta.label, hint: meta.hint, detail: fallback ? `${fixed} · ${fallback}` : fixed };
}

// Açık konuşma / sınır: sınır yoksa yalnız sayı; sınıra ulaştıysa uyarı.
export const memberIsFull = (member: Pick<ChannelTeamMemberSummaryDto, 'openCount' | 'maxOpenConversations'>) =>
  member.maxOpenConversations !== null && member.openCount >= member.maxOpenConversations;

// Bugünkü ilk cevap ortalaması (temsilci geneli, panodan): "4 dk". Veri yoksa null.
export function avgFirstResponseLabel(agents: readonly AssignmentAgentDto[], userId: number): string | null {
  const seconds = agents.find((a) => a.userId === userId)?.avgFirstResponseSecondsToday ?? null;
  return seconds === null ? null : formatMinutes(seconds / SECONDS_PER_MINUTE);
}

// Satır içi "en fazla açık" girişi: boş = sınırsız; geçersiz (0, negatif, ondalık, üst sınır üstü) = değişiklik yok.
export const MAX_OPEN_LIMIT = 500;

export function parseMaxOpen(raw: string): { valid: true; value: number | null } | { valid: false } {
  const trimmed = raw.trim();
  if (trimmed === '') return { valid: true, value: null };
  const value = Number(trimmed);
  return Number.isInteger(value) && value >= 1 && value <= MAX_OPEN_LIMIT ? { valid: true, value } : { valid: false };
}
