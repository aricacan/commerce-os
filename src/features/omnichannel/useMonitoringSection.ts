'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MonitoringQuery } from '../../lib/api/omnichannel-monitoring';
import { monitoringErrorText } from './monitoringRules';

export interface MonitoringSectionState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// İzleme bölümlerinin ortak yükleyicisi: her bölüm kendi durumunu taşır, biri hata verince diğerleri görünür kalır.
// Aralık hızla değişirse eski cevap yenisini ezmesin diye yalnız son isteğin sonucu yazılır.
// `refreshToken` değişince (Yenile düğmesi) aynı aralık yeniden yüklenir.
export function useMonitoringSection<T>(
  load: (query: MonitoringQuery) => Promise<T>,
  query: MonitoringQuery | null,
  refreshToken: number,
): MonitoringSectionState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(query !== null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const latestRequest = useRef(0);

  const { from, to } = query ?? { from: '', to: '' };

  useEffect(() => {
    if (!from || !to) return;
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError(null);
    load({ from, to })
      .then((result) => { if (requestId === latestRequest.current) setData(result); })
      .catch((e: unknown) => { if (requestId === latestRequest.current) setError(monitoringErrorText(e)); })
      .finally(() => { if (requestId === latestRequest.current) setLoading(false); });
  }, [load, from, to, refreshToken, retryToken]);

  const reload = useCallback(() => setRetryToken((token) => token + 1), []);
  return { data, loading, error, reload };
}
