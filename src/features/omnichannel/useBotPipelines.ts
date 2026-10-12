'use client';

import { useEffect, useState } from 'react';
import { omnichannelEvalApi, type BotPipelinesDto } from '../../lib/api/omnichannel-eval';
import { describeError } from '../../lib/errors';
import { isServerUpdatePending } from './botTraceRules';

export interface BotPipelinesState {
  data: BotPipelinesDto | null;
  error: string | null;
  updatePending: boolean;
}

// Sunucudaki bot hattı sürümleri (koşu başlatma ve kanal sürüm seçimi ortak kullanır).
export function useBotPipelines(): BotPipelinesState {
  const [state, setState] = useState<BotPipelinesState>({ data: null, error: null, updatePending: false });

  useEffect(() => {
    let cancelled = false;
    omnichannelEvalApi.getPipelines()
      .then((pipelines) => { if (!cancelled) setState({ data: pipelines, error: null, updatePending: false }); })
      .catch((e: unknown) => {
        if (cancelled) return;
        const updatePending = isServerUpdatePending(e);
        setState({ data: null, updatePending, error: updatePending ? null : describeError(e) });
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}
