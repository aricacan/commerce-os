'use client';

import { useCallback, useEffect, useState } from 'react';
import { omnichannelApi, type ChannelDto } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';

// Tek kanal kaydı (ad, durum, bot açık mı, karşılama metinleri…). Kanal listesi uç tek kayıt ucu
// olmadığı için listeden seçilir; kanal silinmiş/yetkisizse null + hata metni döner.
export function useChannelRecord(channelId: number) {
  const [channel, setChannel] = useState<ChannelDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const channels = await omnichannelApi.getChannels();
      const found = channels.find((c) => c.id === channelId) ?? null;
      setChannel(found);
      if (!found) setError('Kanal bulunamadı; silinmiş olabilir.');
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => { void reload(); }, [reload]);

  return { channel, loading, error, reload };
}
