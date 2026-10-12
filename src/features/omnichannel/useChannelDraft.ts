'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChannelDto } from '../../lib/api/omnichannel';
import { draftFromChannel, type ChannelDraft, type ChannelDraftPatch } from './channelDraft';

/**
 * Kanal formunun taslağı. `syncWithServer` açıkken (Kanal Merkezi › Genel) kanalın SUNUCUDAKİ alanları değişince
 * (kaydetme sonrası yenileme) taslak onunla yeniden kurulur; bot aç/kapa gibi taslak dışı bir değişiklik
 * (yenileme yapar ama bu alanları değiştirmez) yazılmamış düzenlemeyi silmez. Pencerede kapalıdır: açık formun
 * arka plandaki liste yenilemesiyle sıfırlanması istenmez.
 */
export function useChannelDraft(channel: ChannelDto | null, syncWithServer = false) {
  const [draft, setDraft] = useState<ChannelDraft>(() => draftFromChannel(channel));

  const patch = useCallback<ChannelDraftPatch>((change) => setDraft((current) => ({ ...current, ...change })), []);
  const reset = useCallback(() => setDraft(draftFromChannel(channel)), [channel]);

  // Bot açık/kapalı kendi anahtarından anında kaydedilir; imzaya girmez.
  const serverSignature = useMemo(
    () => JSON.stringify({ ...draftFromChannel(channel), botEnabled: null }),
    [channel],
  );
  useEffect(() => {
    if (syncWithServer) setDraft(draftFromChannel(channel));
    // Yalnız imza değişince: channel nesnesi her yenilemede yeni gelir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSignature, syncWithServer]);

  return { draft, patch, reset };
}
