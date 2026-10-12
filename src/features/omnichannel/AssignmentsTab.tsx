'use client';

import { useMemo } from 'react';
import { KanbanSquare } from 'lucide-react';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { AssignmentKanban } from './AssignmentKanban';
import { ChannelTeamsView } from './ChannelTeamsView';
import { HandoffQueueFilters } from './HandoffQueueFilters';
import type { BoardView } from './assignmentBoardRules';
import { useAssignmentBoard } from './useAssignmentBoard';
import { useIsOmnichannelAdmin } from './useIsOmnichannelAdmin';
import { useOmnichannelCountries } from './useOmnichannelCountries';

interface Props {
  onOpenConversation: (conversationId: number) => void;
}

const VIEW_OPTIONS: { value: BoardView; label: string }[] = [
  { value: 'agent', label: 'Kişiye göre' },
  { value: 'teams', label: 'Kanal ekipleri' },
];

// "Atananlar" (FAZ 7): "Kişiye göre" sürükle-bırak panosu ya da "Kanal ekipleri" (kanal bazında kim nöbette, yükü ve
// sınırı ne). Durum görünümü yok — devir durumlarını "Pano" sekmesi gösterir. Son seçilen görünüm hatırlanır.
export function AssignmentsTab({ onOpenConversation }: Props) {
  const state = useAssignmentBoard();
  const isAdmin = useIsOmnichannelAdmin();
  const { countries } = useOmnichannelCountries();
  const countryCodes = useMemo(() => countries.map((c) => c.code).sort(), [countries]);

  if (state.unavailable) {
    return (
      <div className="m-6 rounded-xl border border-border-soft bg-card p-8 text-center text-ui-sm text-fg-muted">
        Atananlar panosu sunucu güncellemesinden sonra açılacak.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col gap-3 p-4 sm:p-5">
      <header className="flex min-w-0 flex-wrap items-center gap-2">
        <KanbanSquare size={16} className="text-fg-muted" aria-hidden />
        <h2 className="m-0 text-ui-md font-bold text-fg">Atananlar</h2>
        <div className="flex-1" />
        <SegmentedControl value={state.view} options={VIEW_OPTIONS} onChange={state.setView} size="sm" />
      </header>

      {state.view === 'agent' && (
        <HandoffQueueFilters
          filter={{ platform: state.filter.platform, country: state.filter.country, level: state.filter.level, status: state.filter.status }}
          onChange={(f) => state.setFilter({ platform: f.platform, country: f.country, level: f.level, status: f.status })}
          countries={countryCodes}
          boardMode
        />
      )}

      {state.error && <p role="alert" className="m-0 rounded-lg bg-danger-soft p-3 text-ui-sm text-danger">{state.error}</p>}

      {state.view === 'agent' ? (
        <AssignmentKanban board={state.board} isAdmin={isAdmin} busy={state.busy} onMove={state.move}
          onToggleDuty={(userId, onDuty) => void state.setDuty(userId, onDuty)} onOpenConversation={onOpenConversation} />
      ) : (
        <ChannelTeamsView teams={state.teams} loading={state.board === null && !state.error} agents={state.board?.agents ?? []} editable={isAdmin} busy={state.busy}
          onChange={(channelId, member) => void state.updateMember(channelId, member)} />
      )}
    </div>
  );
}
