'use client';

import { useCallback, useEffect, useState } from 'react';
import { chatOrdersApi, type ChatOrderDto } from '../../lib/api/omnichannel-chat-orders';

interface State {
  conversationId: number;
  orders: ChatOrderDto[];
}

// Konuşmanın sohbet siparişleri (en yeni önce). refreshKey değişince (yeni mesaj, SignalR
// yeniden bağlanma) tazelenir — bot siparişe yeni bilgi yazmış olabilir.
export function useConversationChatOrders(conversationId: number, refreshKey: number) {
  const [state, setState] = useState<State>({ conversationId, orders: [] });

  const fetchOrders = useCallback(() => chatOrdersApi.forConversation(conversationId), [conversationId]);

  useEffect(() => {
    let cancelled = false;
    fetchOrders()
      .then((orders) => { if (!cancelled) setState({ conversationId, orders }); })
      // Kart yan bilgidir: geçici okuma hatasında son bilinen hâl kalır, sohbet etkilenmez.
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [fetchOrders, conversationId, refreshKey]);

  const reload = useCallback(async () => {
    setState({ conversationId, orders: await fetchOrders() });
  }, [fetchOrders, conversationId]);

  // Konuşma değişti ama yenisi henüz yüklenmedi: öncekinin siparişi gösterilmez.
  const orders = state.conversationId === conversationId ? state.orders : [];
  return { conversationId, orders, reload };
}
