'use client';

import { useQuery } from '@tanstack/react-query';
import { skuDetailApi } from '../lib/api/sku-detail';

export function useProductSkuDetail(sku: string | null) {
  return useQuery({
    queryKey: ['sku-detail', sku],
    queryFn: () => skuDetailApi.get(sku!),
    enabled: !!sku,
    staleTime: 60_000,
    retry: 1,
  });
}
