'use client';

import { useCallback, useEffect, useState } from 'react';
import { omnichannelApi, type ConversationDigestDto } from '../../lib/api/omnichannel';

export interface ConversationDigestState {
  digest: ConversationDigestDto | null;
  loading: boolean;
  refresh: () => void;
}

// Konuşmanın Türkçe özeti + müşteri dili (Gelen Kutusu v2 §4). Konuşma açılınca BİR KEZ
// çekilir — her yeni mesajda model çağrılmasın; temsilci "Yenile" ile tazeler.
// Okunamazsa sohbet çeviri araçları olmadan normal çalışır (digest null = Türkçe varsayılır).
export function useConversationDigest(conversationId: number): ConversationDigestState {
  const [digest, setDigest] = useState<ConversationDigestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    omnichannelApi.getConversationDigest(conversationId)
      .then((result) => { if (!cancelled) setDigest(result); })
      .catch(() => { if (!cancelled) setDigest(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [conversationId, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { digest, loading, refresh };
}
