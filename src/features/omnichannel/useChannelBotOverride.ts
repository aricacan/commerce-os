'use client';

import { useCallback, useEffect, useState } from 'react';
import { channelBotOverrideApi, type ChannelBotOverrideDto } from '../../lib/api/omnichannel-channel-bot';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';

/**
 * Bir kanalın bot geçersiz kılmaları (eşik, menü, metin). Her yazma sunucunun döndürdüğü güncel kaydı
 * state'e koyar; böylece etkin değer ve "kanala özel" rozeti sunucunun çözümüyle birebir kalır.
 * `onChanged`: kanal merkezinin üst başlığındaki özet rozetini tazelemek için.
 */
export function useChannelBotOverride(channelId: number, onChanged?: () => Promise<void>) {
  const { notify } = useFeedback();
  const [data, setData] = useState<ChannelBotOverrideDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    channelBotOverrideApi.get(channelId)
      .then((dto) => { if (!cancelled) { setData(dto); setError(null); } })
      .catch((e: unknown) => { if (!cancelled) setError(describeError(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [channelId]);

  /** Yazma çağrısını çalıştırır; başarıda true. Hata bildirim olarak gösterilir, taslak korunur. */
  const write = useCallback(async (
    action: () => Promise<ChannelBotOverrideDto>, successMessage: string,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      setData(await action());
      notify.success(successMessage);
      await onChanged?.();
      return true;
    } catch (e) {
      notify.error(describeError(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, [notify, onChanged]);

  return { data, loading, error, busy, write };
}
