'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { shopifyPromotionsApi } from '../../lib/api/shopify-promotions';
import { ExplorerState } from './ExplorerState';
import { PagerBar } from './PagerBar';
import { marketStatusMeta } from './promotionRules';
import { StatusBadge } from './StatusBadge';
import { useCursorPaging } from './useCursorPaging';

interface Props {
  storeId: number;
}

const LIST_STALE_MS = 60_000;

// Pazarlar: salt okuma (ad, durum, bölgeler, para birimi, fiyat listesi). Pazar yönetimi Shopify yönetiminde yapılır.
export function MarketsTab({ storeId }: Props) {
  const paging = useCursorPaging();
  const list = useQuery({
    queryKey: ['shopify', 'markets', storeId, paging.after],
    queryFn: () => shopifyPromotionsApi.markets(storeId, paging.after),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_MS,
  });
  const markets = list.data?.items ?? [];

  return (
    <ExplorerState
      loading={list.isLoading} error={list.error} isEmpty={markets.length === 0}
      emptyTitle="Mağazada pazar yok" onRetry={() => void list.refetch()}
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {markets.map((market) => {
          const meta = marketStatusMeta(market.status);
          return (
            <li key={market.id} className="flex flex-col gap-1 rounded-md border border-border-soft bg-card px-3 py-2">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-ui-sm font-bold text-fg">{market.name}</span>
                <StatusBadge label={meta.label} tone={meta.tone} />
                {market.baseCurrency && <span className="text-ui-xs text-fg-muted">{market.baseCurrency}</span>}
              </span>
              <span className="text-ui-xs text-fg-muted">
                Bölgeler: {market.regions.length > 0 ? market.regions.join(', ') : '—'}
              </span>
              <span className="text-ui-xs text-fg-muted">
                Fiyat listesi: {market.priceLists.length > 0 ? market.priceLists.join(', ') : 'yok'}
              </span>
            </li>
          );
        })}
      </ul>
      <PagerBar
        pageNumber={paging.pageNumber} hasPrevious={paging.hasPrevious} hasNext={Boolean(list.data?.hasNextPage)}
        busy={list.isFetching} onPrevious={paging.previous}
        onNext={() => list.data?.endCursor && paging.next(list.data.endCursor)}
      />
    </ExplorerState>
  );
}
