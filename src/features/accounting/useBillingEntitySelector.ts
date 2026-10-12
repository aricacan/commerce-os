'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { billingEntityApi } from '../../lib/api/billing-entity';

// Genel Muhasebe modülünün tüm sayfaları aynı "hangi tüzel kişiliğin defterine bakıyorum"
// sorusuna cevap vermeli — Hesap Planı/Fiş/Mizan hep BillingEntity bazlı izole (bkz. backend
// LedgerAccount/JournalEntry yorumu). Global bir store yerine burada tutuluyor çünkü sayfa
// dışında hiçbir yerde bu seçime ihtiyaç yok (ör. mağaza seçici store-selector'daki gibi
// Store/Platform genelinde paylaşılmıyor).
export function useBillingEntitySelector() {
  const { data: entities, isLoading } = useQuery({
    queryKey: ['billing-entities', 'all'],
    queryFn: () => billingEntityApi.list(),
    staleTime: 60_000,
  });

  const [billingEntityId, setBillingEntityId] = useState<number | null>(null);

  useEffect(() => {
    if (billingEntityId === null && entities && entities.length > 0) {
      setBillingEntityId(entities[0].id);
    }
  }, [entities, billingEntityId]);

  return { entities: entities ?? [], isLoading, billingEntityId, setBillingEntityId };
}
