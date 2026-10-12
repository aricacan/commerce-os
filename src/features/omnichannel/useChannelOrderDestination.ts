'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  omnichannelOrderDestinationsApi, type OrderDestinationEffectiveDto,
} from '../../lib/api/omnichannel-order-destinations';
import { describeError } from '../../lib/errors';

// Bir kanalın etkin sipariş hedefi ve kazanan kapsam (sunucu çözer). Yazma sonrası yalnız veri tazelenir.
export function useChannelOrderDestination(channelId: number) {
  const [effective, setEffective] = useState<OrderDestinationEffectiveDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setEffective(await omnichannelOrderDestinationsApi.effective(channelId));
      setError(null);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => { void reload(); }, [reload]);

  return { effective, loading, error, reload };
}
