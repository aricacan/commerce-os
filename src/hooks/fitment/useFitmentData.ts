'use client';

import { useQuery } from '@tanstack/react-query';
import { categoryApi, fitmentApi } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { QUERY_STALE_TIME } from '../../lib/query-policy';

interface FitmentDataOptions {
  tab: 'import' | 'products' | 'categoryMaps';
  batchId: number | null;
  status: string;
  search: string;
  page: number;
  productSearch: string;
  productPage: number;
  expandedProductId: number | null;
  pageSize: number;
}

export function useFitmentData(options: FitmentDataOptions) {
  const batchesQuery = useQuery({
    queryKey: queryKeys.fitment.batches,
    queryFn: ({ signal }) => fitmentApi.batches(signal),
    staleTime: QUERY_STALE_TIME.live,
  });
  const rowFilters = {
    batchId: options.batchId ?? undefined,
    status: options.status === 'all' ? undefined : options.status,
    search: options.search || undefined,
    page: options.page,
  };
  const rowsQuery = useQuery({
    queryKey: queryKeys.fitment.rows(rowFilters),
    queryFn: ({ signal }) => fitmentApi.rows({ ...rowFilters, pageSize: options.pageSize }, signal),
    enabled: options.tab === 'import',
    staleTime: QUERY_STALE_TIME.live,
    placeholderData: (previousData) => previousData,
  });
  const productFilters = { search: options.productSearch || undefined, page: options.productPage };
  const productsQuery = useQuery({
    queryKey: queryKeys.fitment.products(productFilters),
    queryFn: ({ signal }) => fitmentApi.products({ ...productFilters, pageSize: options.pageSize }, signal),
    enabled: options.tab === 'products',
    staleTime: QUERY_STALE_TIME.live,
    placeholderData: (previousData) => previousData,
  });
  const productDetailQuery = useQuery({
    queryKey: queryKeys.fitment.productDetail(options.expandedProductId),
    queryFn: ({ signal }) => fitmentApi.productDetail(options.expandedProductId!, signal),
    enabled: options.expandedProductId !== null,
    staleTime: QUERY_STALE_TIME.list,
  });
  const categoryMapsQuery = useQuery({
    queryKey: queryKeys.fitment.categoryMaps,
    queryFn: ({ signal }) => fitmentApi.categoryMaps(signal),
    enabled: options.tab === 'categoryMaps',
    staleTime: QUERY_STALE_TIME.list,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.reference.categories,
    queryFn: ({ signal }) => categoryApi.masterWithSignal(signal),
    enabled: options.tab === 'categoryMaps',
    staleTime: QUERY_STALE_TIME.reference,
  });

  return { batchesQuery, rowsQuery, productsQuery, productDetailQuery, categoryMapsQuery, categoriesQuery };
}
