'use client';

import { useEffect, useState } from 'react';
import { emailOutboundApi, type OutboundEmailPageDto } from '../../lib/api/omnichannel-email-outbound';
import { outboundEmailErrorText, outboundEmailQuery, type OutboundEmailFilters } from './outboundEmailRules';

// Filtreye göre sayfalı gönderim kaydı. `version` değişince (Yenile) yeniden okunur; filtre değişince 1. sayfaya döner.
export function useOutboundEmails(filters: OutboundEmailFilters, version: number) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<OutboundEmailPageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    emailOutboundApi.list(outboundEmailQuery(filters, page))
      .then((result) => { if (!cancelled) setData(result); })
      .catch((e: unknown) => { if (!cancelled) { setData(null); setError(outboundEmailErrorText(e)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters, page, version]);

  return { data, loading, error, page, setPage };
}
