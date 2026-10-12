'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import type { FilterSelectOption } from '../../components/ui/FilterSelect';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useMobile } from '../../hooks/useMobile';
import { omnichannelApi, type InboxChannelDto } from '../../lib/api/omnichannel';
import { focusRing, motionFast, surfaceCard } from '../shared/design';
import { OrderDetailPanel } from './OrderDetailPanel';
import { OrderFilters } from './OrderFilters';
import { OrderListRow } from './OrderListRow';
import { hasActiveOrderFilters, totalPages } from './chatOrderListRules';
import { useChatOrderList } from './useChatOrderList';
import { useOmnichannelCountries } from './useOmnichannelCountries';

const SKELETON_ROWS = 6;

const pagerButtonClass =
  `inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-ui-sm font-semibold text-fg hover:bg-bg-subtle disabled:opacity-40 ${focusRing} ${motionFast}`;

interface Props {
  onOpenConversation: (conversationId: number) => void;
}

// Siparişler: yalnız müşterinin "Evet" dediği sohbet siparişleri. Satıra dokununca ayrıntı sağda
// (telefonda tam ekran) açılır.
export function OrdersTab({ onOpenConversation }: Props) {
  const isMobile = useMobile();
  const list = useChatOrderList();
  const { countries } = useOmnichannelCountries();
  const [channels, setChannels] = useState<InboxChannelDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => { omnichannelApi.getMyChannels().then(setChannels).catch(() => setChannels([])); }, []);

  const countryOptions = useMemo<FilterSelectOption[]>(
    () => countries.map((c) => ({ value: c.code, label: c.name })), [countries]);
  const channelOptions = useMemo<FilterSelectOption[]>(
    () => channels.map((c) => ({ value: String(c.id), label: c.displayName })), [channels]);

  const panel = selectedId !== null && (
    <OrderDetailPanel
      key={selectedId}
      orderId={selectedId}
      onClose={() => setSelectedId(null)}
      onChanged={list.reload}
      onOpenConversation={onOpenConversation}
    />
  );

  if (isMobile && panel) return <div className="h-full">{panel}</div>;

  const data = list.data;
  const pages = data ? totalPages(data.total, data.pageSize) : 1;

  return (
    <div className="relative flex h-full min-h-0 w-full">
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-fg-muted" aria-hidden />
            <h2 className="m-0 text-sm font-bold text-fg">Siparişler</h2>
            {data && <span className="text-ui-xs text-fg-muted">{data.total.toLocaleString('tr-TR')}</span>}
          </div>
          <p className="m-0 text-ui-xs text-fg-muted">
            Müşterinin sohbette onayladığı siparişler; taslak ve onay bekleyenler için &quot;Taslaklar dahil&quot;i açın.
            Yeni sipariş konuşmanın Ayrıntılar panelinden oluşturulur.
          </p>
        </header>

        <OrderFilters
          filters={list.filters}
          countryOptions={countryOptions}
          channelOptions={channelOptions}
          onChange={list.update}
          onReset={list.reset}
        />

        {list.error && <p role="alert" className="m-0 rounded-lg bg-danger-soft p-3 text-ui-sm text-danger">{list.error}</p>}

        {/* shrink-0: overflow-hidden flex öğesi aksi hâlde ezilir, satırlar kesilir (bkz. Müşteriler). */}
        <div className={`shrink-0 overflow-hidden ${surfaceCard}`}>
          {list.loading && !data && <SkeletonList count={SKELETON_ROWS} />}
          {data && data.items.length === 0 && (
            hasActiveOrderFilters(list.filters)
              ? <EmptyState icon={ShoppingBag} title="Eşleşen sipariş yok"
                  description="Filtreleri değiştirin ya da temizleyin." action={{ label: 'Filtreleri temizle', onClick: list.reset }} />
              : <EmptyState icon={ShoppingBag} title="Henüz onaylanmış sipariş yok"
                  description="Müşteri sohbette sipariş özetine “Evet” dediğinde burada görünür." />
          )}
          {data && data.items.length > 0 && (
            <ul className={`m-0 list-none divide-y divide-border-soft p-0 ${list.loading ? 'opacity-60' : ''}`}>
              {data.items.map((order) => (
                <li key={order.id}>
                  <OrderListRow order={order} selected={order.id === selectedId} onSelect={() => setSelectedId(order.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {data && pages > 1 && (
          <nav aria-label="Sayfalar" className="flex items-center justify-end gap-2">
            <button type="button" className={pagerButtonClass} disabled={list.page <= 1}
              onClick={() => list.setPage(list.page - 1)}>
              <ChevronLeft size={14} aria-hidden /> Önceki
            </button>
            <span className="text-ui-xs text-fg-muted">{list.page} / {pages}</span>
            <button type="button" className={pagerButtonClass} disabled={list.page >= pages}
              onClick={() => list.setPage(list.page + 1)}>
              Sonraki <ChevronRight size={14} aria-hidden />
            </button>
          </nav>
        )}
      </div>

      {panel && (
        <div className="absolute inset-y-0 right-0 z-20 w-[420px] max-w-full border-l border-border-soft shadow-xl xl:static xl:z-auto xl:shrink-0 xl:shadow-none">
          {panel}
        </div>
      )}
    </div>
  );
}
