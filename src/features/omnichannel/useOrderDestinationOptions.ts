'use client';

import { useEffect, useState } from 'react';
import {
  omnichannelOrderDestinationsApi, type OrderDestinationOptionDto,
} from '../../lib/api/omnichannel-order-destinations';
import { describeError } from '../../lib/errors';

/**
 * Seçilebilir sipariş hedefleri (Shopify mağazaları, ERP kaynakları, "yalnız panelde"). `country` kapsamın
 * ülkesidir; boşsa ülkeden bağımsız kapsam (süzme yok). Ülke değişince liste yeniden okunur.
 */
export function useOrderDestinationOptions(country: string | null) {
  const [options, setOptions] = useState<OrderDestinationOptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    omnichannelOrderDestinationsApi.options(country ?? undefined)
      .then((list) => { if (!cancelled) { setOptions(list); setError(null); } })
      .catch((e: unknown) => { if (!cancelled) { setOptions([]); setError(describeError(e)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [country]);

  return { options, loading, error };
}
