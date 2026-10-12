'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  omnichannelApi, type BoardColumnDto, type BoardColumnKey, type ConversationSummaryDto, type InboxScopeParams,
} from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';

// Canlı olaylar art arda gelirken pano en fazla bu sıklıkta yeniden okunur.
const REFRESH_DEBOUNCE_MS = 1500;

export interface InboxBoardState {
  columns: BoardColumnDto[];
  error: string | null;
  refreshSoon: () => void;
  // Kartı taşır; sunucu reddederse neden bildirilir ve pano olduğu gibi kalır.
  move: (conversation: ConversationSummaryDto, target: BoardColumnKey) => Promise<ConversationSummaryDto | null>;
}

// Kanban panosunun verisi (P30). Yalnız pano görünümü açıkken (enabled) sorgular.
export function useInboxBoard(scope: InboxScopeParams, enabled: boolean): InboxBoardState {
  const [columns, setColumns] = useState<BoardColumnDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useFeedback();
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { channelId, brandId, platform, topic, stage, search, country, tagId } = scope;
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setError(null);
    try {
      const board = await omnichannelApi.getInboxBoard({ channelId, brandId, platform, topic, stage, search, country, tagId });
      if (id === requestId.current) setColumns(board);
    } catch (e) {
      if (id === requestId.current) setError(describeError(e));
    }
  }, [channelId, brandId, platform, topic, stage, search, country, tagId]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => { if (enabled) void load(); }, [enabled, load]);
  // Görünüm listeye dönünce bekleyen tazeleme boşuna istek atmasın.
  useEffect(() => {
    if (!enabled && timer.current) clearTimeout(timer.current);
  }, [enabled]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const refreshSoon = useCallback(() => {
    if (!enabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void loadRef.current(), REFRESH_DEBOUNCE_MS);
  }, [enabled]);

  const move = useCallback(async (conversation: ConversationSummaryDto, target: BoardColumnKey) => {
    try {
      const moved = await omnichannelApi.moveOnBoard(conversation.id, target);
      await loadRef.current();
      return moved;
    } catch (e) {
      notify.error(describeError(e));
      return null;
    }
  }, [notify]);

  return { columns, error, refreshSoon, move };
}
