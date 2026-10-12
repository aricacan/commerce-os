'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../../lib/api';
import { queryKeys, type ProductListFilters } from '../../lib/query-keys';
import { QUERY_STALE_TIME } from '../../lib/query-policy';

export function useProductsQuery(filters: ProductListFilters) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: ({ signal }) => productApi.list(filters, signal),
    staleTime: QUERY_STALE_TIME.list,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    const totalPages = Math.ceil((query.data?.totalCount ?? 0) / filters.pageSize);
    if (filters.page >= totalPages) return;
    const nextFilters = { ...filters, page: filters.page + 1 };
    void queryClient.prefetchQuery({
      queryKey: queryKeys.products.list(nextFilters),
      queryFn: ({ signal }) => productApi.list(nextFilters, signal),
      staleTime: QUERY_STALE_TIME.list,
    });
  }, [filters, query.data?.totalCount, queryClient]);

  return query;
}
