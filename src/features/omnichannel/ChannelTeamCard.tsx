'use client';

import { Timer } from 'lucide-react';
import type { AssignmentAgentDto, ChannelTeamMemberSummaryDto, ChannelTeamSummaryDto } from '../../lib/api/assignments';
import { badgeBase, badgeTone, surfaceCard } from '../shared/design';
import { ChannelTeamMemberRow, MEMBER_GRID_COLUMNS } from './ChannelTeamMemberRow';
import { SettingsLink } from './SettingsLink';
import { channelTypeMeta } from './shared';
import { avgFirstResponseLabel, sortMembers, teamPolicySummary, type ChannelTeamSettings } from './channelTeamRules';

interface Props {
  team: ChannelTeamSummaryDto;
  settings: ChannelTeamSettings | undefined;
  agents: AssignmentAgentDto[];
  editable: boolean;
  busy: boolean;
  onChange: (channelId: number, member: ChannelTeamMemberSummaryDto) => void;
}

const COLUMN_LABEL_CLASS = 'text-ui-2xs font-semibold uppercase tracking-wide text-fg-subtle';

// Tek kanalın ekibi: kanal kimliği, dağıtım politikası (Sabit kişi + yedek davranış), SLA ve Kanal Merkezi bağlantısı;
// altında üyeler tablo gibi hizalı.
export function ChannelTeamCard({ team, settings, agents, editable, busy, onChange }: Props) {
  const meta = channelTypeMeta(team.channelType);
  const policy = teamPolicySummary(team, settings);
  const sla = settings?.firstResponseSlaMinutes ?? null;
  const members = sortMembers(team.members);

  return (
    <section aria-label={team.channelName} className={`${surfaceCard} flex min-w-0 flex-col overflow-hidden`}>
      <header className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-subtle">
          <meta.Icon size={20} color={meta.color} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="m-0 min-w-0 truncate text-ui-lg font-bold text-fg">{team.channelName}</h3>
            {team.country && <span className="text-ui-sm font-semibold text-fg-subtle">{team.country}</span>}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-ui-sm text-fg-muted">
            <span className={`${badgeBase} ${badgeTone.neutral}`} title={policy.hint}>{policy.label}</span>
            {policy.detail && <span className="min-w-0 truncate">{policy.detail}</span>}
            {sla !== null && (
              <span className={`${badgeBase} ${badgeTone.neutral} tabular-nums`} title="İlk cevap süresi (mesai saatine göre)">
                <Timer size={11} aria-hidden /> SLA {sla} dk
              </span>
            )}
          </div>
        </div>
        <SettingsLink target={{ tab: 'channels', channelId: team.channelId }} className="shrink-0 sm:pt-1">
          Kanal Merkezi
        </SettingsLink>
      </header>

      {members.length === 0 ? (
        <p className="m-0 border-t border-border-soft px-4 py-3 text-ui-sm text-fg-muted">Ekip yok — kanal herkese açık.</p>
      ) : (
        <>
          <div aria-hidden className={`hidden sm:grid ${MEMBER_GRID_COLUMNS} border-t border-border-soft bg-bg-subtle/60 px-4 py-2`}>
            <span className={COLUMN_LABEL_CLASS}>Üye</span>
            <span className={COLUMN_LABEL_CLASS}>Rol</span>
            <span className={COLUMN_LABEL_CLASS}>Nöbet</span>
            <span className={COLUMN_LABEL_CLASS}>Açık / en fazla</span>
            <span className={COLUMN_LABEL_CLASS}>İlk cevap</span>
          </div>
          <ul className="m-0 flex list-none flex-col border-t border-border-soft p-0">
            {members.map((member) => (
              <ChannelTeamMemberRow key={member.userId} member={member} isFixedAgent={team.fixedAgentUserId === member.userId}
                avgFirstResponse={avgFirstResponseLabel(agents, member.userId)} editable={editable} busy={busy}
                onChange={(next) => onChange(team.channelId, next)} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
