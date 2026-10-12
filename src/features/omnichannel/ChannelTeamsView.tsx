'use client';

import type { AssignmentAgentDto, ChannelTeamMemberSummaryDto, ChannelTeamSummaryDto } from '../../lib/api/assignments';
import { ChannelTeamCard } from './ChannelTeamCard';
import { useChannelTeamSettings } from './useChannelTeamSettings';

interface Props {
  teams: ChannelTeamSummaryDto[];
  loading: boolean;
  agents: AssignmentAgentDto[];
  // Satır içi düzenleme (nöbet, sınır) yalnız yöneticide.
  editable: boolean;
  busy: boolean;
  onChange: (channelId: number, member: ChannelTeamMemberSummaryDto) => void;
}

// "Kanal ekipleri" görünümü: her kanal için ayrıntılı ekip kartı (kim sahip/temsilci, nöbette mi, yükü ve sınırı).
// Atama kuralı bu değerlerle çalışır; yönetici nöbeti ve sınırı satırda değiştirir.
export function ChannelTeamsView({ teams, loading, agents, editable, busy, onChange }: Props) {
  const settings = useChannelTeamSettings();

  if (teams.length === 0) {
    return (
      <div className="rounded-xl border border-border-soft bg-card p-8 text-center text-ui-sm text-fg-muted">
        {loading ? 'Yükleniyor…' : 'Tanımlı kanal ekibi yok.'}
      </div>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2">
      {teams.map((team) => (
        <ChannelTeamCard key={team.channelId} team={team} settings={settings.get(team.channelId)} agents={agents}
          editable={editable} busy={busy} onChange={onChange} />
      ))}
    </div>
  );
}
