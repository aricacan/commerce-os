'use client';

import { useCallback, useEffect, useState } from 'react';
import { followUpsApi, type FollowUpTaskDto } from '../../lib/api/omnichannel-follow-ups';

interface State {
  conversationId: number;
  tasks: FollowUpTaskDto[];
}

// Konuşmanın takip görevleri. refreshKey değişince (yeni mesaj, yeniden bağlanma) tazelenir.
export function useConversationFollowUps(conversationId: number, refreshKey: number) {
  const [state, setState] = useState<State>({ conversationId, tasks: [] });

  useEffect(() => {
    let cancelled = false;
    followUpsApi.forConversation(conversationId)
      .then((tasks) => { if (!cancelled) setState({ conversationId, tasks }); })
      // Yan bilgi: eski backend (uç yok) ya da geçici hata sohbeti etkilemez, bölüm gizli kalır.
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [conversationId, refreshKey]);

  const reload = useCallback(async () => {
    setState({ conversationId, tasks: await followUpsApi.forConversation(conversationId) });
  }, [conversationId]);

  const tasks = state.conversationId === conversationId ? state.tasks : [];
  return { tasks, reload };
}
