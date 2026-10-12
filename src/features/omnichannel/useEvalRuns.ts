'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { omnichannelEvalApi, type EvalRunDto } from '../../lib/api/omnichannel-eval';
import { describeError } from '../../lib/errors';
import { isServerUpdatePending } from './botTraceRules';
import { EVAL_POLL_INTERVAL_MS, hasActiveEvalRun } from './evalRules';

export interface EvalRunsState {
  runs: EvalRunDto[];
  total: number;
  loading: boolean;
  error: string | null;
  // Uç sunucuda henüz yok: hata yerine sakin boş durum.
  updatePending: boolean;
}

const INITIAL: EvalRunsState = { runs: [], total: 0, loading: true, error: null, updatePending: false };

// Değerlendirme koşuları listesi. Sırada/koşan koşu varken 5 sn'de bir sessizce tazelenir; hiç kalmayınca
// ve bileşen kapanınca yoklama durur.
export function useEvalRuns() {
  const [state, setState] = useState<EvalRunsState>(INITIAL);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    try {
      const page = await omnichannelEvalApi.getEvalRuns();
      if (mounted.current) setState({ runs: page.items, total: page.total, loading: false, error: null, updatePending: false });
    } catch (e) {
      if (!mounted.current) return;
      const updatePending = isServerUpdatePending(e);
      setState((previous) => ({ ...previous, loading: false, updatePending, error: updatePending ? null : describeError(e) }));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => { mounted.current = false; };
  }, [reload]);

  const polling = hasActiveEvalRun(state.runs);
  useEffect(() => {
    if (!polling) return undefined;
    const timer = setInterval(() => void reload(), EVAL_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [polling, reload]);

  return { ...state, reload };
}
