import { useQuery } from '@tanstack/react-query';
import { shopifyApi } from '../../lib/api/shopify';

export const SHOPIFY_STORES_KEY = ['shopify', 'stores'] as const;
const STORES_STALE_MS = 30_000;

// Bağlı mağaza listesi — Mağazalar sekmesi ve gezgin ekranlarının mağaza seçicisi AYNI sorguyu paylaşır.
export function useShopifyStores() {
  return useQuery({ queryKey: SHOPIFY_STORES_KEY, queryFn: shopifyApi.stores, staleTime: STORES_STALE_MS });
}
