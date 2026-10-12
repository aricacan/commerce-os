'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { omnichannelEvalApi, type BotTurnTraceDto } from '../../lib/api/omnichannel-eval';
import { describeError } from '../../lib/errors';
import { isServerUpdatePending } from './botTraceRules';

interface TracesState {
  items: BotTurnTraceDto[];
  nextBeforeId: number | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  updatePending: boolean;
}

const INITIAL: TracesState = { items: [], nextBeforeId: null, loading: false, loaded: false, error: null, updatePending: false };

// Konuşmanın bot tur izleri, yeniden eskiye sayfa sayfa (beforeId). İlk sayfa `load` ile istenir (bölüm
// açılınca); konuşma değişince çağıran bileşeni key ile yeniden kurar.
export function useBotTraces(conversationId: number) {
  const [state, setState] = useState<TracesState>(INITIAL);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const fetchPage = useCallback(async (beforeId: number | null) => {
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const page = await omnichannelEvalApi.getTraces(conversationId, beforeId);
      if (!mounted.current) return;
      setState((previous) => ({
        items: beforeId === null ? page.items : [...previous.items, ...page.items],
        nextBeforeId: page.nextBeforeId, loading: false, loaded: true, error: null, updatePending: false,
      }));
    } catch (e) {
      if (!mounted.current) return;
      const updatePending = isServerUpdatePending(e);
      setState((previous) => ({
        ...previous, loading: false, loaded: true, updatePending, error: updatePending ? null : describeError(e),
      }));
    }
  }, [conversationId]);

  const load = () => {
    if (!state.loaded && !state.loading) void fetchPage(null);
  };

  const loadMore = () => {
    if (state.nextBeforeId !== null && !state.loading) void fetchPage(state.nextBeforeId);
  };

  return { ...state, load, loadMore, reload: () => void fetchPage(null) };
}
