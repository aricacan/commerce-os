'use client';

import { useEffect, useState } from 'react';
import { omnichannelApi, type ConversationContextDto } from '../../lib/api/omnichannel';

// "Bot bu konuşmada ne öğrendi?" (Faz 9): araç ve ürün. refreshKey değişince tazelenir
// (yeni mesajla bot yeni bilgi öğrenmiş olabilir). Uç yayında değilse ya da hata olursa null.
export function useConversationContext(conversationId: number, refreshKey: number): ConversationContextDto | null {
  const [context, setContext] = useState<ConversationContextDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    void omnichannelApi.getConversationContext(conversationId)
      .then((value) => { if (!cancelled) setContext(value); })
      .catch(() => { if (!cancelled) setContext(null); });
    return () => { cancelled = true; };
  }, [conversationId, refreshKey]);

  return context;
}

// "Golf 7 · 2018" — araç ve varyantları tek satırda. Bilgi yoksa boş metin.
export function vehicleLabelOf(context: ConversationContextDto): string {
  return [context.vehicle, ...context.variants].filter(Boolean).join(' · ');
}

export function hasConversationContext(context: ConversationContextDto | null): context is ConversationContextDto {
  return context !== null && (vehicleLabelOf(context) !== '' || context.product !== null);
}
