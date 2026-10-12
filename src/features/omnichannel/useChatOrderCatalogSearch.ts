'use client';

import { useEffect, useState } from 'react';
import { chatOrdersApi, type ChatOrderProductOptionDto } from '../../lib/api/omnichannel-chat-orders';
import { describeError } from '../../lib/errors';

const SEARCH_DEBOUNCE_MS = 300;
export const MIN_CATALOG_QUERY_LENGTH = 2;

// Sipariş formundaki katalog araması: konuşmanın kanal kataloğu (sunucu kapsamı çözer), gecikmeli.
export function useChatOrderCatalogSearch(conversationId: number, country: string | null) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatOrderProductOptionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_CATALOG_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      chatOrdersApi.searchProducts(conversationId, term, country ?? undefined)
        .then((items) => { if (!cancelled) { setResults(items); setError(null); } })
        .catch((e: unknown) => { if (!cancelled) setError(describeError(e)); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, SEARCH_DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [conversationId, country, query]);

  return { query, setQuery, results, loading, error };
}
