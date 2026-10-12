'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  assignmentsApi, type AssignmentBoardDto, type AssignmentBoardFilter, type AssignmentCardDto,
  type ChannelTeamMemberSummaryDto, type ChannelTeamSummaryDto,
} from '../../lib/api/assignments';
import { handoffApi, HANDOFF_OUTCOME } from '../../lib/api/handoff';
import { omnichannelApi } from '../../lib/api/omnichannel';
import { describeError, httpStatusOf } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { dropAction } from './assignmentBoardRules';
import { useHandoffLive } from './useHandoffLive';
import { useStoredBoardView } from './useStoredBoardView';

const NOT_FOUND = 404;

// "Atananlar" panosunun durumu (FAZ 7): pano + kanal ekipleri, görünüm, süzgeç, kart taşıma ve nöbet anahtarı.
// Canlı "HandoffChanged" olaylarında tazelenir. Eski backend'de uç yoksa (404) sakin "henüz hazır değil" durumu.
export function useAssignmentBoard() {
  const [filter, setFilter] = useState<AssignmentBoardFilter>({});
  const [view, setView] = useStoredBoardView();
  const [board, setBoard] = useState<AssignmentBoardDto | null>(null);
  const [teams, setTeams] = useState<ChannelTeamSummaryDto[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { notify } = useFeedback();

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextBoard, nextTeams] = await Promise.all([assignmentsApi.board(filter), assignmentsApi.teams()]);
      setBoard(nextBoard);
      setTeams(nextTeams);
    } catch (e) {
      if (httpStatusOf(e) === NOT_FOUND) setUnavailable(true);
      else setError(describeError(e));
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);
  useHandoffLive(() => { void load(); });

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      notify.success(success);
      await load();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  // Kart bir sütuna bırakıldı: karar saf kuralda (dropAction), burada yalnız uygulanır.
  const move = (card: AssignmentCardDto, targetKey: string) => {
    const action = dropAction(card, targetKey);
    switch (action.kind) {
      case 'none': return;
      case 'denied': notify.error(action.reason); return;
      case 'assign': void run(() => handoffApi.assign(action.ticketId, action.userId), 'Devir yeniden atandı.'); return;
      case 'unassign': void run(() => handoffApi.assign(action.ticketId, null), 'Devir kuyruğa geri alındı.'); return;
      case 'returnToBot':
        void run(() => handoffApi.resolve(action.ticketId, HANDOFF_OUTCOME.ReturnedToBot), 'Konuşma bota geri verildi.');
        return;
      case 'takeFromBot':
        void run(async () => {
          await omnichannelApi.assign(card.conversationId, action.userId);
          await omnichannelApi.setBotActive(card.conversationId, false);
        }, 'Konuşma temsilciye alındı, bot durduruldu.');
    }
  };

  const setDuty = (userId: number, onDuty: boolean) =>
    run(() => assignmentsApi.setDuty(userId, onDuty), onDuty ? 'Nöbete alındı.' : 'Nöbetten çıkarıldı.');

  const updateMember = (channelId: number, member: ChannelTeamMemberSummaryDto) =>
    run(() => assignmentsApi.updateMember(channelId, member), 'Ekip üyesi güncellendi.');

  return { filter, setFilter, view, setView, board, teams, unavailable, error, busy, move, setDuty, updateMember, reload: load };
}

export type AssignmentBoardState = ReturnType<typeof useAssignmentBoard>;
