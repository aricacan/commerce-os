'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { shopifyEventsApi, type ShopifyEventDto, type ShopifyEventFilters } from '../../lib/api/shopify-events';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { EVENT_STATUS_OPTIONS, EVENT_TOPIC_LABELS, eventStatusMeta, eventSummaryText, eventTopicLabel } from './eventRules';
import { formatDateTime } from './explorerRules';
import { ExplorerState } from './ExplorerState';
import { PagerBar } from './PagerBar';
import { StatusBadge } from './StatusBadge';

// "Hepsi" satırını FilterSelect kendisi ekler (placeholder metniyle); listede yalnız gerçek değerler kalır.
const TOPIC_OPTIONS = Object.entries(EVENT_TOPIC_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = EVENT_STATUS_OPTIONS.filter((option) => option.value !== '');

interface Props {
  storeId: number;
  onOpenOrder: (orderId: number) => void;
}

const FIRST_PAGE = 1;
const POLL_MS = 15_000;
const EMPTY_FILTERS: ShopifyEventFilters = { topic: '', status: '' };

// Olaylar: mağazanın webhook akışı (en yeni üstte). Gövde saklanmaz; konu, zaman, durum, kalıcı özet ve varsa not görünür.
export function EventsTab({ storeId, onOpenOrder }: Props) {
  const [filters, setFilters] = useState<ShopifyEventFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(FIRST_PAGE);

  const list = useQuery({
    queryKey: ['shopify', 'events', storeId, filters, page],
    queryFn: () => shopifyEventsApi.list(storeId, filters, page),
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  });

  const change = (patch: Partial<ShopifyEventFilters>) => {
    setPage(FIRST_PAGE);
    setFilters((current) => ({ ...current, ...patch }));
  };

  const events = list.data?.items ?? [];
  const filtered = filters.topic !== '' || filters.status !== '';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          ariaLabel="Olay türü" placeholder="Tüm olaylar" value={filters.topic} minWidth={192} triggerClassName="rounded-md"
          options={TOPIC_OPTIONS} onChange={(topic) => change({ topic })}
        />
        <FilterSelect
          ariaLabel="Durum" placeholder="Tüm durumlar" value={filters.status} minWidth={160} triggerClassName="rounded-md"
          options={STATUS_OPTIONS} onChange={(status) => change({ status: status as ShopifyEventFilters['status'] })}
        />
      </div>

      <ExplorerState
        loading={list.isLoading} error={list.error} isEmpty={events.length === 0}
        emptyTitle={filtered ? 'Süzgece uyan olay yok' : 'Henüz olay gelmedi'}
        emptyDescription={filtered ? 'Süzgeçleri gevşetip tekrar deneyin.' : 'Mağazalar sekmesinden "Webhook\'ları eşitle" ile abonelikleri kurun.'}
        onRetry={() => void list.refetch()}
      >
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {events.map((event) => <EventRow key={event.id} event={event} onOpenOrder={onOpenOrder} />)}
        </ul>
        <PagerBar
          pageNumber={page} hasPrevious={page > FIRST_PAGE} hasNext={Boolean(list.data?.hasNextPage)}
          busy={list.isFetching} onPrevious={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)}
        />
      </ExplorerState>
    </div>
  );
}

function EventRow({ event, onOpenOrder }: { event: ShopifyEventDto; onOpenOrder: (orderId: number) => void }) {
  const status = eventStatusMeta(event.status);
  const summary = eventSummaryText(event);
  const { orderId } = event;

  return (
    <li className="flex flex-col gap-1 rounded-md border border-border-soft bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 basis-40 break-words text-ui-sm font-bold text-fg">{eventTopicLabel(event.topic)}</span>
        <StatusBadge label={status.label} tone={status.tone} />
        <time className="text-ui-2xs text-fg-muted" dateTime={event.receivedAt}>{formatDateTime(event.receivedAt)}</time>
      </div>
      {summary && (
        <p className={`m-0 break-words text-ui-xs ${event.summary ? 'text-fg' : 'text-fg-muted'}`}>{summary}</p>
      )}
      {orderId !== null && (
        <div>
          <Button variant="secondary" size="sm" onClick={() => onOpenOrder(orderId)}>Siparişi aç</Button>
        </div>
      )}
      {event.note && <p className="m-0 break-words text-ui-2xs text-fg-muted">{event.note}</p>}
    </li>
  );
}
