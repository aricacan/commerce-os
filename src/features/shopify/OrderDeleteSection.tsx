'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { shopifyOrderCrudApi } from '../../lib/api/shopify-order-crud';
import { useFeedback } from '../shared/Feedback';
import { explorerErrorText, writeFailure } from './explorerRules';
import { ghostButtonClass } from './styles';

interface Props {
  storeId: number;
  orderId: number;
  orderName: string;
  // Shopify yalnız iptal edilmiş siparişi siler.
  isCancelled: boolean;
  // Silindi: çağıran listeye döner ve listeyi yeniler.
  onDeleted: () => void;
}

// Siparişi Shopify'dan KALICI silme. İptal edilmemiş siparişte düğme yerine nedeni yazılır (önce iptal edilmeli).
export function OrderDeleteSection({ storeId, orderId, orderName, isCancelled, onDeleted }: Props) {
  const { notify, confirm } = useFeedback();
  const [busy, setBusy] = useState(false);

  if (!isCancelled) {
    return <p className="m-0 text-ui-xs text-fg-muted">Siparişi silmek için önce iptal edin: Shopify yalnız iptal edilmiş siparişi siler.</p>;
  }

  const remove = async () => {
    const ok = await confirm({
      title: 'Sipariş Shopify\'dan silinsin mi?',
      body: `${orderName} kalıcı olarak silinir ve geri alınamaz. Raporlarda ve geçmişte görünmez olur.`,
      confirmLabel: 'Siparişi sil',
      danger: true,
    });
    if (!ok) return;

    setBusy(true);
    try {
      const failure = writeFailure(await shopifyOrderCrudApi.remove(storeId, orderId));
      if (failure) return notify.error(failure);
      notify.success('Sipariş silindi.');
      onDeleted();
    } catch (e) {
      notify.error(explorerErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button type="button" className={ghostButtonClass} disabled={busy} onClick={() => void remove()}>
        <Trash2 size={14} aria-hidden /> Siparişi sil
      </button>
    </div>
  );
}
