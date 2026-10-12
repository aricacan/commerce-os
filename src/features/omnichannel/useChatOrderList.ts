'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { chatOrdersApi, type ChatOrderPageDto } from '../../lib/api/omnichannel-chat-orders';
import { describeError } from '../../lib/errors';
import {
  EMPTY_ORDER_FILTERS,
  ORDER_SEARCH_DEBOUNCE_MS,
  toOrderListQuery,
  type OrderListFilters,
} from './chatOrderListRules';

// Siparişler ekranının veri durumu: filtreler, gecikmeli arama, sayfa ve sunucu sayfası.
// Filtre değişince ilk sayfaya dönülür.
export function useChatOrderList() {
  const [filters, setFilters] = useState<OrderListFilters>(EMPTY_ORDER_FILTERS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ChatOrderPageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(filters.search); setPage(1); }, ORDER_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Arama metni her tuşta değişir; sorgu yalnız gecikmeli değerle yeniden kurulur.
  const { status, country, channelId, paymentMethod, shopify, includeDrafts, datePreset, customFrom, customTo } = filters;
  const query = useMemo(
    () => toOrderListQuery(
      { status, country, channelId, paymentMethod, shopify, includeDrafts, datePreset, customFrom, customTo, search }, search, page),
    [status, country, channelId, paymentMethod, shopify, includeDrafts, datePreset, customFrom, customTo, search, page],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await chatOrdersApi.list(query));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { void reload(); }, [reload]);

  const update = useCallback((patch: Partial<OrderListFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    if (!('search' in patch)) setPage(1);
  }, []);

  const reset = useCallback(() => {
    setFilters(EMPTY_ORDER_FILTERS);
    setPage(1);
  }, []);

  return { filters, update, reset, page, setPage, data, loading, error, reload };
}
