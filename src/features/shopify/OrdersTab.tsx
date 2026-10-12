'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  shopifyExplorerApi, type CancelShopifyOrderBody, type SaveShopifyOrderBody, type ShopifyOrderFilters,
  type ShopifyRefundBody, type ShopifyRefundPreviewDto, type ShopifyWriteResultDto,
} from '../../lib/api/shopify-explorer';
import { shopifyPaymentShippingApi, type ShopifyFulfillBody } from '../../lib/api/shopify-payment-shipping';
import { useFeedback } from '../shared/Feedback';
import { EMPTY_ORDER_FILTERS, explorerErrorText, hasActiveFilters, writeFailure } from './explorerRules';
import { BulkOrderBar } from './BulkOrderBar';
import { ExplorerState } from './ExplorerState';
import { NewOrderPanel } from './NewOrderPanel';
import { OrderDetailPanel } from './OrderDetailPanel';
import { OrderFilters } from './OrderFilters';
import { linkedOrderOfStore } from './orderLink';
import { OrderTable } from './OrderTable';
import { PagerBar } from './PagerBar';
import { useBulkSelection } from './useBulkSelection';
import { ghostButtonClass } from './styles';
import { useCursorPaging } from './useCursorPaging';
import { useShopifyStores } from './useShopifyStores';

interface Props {
  storeId: number;
  // Olay akışından gelinirse bu siparişin detayı açık başlar.
  initialOrderId?: number | null;
}

const LIST_STALE_MS = 15_000;

