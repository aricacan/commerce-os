'use client';

import { useMemo } from 'react';
import {
  chatOrdersApi,
  CHAT_ORDER_STATUS,
  type ChatOrderDto,
  type ChatOrderStatus,
  type ChatOrderWriteResultDto,
} from '../../lib/api/omnichannel-chat-orders';
import { useFeedback } from '../shared/Feedback';
import { useChatOrderAction } from './useChatOrderAction';

// Sipariş kartı (konuşma) ve Siparişler ayrıntısının ORTAK işlemleri: geri alınamaz olanlar ortak onay
// diyaloğundan geçer, her yazma siparişin gördüğü sürümü taşır (arada değiştiyse 409 → tazelenir).
export function useChatOrderCommands(order: ChatOrderDto | null, onChanged: () => Promise<void>) {
  const { busy, error, run } = useChatOrderAction(onChanged);
  const { confirm, notify } = useFeedback();

  const commands = useMemo(() => {
    if (!order) return null;
    const { id, version } = order;
    const inShopify = Boolean(order.shopifyOrderName);
    const withWarning = (call: () => Promise<ChatOrderWriteResultDto>) => run(async () => {
      const result = await call();
      if (result.warning) notify.info(result.warning);
    });
    const changeStatus = (status: ChatOrderStatus, note?: string) =>
      run(() => chatOrdersApi.changeStatus(id, { status, note: note || undefined, version }));

    return {
      awaitPayment: () => changeStatus(CHAT_ORDER_STATUS.AwaitingPayment),
      markPaid: () => changeStatus(CHAT_ORDER_STATUS.Paid),
      markProcessed: () => changeStatus(CHAT_ORDER_STATUS.SentToShopify),
      sendToDestination: () => run(() => chatOrdersApi.sendToShopify(id)),

      confirmOnBehalf: async () => {
        const ok = await confirm({
          title: 'Sipariş müşteri adına onaylansın mı?',
          body: 'Müşteriye mesaj GÖNDERİLMEZ. Müşteri siparişi telefonda ya da başka yoldan onayladıysa kullanın.',
          confirmLabel: 'Onayla',
        });
        if (ok) await changeStatus(CHAT_ORDER_STATUS.Confirmed);
      },

      sendConfirmation: async () => {
        const ok = await confirm({
          title: 'Sipariş özeti müşteriye gönderilsin mi?',
          body: 'Botun onay özeti (ürünler, tutar, adres, ödeme) Evet / Düzelt düğmeleriyle müşteriye gider. Müşteri "Evet" derse sipariş onaylanır.',
          confirmLabel: 'Gönder',
        });
        if (ok) await withWarning(() => chatOrdersApi.sendConfirmation(id, version));
      },

      cancel: async (reason: string) => {
        const ok = await confirm({
          title: 'Sipariş iptal edilsin mi?',
          body: inShopify
            ? `Sipariş Shopify'da (${order.shopifyOrderName}) da iptal edilir ve stok iade edilir. Müşteriye otomatik mesaj gitmez.`
            : 'Sipariş iptal edilir. Müşteriye otomatik mesaj gitmez.',
          confirmLabel: 'İptal et',
          danger: true,
        });
        if (ok) await withWarning(() => chatOrdersApi.cancel(id, version, reason || undefined));
      },

      remove: async () => {
        const ok = await confirm({
          title: 'Taslak sipariş silinsin mi?',
          body: 'Sipariş listelerden kalkar; geçmişi iz olarak saklanır. Müşteriye mesaj gitmez.',
          confirmLabel: 'Sil',
          danger: true,
        });
        if (ok && await run(() => chatOrdersApi.remove(id, version))) notify.success('Taslak silindi');
      },
    };
  }, [order, run, confirm, notify]);

  return { busy, error, commands };
}

export type ChatOrderCommands = NonNullable<ReturnType<typeof useChatOrderCommands>['commands']>;
