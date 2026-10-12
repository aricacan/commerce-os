'use client';

import { useEffect, useState } from 'react';
import {
  omnichannelEvalApi, SHADOW_PAGE_SIZE, type ShadowComparisonDto,
} from '../../lib/api/omnichannel-eval';
import type { MonitoringQuery } from '../../lib/api/omnichannel-monitoring';
import { describeError } from '../../lib/errors';
import { isServerUpdatePending } from './botTraceRules';

interface ShadowState {
  items: ShadowComparisonDto[];
  total: number;
  loading: boolean;
  error: string | null;
  updatePending: boolean;
}

// Gölge karşılaştırma sayfası. Filtre (kanal, tarih) ya da sayfa değişince yeniden okunur; eski isteğin
// yanıtı yenisini ezmez. `refreshToken`: İzleme başlığındaki yenile düğmesi.
export function useShadowComparisons(range: MonitoringQuery | null, channelId: number | null, page: number, refreshToken: number) {
  const [state, setState] = useState<ShadowState>({ items: [], total: 0, loading: true, error: null, updatePending: false });
  const from = range?.from ?? null;
  const to = range?.to ?? null;

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    omnichannelEvalApi.getShadowComparisons({ channelId, from, to, skip: page * SHADOW_PAGE_SIZE, take: SHADOW_PAGE_SIZE })
      .then(({ items, total }) => {
        if (!cancelled) setState({ items, total, loading: false, error: null, updatePending: false });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const updatePending = isServerUpdatePending(e);
        setState({ items: [], total: 0, loading: false, updatePending, error: updatePending ? null : describeError(e) });
      });
    return () => { cancelled = true; };
  }, [channelId, from, to, page, refreshToken]);

  return state;
}
