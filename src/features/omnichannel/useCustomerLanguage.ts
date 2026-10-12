'use client';

import { useEffect, useState } from 'react';
import { omnichannelApi, type CustomerLanguageCode } from '../../lib/api/omnichannel';

// Müşterinin dili — özetten (yavaş, modelli) BAĞIMSIZ, kural tabanlı uçtan. Yeni gelen
// müşteri mesajıyla dil değişebilir; lastInboundId değişince yeniden sorulur.
// lastInboundId undefined = mesajlar henüz yüklenmedi, sorma. Okunamazsa önceki değer
// korunur; hiç bilinmiyorsa null (çeviri yine de denenir — bkz. outgoingTranslation).
export function useCustomerLanguage(
  conversationId: number, lastInboundId: number | null | undefined,
): CustomerLanguageCode | null {
  const [language, setLanguage] = useState<CustomerLanguageCode | null>(null);

  useEffect(() => {
    if (lastInboundId === undefined) return;
    let cancelled = false;
    omnichannelApi.getConversationLanguage(conversationId)
      .then((result) => { if (!cancelled) setLanguage(result.customerLanguage); })
      .catch(() => { /* önceki değer kalır; bilinmeyen dil zaten güvenli tarafta */ });
    return () => { cancelled = true; };
  }, [conversationId, lastInboundId]);

  return language;
}
