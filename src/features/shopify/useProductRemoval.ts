'use client';

import { shopifyProductsApi, PRODUCT_STATUS } from '../../lib/api/shopify-products';
import { useFeedback } from '../shared/Feedback';
import { useWriteAction } from './useWriteAction';

// Ürünü arşivle (güvenli, geri alınır) ya da Shopify'dan kalıcı sil. İkisi de açık onay ister; sonuç true = uygulandı.
export function useProductRemoval(storeId: number, onChanged: () => Promise<void> | void) {
  const { confirm } = useFeedback();
  const { busy, run } = useWriteAction(onChanged);

  const archive = async (productId: number, label: string): Promise<boolean> => {
    const ok = await confirm({
      title: 'Ürün arşivlensin mi?',
      body: `${label} satıştan kalkar ama silinmez; istediğiniz zaman tekrar aktif yapabilirsiniz.`,
      confirmLabel: 'Arşivle',
    });
    return ok && run(() => shopifyProductsApi.update(storeId, productId, { status: PRODUCT_STATUS.Archived }), 'Ürün arşivlendi.');
  };

  const remove = async (productId: number, label: string): Promise<boolean> => {
    const ok = await confirm({
      title: 'Ürün Shopify\'dan silinsin mi?',
      body:
        `${label} kalıcı olarak silinir; bu işlem geri alınamaz. Ürünün siparişi olsa da silinir ` +
        '(geçmiş siparişlerdeki kayıt kalır). Emin değilseniz "Arşivle" daha güvenlidir.',
      confirmLabel: 'Ürünü sil',
      danger: true,
    });
    return ok && run(() => shopifyProductsApi.deleteProduct(storeId, productId), 'Ürün silindi.');
  };

  return { busy, archive, remove };
}
