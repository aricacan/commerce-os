import { useQuery } from '@tanstack/react-query';
import { shopifyStoreContentApi, type ShopifyCollectionListItemDto } from '../../lib/api/shopify-store-content';

const LIST_STALE_MS = 30_000;
// Cursor sayfalarını art arda okur; sonsuz döngüye karşı üst sınır (sayfa başına ~onlarca koleksiyon).
const MAX_PAGES = 40;

async function fetchAllCollections(storeId: number): Promise<ShopifyCollectionListItemDto[]> {
  const all: ShopifyCollectionListItemDto[] = [];
  let after: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await shopifyStoreContentApi.collections(storeId, '', after);
    all.push(...result.items);
    if (!result.hasNextPage || !result.endCursor) break;
    after = result.endCursor;
  }
  return all;
}

// Ağaç tüm koleksiyonları görmelidir (marka gruplama sayfa sınırına takılmasın): sayfalar tek sorguda birleştirilir.
// Anahtar ['shopify','collections',storeId,…] öneki yazma sonrası geçersiz kılmayla (useInvalidatingWrite) eşleşir.
export function useAllCollections(storeId: number) {
  return useQuery({
    queryKey: ['shopify', 'collections', storeId, 'all'],
    queryFn: () => fetchAllCollections(storeId),
    staleTime: LIST_STALE_MS,
  });
}
