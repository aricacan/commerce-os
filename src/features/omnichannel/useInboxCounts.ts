'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { omnichannelApi, type ConversationFilter, type InboxScopeParams } from '../../lib/api/omnichannel';

// Canlı olaylar art arda gelirken sayaçlar en fazla bu sıklıkta tazelenir.
const REFRESH_DEBOUNCE_MS = 2000;

export interface InboxCounts {
  counts: Partial<Record<ConversationFilter, number>>;
  // Canlı olay geldi: sayaçlar kısa gecikmeyle yeniden okunsun.
  refreshSoon: () => void;
}

// Durum haplarının rozetleri. Sayaç yalnız görsel ipucudur: yüklenemezse hapların kendisi çalışmaya devam
// eder, rozetler görünmez.
export function useInboxCounts(scope: InboxScopeParams): InboxCounts {
  const [counts, setCounts] = useState<Partial<Record<ConversationFilter, number>>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const { channelId, brandId, platform, topic, stage, search, country, tagId } = scope;
  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const result = await omnichannelApi.getInboxCounts({ channelId, brandId, platform, topic, stage, search, country, tagId });
      if (id === requestId.current) setCounts(result.counts);
    } catch {
      if (id === requestId.current) setCounts({});
    }
  }, [channelId, brandId, platform, topic, stage, search, country, tagId]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const refreshSoon = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void loadRef.current(), REFRESH_DEBOUNCE_MS);
  }, []);

  return { counts, refreshSoon };
}