// Siparişler: canlı sayfalı liste + detay + elle sipariş açma/düzenleme/silme + iptal. Shopify yalnız son 60 günün siparişlerini verir (read_all_orders yok).
export function OrdersTab({ storeId, initialOrderId = null }: Props) {
  const queryClient = useQueryClient();
  const { notify, confirm } = useFeedback();
  const [filters, setFilters] = useState<ShopifyOrderFilters>(EMPTY_ORDER_FILTERS);
  // Olay akışından gelen sipariş (initialOrderId) ya da Omnichannel müşteri panelinden gelen bağlantı (?store=&order=) detayı doğrudan açar.
  const [openOrderId, setOpenOrderId] = useState<number | null>(
    () => initialOrderId ?? linkedOrderOfStore(new URLSearchParams(window.location.search), storeId),
  );
  const [writing, setWriting] = useState(false);
  const [creating, setCreating] = useState(false);
  const store = useShopifyStores().data?.find((s) => s.id === storeId);
  const paging = useCursorPaging();
  const selection = useBulkSelection();

  const list = useQuery({
    queryKey: ['shopify', 'orders', storeId, filters, paging.after],
    queryFn: () => shopifyExplorerApi.orders(storeId, filters, paging.after),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_MS,
  });
  const detail = useQuery({
    queryKey: ['shopify', 'order', storeId, openOrderId],
    queryFn: () => shopifyExplorerApi.order(storeId, openOrderId as number),
    enabled: openOrderId !== null,
  });

  const applyFilters = (next: ShopifyOrderFilters) => {
    paging.reset();
    setFilters(next);
  };

  const refreshOrder = async () => {
    await queryClient.invalidateQueries({ queryKey: ['shopify', 'order', storeId, openOrderId] });
    await queryClient.invalidateQueries({ queryKey: ['shopify', 'orders', storeId] });
  };

  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: ['shopify', 'orders', storeId] });

  // Elle sipariş açıldı: liste yenilenir; Shopify sipariş kimliği döndüyse detaya geçilir.
  const created = async (orderId: number | null) => {
    setCreating(false);
    await refreshOrders();
    if (orderId !== null) setOpenOrderId(orderId);
  };

  // Sipariş silindi: detayı artık okunmaz (404 olur), listeye dönülür.
  const deleted = () => {
    queryClient.removeQueries({ queryKey: ['shopify', 'order', storeId, openOrderId] });
    setOpenOrderId(null);
    void refreshOrders();
  };

  const cancel = async (body: CancelShopifyOrderBody) => {
    if (openOrderId === null) return;
    const ok = await confirm({
      title: 'Sipariş Shopify\'da iptal edilsin mi?',
      body: 'Bu işlem geri alınamaz. Para iadesi kaydedilmez.',
      confirmLabel: 'Siparişi iptal et',
      danger: true,
    });
    if (!ok) return;
    try {
      const result = await shopifyExplorerApi.cancelOrder(storeId, openOrderId, body);
      if (!result.applied) {
        notify.error(result.message ?? 'Sipariş iptal edilemedi.');
        return;
      }
      notify.success('Sipariş iptal edildi.');
      await refreshOrder();
    } catch (e) {
      notify.error(explorerErrorText(e));
    }
  };

  // Not/etiket kaydı ve "ödendi işaretle" aynı akış: çağır → Shopify reddini göster → başarıda yenile.
  const write = async (action: () => Promise<ShopifyWriteResultDto>, successText: string): Promise<boolean> => {
    setWriting(true);
    try {
      const failure = writeFailure(await action());
      if (failure) {
        notify.error(failure);
        return false;
      }
      notify.success(successText);
      await refreshOrder();
      return true;
    } catch (e) {
      notify.error(explorerErrorText(e));
      return false;
    } finally {
      setWriting(false);
    }
  };

  const save = (body: SaveShopifyOrderBody) => {
    if (openOrderId === null) return;
    void write(() => shopifyExplorerApi.updateOrder(storeId, openOrderId, body), 'Sipariş güncellendi.');
  };

  // İade önizlemesi: hiçbir şey yazmaz; hata olursa mesaj gösterilir ve null döner.
  const previewRefund = async (body: ShopifyRefundBody): Promise<ShopifyRefundPreviewDto | null> => {
    if (openOrderId === null) return null;
    try {
      return await shopifyExplorerApi.previewRefund(storeId, openOrderId, body);
    } catch (e) {
      notify.error(explorerErrorText(e));
      return null;
    }
  };

  // Onaylı iade: para iadesi geri alınamaz, bu yüzden önce açık onay istenir.
  const refund = async (body: ShopifyRefundBody): Promise<boolean> => {
    if (openOrderId === null) return false;
    const ok = await confirm({
      title: 'İade yapılsın mı?',
      body: 'Shopify\'da iade kaydı oluşur ve ödeme müşteriye geri döner. Bu işlem geri alınamaz.',
      confirmLabel: 'İadeyi yap',
      danger: true,
    });
    if (!ok) return false;
    return write(() => shopifyExplorerApi.refundOrder(storeId, openOrderId, body), 'İade yapıldı.');
  };

  // Kargolandı işareti: müşteriye bildirim seçilebilir; yazma sonrası sipariş ve kargolanabilir kalemler yenilenir.
  const fulfill = async (body: ShopifyFulfillBody): Promise<boolean> => {
    if (openOrderId === null) return false;
    const done = await write(() => shopifyPaymentShippingApi.fulfillOrder(storeId, openOrderId, body), 'Sipariş kargolandı olarak işaretlendi.');
    if (done) await queryClient.invalidateQueries({ queryKey: ['shopify', 'fulfillable', storeId, openOrderId] });
    return done;
  };

  const markPaid = async () => {
    if (openOrderId === null) return;
    const ok = await confirm({
      title: 'Sipariş ödendi olarak işaretlensin mi?',
      body: 'Shopify\'da ödeme alınmış kaydı oluşur; müşteriden tahsilat yapıldığından emin olun.',
      confirmLabel: 'Ödendi işaretle',
    });
    if (!ok) return;
    await write(() => shopifyExplorerApi.markOrderPaid(storeId, openOrderId), 'Sipariş ödendi olarak işaretlendi.');
  };

  if (openOrderId !== null) {
    return (
      <ExplorerState
        loading={detail.isLoading} error={detail.error} isEmpty={!detail.data}
        emptyTitle="Sipariş bulunamadı" onRetry={() => void detail.refetch()}
      >
        {detail.data && (
          <OrderDetailPanel
            storeId={storeId} detail={detail.data} busy={writing} onBack={() => setOpenOrderId(null)}
            onCancel={cancel} onSave={save} onMarkPaid={() => void markPaid()}
            onPreviewRefund={previewRefund} onRefund={refund} onFulfill={fulfill} onChanged={refreshOrder} onDeleted={deleted}
          />
        )}
      </ExplorerState>
    );
  }

  if (creating && store) return <NewOrderPanel store={store} onBack={() => setCreating(false)} onCreated={(id) => void created(id)} />;

  const orders = list.data?.items ?? [];
  const filtered = hasActiveFilters({ ...filters });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <button type="button" className={ghostButtonClass} disabled={!store} onClick={() => setCreating(true)}>
          <Plus size={14} aria-hidden /> Yeni sipariş
        </button>
      </div>
      <OrderFilters applied={filters} onApply={applyFilters} />
      <p className="m-0 text-ui-2xs text-fg-muted">Shopify yalnız son 60 günün siparişlerini gösterir; liste canlıdır, panelde kopyası tutulmaz.</p>
      <ExplorerState
        loading={list.isLoading} error={list.error} isEmpty={orders.length === 0}
        emptyTitle={filtered ? 'Süzgece uyan sipariş yok' : 'Son 60 günde sipariş yok'}
        emptyDescription={filtered ? 'Süzgeçleri gevşetip tekrar deneyin.' : undefined}
        onRetry={() => void list.refetch()}
      >
        <BulkOrderBar storeId={storeId} pageIds={orders.map((order) => order.id)} selection={selection} />
        <OrderTable orders={orders} onOpen={setOpenOrderId} selection={selection} />
        <PagerBar
          pageNumber={paging.pageNumber} hasPrevious={paging.hasPrevious} hasNext={Boolean(list.data?.hasNextPage)}
          busy={list.isFetching} total={list.data?.total} onPrevious={paging.previous}
          onNext={() => list.data?.endCursor && paging.next(list.data.endCursor)}
        />
      </ExplorerState>
    </div>
  );
}
