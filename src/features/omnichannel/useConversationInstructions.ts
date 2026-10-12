'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  instructionsApi,
  type ConversationInstructionCreateBody, type ConversationInstructionCreateResponse, type ConversationInstructionDto,
} from '../../lib/api/omnichannel-instructions';

interface State {
  conversationId: number;
  instructions: ConversationInstructionDto[];
}

// Konuşmanın bot talimatları (aktif + geçmiş). refreshKey değişince (yeni mesaj: tek seferlik talimat düşmüş
// olabilir, yeniden bağlanma) tazelenir. Hata yan bilgidir: eski backend'de bölüm ve notlar gizli kalır.
export function useConversationInstructions(conversationId: number, refreshKey: number) {
  const [state, setState] = useState<State>({ conversationId, instructions: [] });

  useEffect(() => {
    let cancelled = false;
    instructionsApi.list(conversationId)
      .then((instructions) => { if (!cancelled) setState({ conversationId, instructions }); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [conversationId, refreshKey]);

  const reload = useCallback(async () => {
    setState({ conversationId, instructions: await instructionsApi.list(conversationId) });
  }, [conversationId]);

  const create = useCallback(async (body: ConversationInstructionCreateBody): Promise<ConversationInstructionCreateResponse> => {
    const response = await instructionsApi.create(conversationId, body);
    await reload();
    return response;
  }, [conversationId, reload]);

  const remove = useCallback(async (instructionId: number) => {
    await instructionsApi.remove(conversationId, instructionId);
    await reload();
  }, [conversationId, reload]);

  const instructions = state.conversationId === conversationId ? state.instructions : [];
  return { instructions, create, remove };
}
