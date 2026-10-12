import type { DefaultOptions, QueryClient, QueryKey } from '@tanstack/react-query';

export const QUERY_STALE_TIME = {
  live: 15_000,
  list: 30_000,
  reference: 5 * 60_000,
  static: Number.POSITIVE_INFINITY,
} as const;

export const QUERY_GC_TIME = 15 * 60_000;

export const DEFAULT_QUERY_OPTIONS = {
  queries: {
    staleTime: QUERY_STALE_TIME.list,
    gcTime: QUERY_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  },
} satisfies DefaultOptions;

export async function invalidateQueryFamilies(queryClient: QueryClient, families: readonly QueryKey[]) {
  await Promise.all(families.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
