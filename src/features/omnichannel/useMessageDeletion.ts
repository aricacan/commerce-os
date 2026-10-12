'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { omnichannelApi, type ConversationSummaryDto, type MessageDto } from '../../lib/api/omnichannel';
import { useFeedback } from '../shared/Feedback';
import { isOptimistic } from './chatMessages';
import { describeDeleteError } from './messageDeletionRules';

interface Options {
  conversationId: number;
  setMessages: Dispatch<SetStateAction<MessageDto[]>>;
  // Silme sonrası listedeki önizleme ve sayaçlar tazelensin.
  onConversationChanged: (conversation: ConversationSummaryDto) => void;
}

// Gönderilemeyen temsilci mesajını siler. Geçici (hiç sunucuya ulaşmamış) balon yalnız ekrandan kalkar.
export function useMessageDeletion({ conversationId, setMessages, onConversationChanged }: Options) {
  const { notify } = useFeedback();

  const refreshConversation = useCallback(async () => {
    try {
      onConversationChanged(await omnichannelApi.getConversation(conversationId));
    } catch {
      // Önizleme yan bilgidir: tazelenemezse silme yine başarılıdır.
    }
  }, [conversationId, onConversationChanged]);

  return useCallback(async (message: MessageDto) => {
    try {
      if (!isOptimistic(message)) await omnichannelApi.deleteMessage(message.id);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      notify.success('Mesaj silindi.');
      if (!isOptimistic(message)) await refreshConversation();
    } catch (e) {
      notify.error(describeDeleteError(e));
    }
  }, [notify, setMessages, refreshConversation]);
}
