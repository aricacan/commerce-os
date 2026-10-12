'use client';

import { useCallback, useEffect, useState } from 'react';
import { omnichannelOrderDestinationsApi, type OrderDestinationRuleDto } from '../../lib/api/omnichannel-order-destinations';
import { describeError } from '../../lib/errors';

// Tüm sipariş hedefi kuralları (Hesap geneli). Yenileme listeyi boşaltmaz; yazma sonrası veri tazelenir.
export function useOrderDestinationRules() {
  const [rules, setRules] = useState<OrderDestinationRuleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setRules(await omnichannelOrderDestinationsApi.list());
      setError(null);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { rules, loading, error, reload };
}
