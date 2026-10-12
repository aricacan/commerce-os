'use client';

import { useCallback, useEffect, useState } from 'react';
import { channelSettingsApi, type ChannelEffectiveSettingsDto } from '../../lib/api/omnichannel-channel-settings';
import { describeError } from '../../lib/errors';

// Bir kanalda geçerli ayarlar ve kaynakları (sunucu çözer). Yenileme ekranı boşaltmaz: bir ayar
// değişince yalnız veri tazelenir, sekme yerinde kalır.
export function useChannelSettings(channelId: number) {
  const [settings, setSettings] = useState<ChannelEffectiveSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setSettings(await channelSettingsApi.get(channelId));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => { void reload(); }, [reload]);

  return { settings, loading, error, reload };
}
