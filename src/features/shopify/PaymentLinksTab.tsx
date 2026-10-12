'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ShopifyWriteResultDto } from '../../lib/api/shopify-explorer';
import {
  shopifyPaymentShippingApi, type CreateShopifyDraftOrderBody, type ShopifyDraftOrderListItemDto,
} from '../../lib/api/shopify-payment-shipping';
import { useFeedback } from '../shared/Feedback';
import { DraftOrderForm } from './DraftOrderForm';
import { DraftOrderList } from './DraftOrderList';
import { explorerErrorText, writeFailure } from './explorerRules';
import { ExplorerState } from './ExplorerState';
import { PagerBar } from './PagerBar';
import { useCursorPaging } from './useCursorPaging';

interface Props {
  storeId: number;
}

const LIST_STALE_MS = 15_000;

// Ödeme linkleri: Shopify taslak siparişi oluştur → fatura linkini müşteriye ilet. Müşteri ödeyince gerçek sipariş olur.
export function PaymentLinksTab({ storeId }: Props) {
  const queryClient = useQueryClient();
  const { notify, confirm } = useFeedback();
  const [writing, setWriting] = useState(false);
  const paging = useCursorPaging();

  const list = useQuery({
    queryKey: ['shopify', 'draft-orders', storeId, paging.after],
    queryFn: () => shopifyPaymentShippingApi.draftOrders(storeId, paging.after),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_MS,
  });

  // Yazma akışı: çağır → Shopify reddini göster → başarıda listeyi yenile.
  const write = async (action: () => Promise<ShopifyWriteResultDto>, successText: string): Promise<boolean> => {
    setWriting(true);
    try {
      const failure = writeFailure(await action());
      if (failure) {
        notify.error(failure);
        return false;
      }
      notify.success(successText);
      await queryClient.invalidateQueries({ queryKey: ['shopify', 'draft-orders', storeId] });
      return true;
    } catch (e) {
      notify.error(explorerErrorText(e));
      return false;
    } finally {
      setWriting(false);
    }
  };

  const create = (body: CreateShopifyDraftOrderBody) =>
    write(async () => {
      const result = await shopifyPaymentShippingApi.createDraftOrder(storeId, body);
      return { applied: result.applied, id: result.id, errors: result.errors };
    }, 'Ödeme linki oluşturuldu; listeden kopyalayabilirsiniz.');

  const copy = async (draft: ShopifyDraftOrderListItemDto) => {
    if (!draft.invoiceUrl) return;
    try {
      await navigator.clipboard.writeText(draft.invoiceUrl);
      notify.success('Ödeme linki kopyalandı.');
    } catch {
      notify.error('Panoya kopyalanamadı; tarayıcı izni gerekebilir.');
    }
  };

  const sendInvoice = async (draft: ShopifyDraftOrderListItemDto) => {
    const ok = await confirm({
      title: 'Ödeme linki e-postayla gönderilsin mi?',
      body: `${draft.email ?? 'Müşteri'} adresine Shopify faturası gider.`,
      confirmLabel: 'E-postayı gönder',
    });
    if (ok) await write(() => shopifyPaymentShippingApi.sendInvoice(storeId, draft.id, draft.email ?? undefined), 'Fatura e-postası gönderildi.');
  };

  const remove = async (draft: ShopifyDraftOrderListItemDto) => {
    const ok = await confirm({
      title: 'Ödeme linki silinsin mi?',
      body: `${draft.name} taslağı silinir; müşteriye gönderilmiş link çalışmaz. Bu işlem geri alınamaz.`,
      confirmLabel: 'Linki sil',
      danger: true,
    });
    if (ok) await write(() => shopifyPaymentShippingApi.deleteDraftOrder(storeId, draft.id), 'Ödeme linki silindi.');
  };

  const drafts = list.data?.items ?? [];

  return (
    <div className="flex flex-col gap-3">
      <DraftOrderForm busy={writing} onSubmit={create} />
      <ExplorerState
        loading={list.isLoading} error={list.error} isEmpty={drafts.length === 0}
        emptyTitle="Açık ödeme linki yok" onRetry={() => void list.refetch()}
      >
        <DraftOrderList
          drafts={drafts} busy={writing} onCopy={(d) => void copy(d)}
          onSendInvoice={(d) => void sendInvoice(d)} onDelete={(d) => void remove(d)}
        />
        <PagerBar
          pageNumber={paging.pageNumber} hasPrevious={paging.hasPrevious} hasNext={Boolean(list.data?.hasNextPage)}
          busy={list.isFetching} onPrevious={paging.previous}
          onNext={() => list.data?.endCursor && paging.next(list.data.endCursor)}
        />
      </ExplorerState>
    </div>
  );
}
